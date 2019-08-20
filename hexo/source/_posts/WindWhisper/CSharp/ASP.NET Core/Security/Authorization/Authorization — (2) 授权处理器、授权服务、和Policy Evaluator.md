---
title: Authorization — (2) 授权处理器、授权服务、和Policy Evaluator
date: 2019-08-20 22:14:03
tags:
- ASP.NET Core
- Authorization
- CSharp
- 源码分析
categories:
- 风语
- CSharp
- ASP.NET Core
- Security
- Authorization
---

## 授权处理器与Provider

### `AuthorizationHandler`

`AuthorizationHandler`表示针对具体`Requirement`的处理器：
```csharp
public interface IAuthorizationHandler
{
    Task HandleAsync(AuthorizationHandlerContext context);
}
```

抽象类`AuthorizationHandler<TRequirement>`的默认逻辑是针对所有的`TRequirement`都进行处理：
```csharp
public abstract class AuthorizationHandler<TRequirement> : IAuthorizationHandler
        where TRequirement : IAuthorizationRequirement
{
    public virtual async Task HandleAsync(AuthorizationHandlerContext context)
    {
        foreach (var req in context.Requirements.OfType<TRequirement>())
        {
            await HandleRequirementAsync(context, req);
        }
    }
    
    protected abstract Task HandleRequirementAsync(AuthorizationHandlerContext context, TRequirement requirement);
}
```
注意，尽管`AuthorizatoinHandler<TRequirement>`类包含了为一个`TRequirement`类型，但是一种类型的`TRequirement`，可以被应用于多种类型的`Handler`——在`HandleAsync()`方法中，这些`Handler`会被逐一调用。

特别地，根据所要授权的目标的不同，授权处理器还分化出了针对`Requirement`及`Resource`的抽象类：
```csharp
public abstract class AuthorizationHandler<TRequirement, TResource> : IAuthorizationHandler
    where TRequirement : IAuthorizationRequirement
{
    public virtual async Task HandleAsync(AuthorizationHandlerContext context)
    {
        if (context.Resource is TResource)
        {
            foreach (var req in context.Requirements.OfType<TRequirement>())
            {
                await HandleRequirementAsync(context, req, (TResource)context.Resource);
            }
        }
    }

    protected abstract Task HandleRequirementAsync(AuthorizationHandlerContext context, TRequirement requirement, TResource resource);
}
```
<!-- more -->

`WebApp`项目所注册的相关授权处理器会被`Provider`提供给授权服务。

### `IAuthorizationHandlerProvider`

`IAuthorizationHandlerProvider`用于向其他服务提供一组`IAuthorizationHandler`：
```csharp
public interface IAuthorizationHandlerProvider
{
    Task<IEnumerable<IAuthorizationHandler>> GetHandlersAsync(AuthorizationHandlerContext context);
}
```

其默认实现是把`IAuthorizationHandler`所有的实现都返回：
```csharp
public class DefaultAuthorizationHandlerProvider : IAuthorizationHandlerProvider
{
    private readonly IEnumerable<IAuthorizationHandler> _handlers;

    public DefaultAuthorizationHandlerProvider(IEnumerable<IAuthorizationHandler> handlers)
    {
        if (handlers == null){ /*  throw  */ }
        _handlers = handlers;
    }

    public Task<IEnumerable<IAuthorizationHandler>> GetHandlersAsync(AuthorizationHandlerContext context)
        => Task.FromResult(_handlers);
}
```

这要求我们需要手工为自定义的`AuthorizationHandler`注册服务：
```csharp
services.AddSingleton<IAuthorizationHandler,TokenValidationHandler>();
services.AddSingleton<IAuthorizationHandler, MinimumAgeHandler>();
...
```

## 授权服务

### `IAuthorizationService`接口

`IAuthorizationService`的作用是判断用户是否满足特定的`Policy`或者一系列`Requirements`：
```csharp
public interface IAuthorizationService
{
    Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user, object resource, IEnumerable<IAuthorizationRequirement> requirements);
    Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user, object resource, string policyName);
}
```
这里的`AuthroizationResult`表示授权的结果是成功还是失败:

```csharp
public class AuthorizationResult
{
    private AuthorizationResult() { }
    public bool Succeeded { get; private set; }
    public AuthorizationFailure Failure { get; private set; }

    // 三个静态工厂方法
    public static AuthorizationResult Success() => new AuthorizationResult { Succeeded = true };
    public static AuthorizationResult Failed(AuthorizationFailure failure) => new AuthorizationResult { Failure = failure };
    public static AuthorizationResult Failed() => new AuthorizationResult { Failure = AuthorizationFailure.ExplicitFail() };
}
```

判断当前用户是否满足一个`Policy`，本质上也是对该用户能否满足这个`policy`的所有`Requirements`进行判断。
```csharp
public static Task<AuthorizationResult> AuthorizeAsync(this IAuthorizationService service, ClaimsPrincipal user, object resource, AuthorizationPolicy policy)
{
    // ... check if service / policy is null
    return service.AuthorizeAsync(user, resource, policy.Requirements);
}
```

`ASP.NET Core`还为`IAuthorizationService`接口提供了一系列`AuthorizeAsync()`其它扩展方法：
- 判断用户是否满足某个单独的`Requirement`：把该`Requirement`变换成一个具有唯一元素的数组
- 只指定Policy名，而无`Resource`
由于实现均较简单，此处不予赘述。

