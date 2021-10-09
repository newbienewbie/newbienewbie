---
layout: post
title: Authorization — (0) 基础概念 Policy的组合与构建
date: 2019-08-20 20:14:03
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

`ASP.NET Core`中，`Authorization`和`Authentication`机制有很大的相似之处：
1. 一个`WebApp`中，可以有多种`AuthenticationScheme`；类似的，也可以指定多种`AuthorizationPolicy`。
2. `Authentication`通过`AuthentionOptions`来配置认证行为；类似的，`Authorization`通过`AuthorizationOptions`来配置授权行为。
3. `AuthenticationOptions`提供`AddScheme(name,func)`方法来注册认证模式，并提供通过`AuthenticationBuilder`来构建`AuthenticationOptions`；而`AuthorizationOptions`提供`AddPolicy(name,func)`方法来添加授权策略，`AuthorizationBuilder` 则负责多个`Requirements`/`Policy`的组合，从而构建出最终的`AuthorizationOptions`。
4. 认证处理器`AuthenticationHandler<TSchemeOptions>`依据某种具体模式选项进行认证；而授权处理器`AuthorizationHandler<TRequirement>`则依据某种具体的`TRequirement`进行授权。
5. `Authentication`提供了一个中间件来自动认证；`Authorization`也提供了一个`MVC` `Filter`来授权，在3.0之后，甚至还添加了一个`AuthorizationMiddleware`来做授权工作。

当然，在细节上，二者的实现还有很大的不同。比如`Authorization`并没有向`Authentication`那样，提供一个方法自动为用户注册自定义的`AuthorizationHandler<TRequirement>`（需要开发者手工注册）。这些具体的细节会后续几篇源码分析笔记中讲述。 

### `Policy` 和 `Requirement`

`Requirement`只是表达“要求”这个概念的一个空接口：
```csharp
public interface IAuthorizationRequirement { }
```
一个授权`Policy`由多条要求组成：
```csharp
public class AuthorizationPolicy
{
    public AuthorizationPolicy(IEnumerable<IAuthorizationRequirement> requirements, IEnumerable<string> authenticationSchemes)
    {
        if (requirements == null) { /* throw */ }
        if (authenticationSchemes == null){ /* throw */ }
        if (requirements.Count() == 0){ /* throw */ }
        
        Requirements = new List<IAuthorizationRequirement>(requirements).AsReadOnly();
        AuthenticationSchemes = new List<string>(authenticationSchemes).AsReadOnly();
    }

    public IReadOnlyList<IAuthorizationRequirement> Requirements { get; }

    public IReadOnlyList<string> AuthenticationSchemes { get; }
}
```
<!-- more -->

## `AuthorizationPolicyBuilder`

`AuthorizationPolicyBuilder`的核心是两个`Requirement`列表和`AuthenticationSchemes`列表两个字段：
```csharp
public class AuthorizationPolicyBuilder
{
    public IList<IAuthorizationRequirement> Requirements { get; set; } = new List<IAuthorizationRequirement>();
    public IList<string> AuthenticationSchemes { get; set; } = new List<string>();
    
    // ...
    
    public AuthorizationPolicy Build()
    {
        return new AuthorizationPolicy(Requirements, AuthenticationSchemes.Distinct());
    }
}
```
可以看到`Build()`方法非常简单，只是简单用自身的`Requirements`和`AuthenticationSchemes`创建一个新的`AuthenticationPolicy`。`Policy`的构建过程，本质上对认证模式、Requirement、Policy的组合过程。`Builder`为组合这些字段提供了一系列`RequireXyz()`辅助方法。

### RequireXyz()等系列方法

`AuthorizationPolicyBuilder`还提供了一系列添加`Requirement`的辅助方法：
- `RequireClaim()`系列
- `RequireRole()`系列
- `RequireUserName()`
- `RequireAuthenticatedUser()`
- `RequireAssertion()`系列

#### `RequireClaim()`系列：
```csharp
public class AuthorizationPolicyBuilder
{
    // ...
    
    public AuthorizationPolicyBuilder RequireClaim(string claimType, params string[] allowedValues)
    {
        if (claimType == null){ /*  throw  */ }
        return RequireClaim(claimType, (IEnumerable<string>)allowedValues);
    }

    public AuthorizationPolicyBuilder RequireClaim(string claimType, IEnumerable<string> allowedValues)
    {
        if (claimType == null){ /*  throw  */ }
        Requirements.Add(new ClaimsAuthorizationRequirement(claimType, allowedValues));
        return this;
    }

    public AuthorizationPolicyBuilder RequireClaim(string claimType)
    {
        if (claimType == null){ /*  throw  */ }
        Requirements.Add(new ClaimsAuthorizationRequirement(claimType, allowedValues: null));
        return this;
    }
    
    // ...
}
```
#### `RequireRole()`系列
```csharp
public class AuthorizationPolicyBuilder
{
    //  ...
    public AuthorizationPolicyBuilder RequireRole(params string[] roles)
    {
        if (roles == null){ /*  throw  */ }
        return RequireRole((IEnumerable<string>)roles);
    }

    public AuthorizationPolicyBuilder RequireRole(IEnumerable<string> roles)
    {
        if (roles == null){ /*  throw  */ }
        Requirements.Add(new RolesAuthorizationRequirement(roles));
        return this;
    }
```

#### `NameAuthorizationRequirement`和`DenyAnonymousAuthorizationRequirement`

```csharp
    public AuthorizationPolicyBuilder RequireUserName(string userName)
    {
        if (userName == null){ /*  throw  */ }
        Requirements.Add(new NameAuthorizationRequirement(userName));
        return this;
    }

    public AuthorizationPolicyBuilder RequireAuthenticatedUser()
    {
        Requirements.Add(new DenyAnonymousAuthorizationRequirement());
        return this;
    }

}
```

#### `AssertionRequirement`系列

```csharp
    public AuthorizationPolicyBuilder RequireAssertion(Func<AuthorizationHandlerContext, bool> handler)
    {
        if (handler == null){ /*  throw  */ }
        Requirements.Add(new AssertionRequirement(handler));
        return this;
    }
    
    public AuthorizationPolicyBuilder RequireAssertion(Func<AuthorizationHandlerContext, Task<bool>> handler)
    {
        if (handler == null){ /*  throw  */ }
        Requirements.Add(new AssertionRequirement(handler));
        return this;
    }
```

### 认证模式，Requirement，和Policy的组合

`AuthorizationPolicyBuilder`提供了三个帮助方法来向这两个列表字段中添加新的认证模式、`Requirement`、和`Policy`
```csharp
public class AuthorizationPolicyBuilder
{
    // ...
    
    public AuthorizationPolicyBuilder AddAuthenticationSchemes(params string[] schemes)
    {
        foreach (var authType in schemes){
            AuthenticationSchemes.Add(authType);
        }
        return this;
    }

    public AuthorizationPolicyBuilder AddRequirements(params IAuthorizationRequirement[] requirements)
    {
        foreach (var req in requirements){
            Requirements.Add(req);
        }
        return this;
    }

    public AuthorizationPolicyBuilder Combine(AuthorizationPolicy policy)
    {
        if (policy == null) { /*  throw  */ }
        AddAuthenticationSchemes(policy.AuthenticationSchemes.ToArray());
        AddRequirements(policy.Requirements.ToArray());
        return this;
    }
    // ...
}
```

### AuthorizationPolicy 类自身的三个辅助方法


此外，在`AuthorizationPolicyBuilder`的基础上，`AuthorizationPolicy`还提供了两个静态的`Combine()`帮助方法，用于组合一组`Policy`：
```csharp
public static AuthorizationPolicy Combine(IEnumerable<AuthorizationPolicy> policies)
{
    if (policies == null){ /* throw */ }
    var builder = new AuthorizationPolicyBuilder();
    foreach (var policy in policies){
        builder.Combine(policy);
    }
    return builder.Build();
}

public static AuthorizationPolicy Combine(params AuthorizationPolicy[] policies)
{
    if (policies == null){ /* throw */ }
    return Combine((IEnumerable<AuthorizationPolicy>)policies);
}
```
最后，`AuthorizatinoPolicy`还提供了一个`CombineAsync(policyProvider, authorizeData)`方法从`PolicyProvider`中动态生成`Policy`：
```csharp
public static async Task<AuthorizationPolicy> CombineAsync(IAuthorizationPolicyProvider policyProvider, IEnumerable<IAuthorizeData> authorizeData)
{
    if (policyProvider == null){ /* throw */ }
    if (authorizeData == null) { /* throw */ }

    // Avoid allocating enumerator if the data is known to be empty
    var skipEnumeratingData = false;
    if (authorizeData is IList<IAuthorizeData> dataList)
    {
        skipEnumeratingData = dataList.Count == 0;
    }

    AuthorizationPolicyBuilder policyBuilder = null;
    // ...

    return policyBuilder?.Build();
}
```