### 授权服务的默认实现

`AuthorizationService`的默认实现依赖于`IAuthorizationEvaluator`、`IAuthorizationHandlerProvider`、`IAuthorizationPolicyProvider`、`AuthorizationOptions`等服务:
- `IAuthorizationHandlerProvider`: 用于提供当前`WebApp`的众多`AuthorizatonHandler`服务
- `IAuthorizationEvaluator`：对`AuthorizatonHandler`授权结束后的当前授权上下文进行评估（只是简单判断），给出授权结果
- `IAuthorizationPolicyProvider`：用于根据指定的`Policy`名给出相应`Policy`实例

```csharp
public class DefaultAuthorizationService : IAuthorizationService
{
    private readonly AuthorizationOptions _options;
    private readonly IAuthorizationHandlerContextFactory _contextFactory;
    private readonly IAuthorizationHandlerProvider _handlers;
    private readonly IAuthorizationEvaluator _evaluator;
    private readonly IAuthorizationPolicyProvider _policyProvider;
    private readonly ILogger _logger;

    // 注入这些依赖
    public DefaultAuthorizationService(IAuthorizationPolicyProvider policyProvider, IAuthorizationHandlerProvider handlers, ILogger<DefaultAuthorizationService> logger, IAuthorizationHandlerContextFactory contextFactory, IAuthorizationEvaluator evaluator, IOptions<AuthorizationOptions> options)
    {
        ... 
    }
    
    ....
    
}
```
默认实现：
```csharp
public class DefaultAuthorizationService : IAuthorizationService
{
    public async Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user, object resource, IEnumerable<IAuthorizationRequirement> requirements)
    {
        if (requirements == null){ /*  throw  */ }

        var authContext = _contextFactory.CreateContext(requirements, user, resource);
        var handlers = await _handlers.GetHandlersAsync(authContext);
        foreach (var handler in handlers)
        {
            await handler.HandleAsync(authContext);
            if (!_options.InvokeHandlersAfterFailure && authContext.HasFailed)
            {
                break;
            }
        }

        var result = _evaluator.Evaluate(authContext);
        // ...logging
        return result;
    }

    public async Task<AuthorizationResult> AuthorizeAsync(ClaimsPrincipal user, object resource, string policyName)
    {
        if (policyName == null) { /*  throw  */ }
        var policy = await _policyProvider.GetPolicyAsync(policyName);
        if (policy == null)     { /*  throw  */ }
        return await this.AuthorizeAsync(user, resource, policy);
    }
}
```
## `IPolicyEvaluator`

`IPolicyEvaluator`在`IAuthorizationService`的基础之上提供了对具体`Policy`进行认证、授权的功能。

```csharp
public interface IPolicyEvaluator
{
    Task<AuthenticateResult> AuthenticateAsync(AuthorizationPolicy policy, HttpContext context);

    Task<PolicyAuthorizationResult> AuthorizeAsync(AuthorizationPolicy policy, AuthenticateResult authenticationResult, HttpContext context, object resource);
}
```

其实现
```csharp
public class PolicyEvaluator : IPolicyEvaluator
{
    private readonly IAuthorizationService _authorization;

    public PolicyEvaluator(IAuthorizationService authorization)
    {
        _authorization = authorization;
    }

    public virtual async Task<AuthenticateResult> AuthenticateAsync(AuthorizationPolicy policy, HttpContext context)
    {
        if (policy.AuthenticationSchemes != null && policy.AuthenticationSchemes.Count > 0)
        {
            ClaimsPrincipal newPrincipal = null;
            foreach (var scheme in policy.AuthenticationSchemes)
            {
                var result = await context.AuthenticateAsync(scheme);
                if (result != null && result.Succeeded)
                {
                    newPrincipal = SecurityHelper.MergeUserPrincipal(newPrincipal, result.Principal);
                }
            }

            if (newPrincipal != null)
            {
                context.User = newPrincipal;
                return AuthenticateResult.Success(new AuthenticationTicket(newPrincipal, string.Join(";", policy.AuthenticationSchemes)));
            }
            else
            {
                context.User = new ClaimsPrincipal(new ClaimsIdentity());
                return AuthenticateResult.NoResult();
            }
        }

        return (context.User?.Identity?.IsAuthenticated ?? false) 
            ? AuthenticateResult.Success(new AuthenticationTicket(context.User, "context.User"))
            : AuthenticateResult.NoResult();
    }

    public virtual async Task<PolicyAuthorizationResult> AuthorizeAsync(AuthorizationPolicy policy, AuthenticateResult authenticationResult, HttpContext context, object resource)
    {
        if (policy == null) { /* throw */ }

        var result = await _authorization.AuthorizeAsync(context.User, resource, policy);
        if (result.Succeeded)
        {
            return PolicyAuthorizationResult.Success();
        }

        // If authentication was successful, return forbidden, otherwise challenge
        return (authenticationResult.Succeeded) 
            ? PolicyAuthorizationResult.Forbid() 
            : PolicyAuthorizationResult.Challenge();
    }
}
```
这个类是会被用于授权中间件、及`MVC`的`AuthorizeFilter`中