---
title: Authorization — (3) ASP.NET Core 的授权中间件和MVC授权过滤器
date: 2019-08-20 22:35:03
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

## 授权中间件

和`ASP.NET Core 2.1`中的路由中间件不同，在`3.0`中新的`EndPoint`路由机制无需实际执行路由便可获取当前所匹配的`EndPoint`。正是得益于这套新引入的`EndPoint`路由系统，`ASP.NET Core`框架可在执行`MVC`路由之前，就可以捕捉到相应`EndPoint`的授权配置信息(`IAuthorizeData`)。基于此，`ASP.NET Core` `3.0`中为授权机制做了重大调整，即引入了**授权中间件**。这意味着在`3.0`中我们需要在`UseAuthentication()`之后尽快调用`UseAuthorization()`方法：
```csharp
    app.UseRouting();
    // ...
    app.UseAuthentication();
    app.UseAuthorization();           // 启用授权中间件
    // ...
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapHub<ChatHub>("/chat");
        endpoints.MapControllerRoute("default", "{controller=Home}/{action=Index}/{id?}");
    })
```

新引入的授权中间件的核心工作主要分成两部分：
- 借助于`IAuthorizationPolicyProvider`服务和当前`EndPoint`的`IAuthorizeData`，构建一个`Policy`对象。如果没有相应的`Policy`，则直接调用后续中间件（跳过剩余的授权过程）。
- 通过`IPolicyEvaluator`服务判断当前`HttpContext`是否满足`Policy`。如果不满足，根据授权结果决定是`Challenge`还是`Forbid`；否则，则继续调用后续中间件对请求进行处理。<!-- more -->

```csharp
public class AuthorizationMiddleware
{
    // Property key is used by other systems, e.g. MVC, to check if authorization middleware has run
    private const string AuthorizationMiddlewareInvokedKey = "__AuthorizationMiddlewareInvoked";
    private static readonly object AuthorizationMiddlewareInvokedValue = new object();

    private readonly RequestDelegate _next;
    private readonly IAuthorizationPolicyProvider _policyProvider;

    public AuthorizationMiddleware(RequestDelegate next, IAuthorizationPolicyProvider policyProvider)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _policyProvider = policyProvider ?? throw new ArgumentNullException(nameof(policyProvider));
    }

    public async Task Invoke(HttpContext context)
    {
        if (context == null){ /*  throw */}

        var endpoint = context.GetEndpoint();

        // Flag to indicate to other systems, e.g. MVC, that authorization middleware was run for this request
        context.Items[AuthorizationMiddlewareInvokedKey] = AuthorizationMiddlewareInvokedValue;

        // IMPORTANT: Changes to authorization logic should be mirrored in MVC's AuthorizeFilter
        var authorizeData = endpoint?.Metadata.GetOrderedMetadata<IAuthorizeData>() ?? Array.Empty<IAuthorizeData>();
        var policy = await AuthorizationPolicy.CombineAsync(_policyProvider, authorizeData);
        if (policy == null)
        {
            await _next(context);
            return;
        }

        // Policy evaluator has transient lifetime so it fetched from request services instead of injecting in constructor
        var policyEvaluator = context.RequestServices.GetRequiredService<IPolicyEvaluator>();

        var authenticateResult = await policyEvaluator.AuthenticateAsync(policy, context);

        // Allow Anonymous skips all authorization
        if (endpoint?.Metadata.GetMetadata<IAllowAnonymous>() != null)
        {
            await _next(context);
            return;
        }

        // Note that the resource will be null if there is no matched endpoint
        var authorizeResult = await policyEvaluator.AuthorizeAsync(policy, authenticateResult, context, resource: endpoint);

        if (authorizeResult.Challenged)
        {
            if (policy.AuthenticationSchemes.Any())
            {
                foreach (var scheme in policy.AuthenticationSchemes)
                {
                    await context.ChallengeAsync(scheme);
                }
            } else {
                await context.ChallengeAsync();
            }

            return;
        } else if (authorizeResult.Forbidden) {
            if (policy.AuthenticationSchemes.Any())
            {
                foreach (var scheme in policy.AuthenticationSchemes)
                {
                    await context.ForbidAsync(scheme);
                }
            } else {
                await context.ForbidAsync();
            }

            return;
        }

        await _next(context);
    }
}
```


## MVC授权过滤器

`MVC`内置了一个授权过滤器`AuthorizeFilter`，其基本实现非常类似于授权中间件：
```csharp
namespace Microsoft.AspNetCore.Mvc.Authorization
{
    public class AuthorizeFilter : IAsyncAuthorizationFilter, IFilterFactory
    {
        // ...  构造函数与属性

        /// <inheritdoc />
        public virtual async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            if (context == null){ /* throw */ }
            var effectivePolicy = await GetEffectivePolicyAsync(context);
            if (effectivePolicy == null) { return; }

            var policyEvaluator = context.HttpContext.RequestServices.GetRequiredService<IPolicyEvaluator>();

            var authenticateResult = await policyEvaluator.AuthenticateAsync(effectivePolicy, context.HttpContext);

            // Allow Anonymous skips all authorization
            if (HasAllowAnonymous(context.Filters)) { return; }

            var authorizeResult = await policyEvaluator.AuthorizeAsync(effectivePolicy, authenticateResult, context.HttpContext, context);

            if (authorizeResult.Challenged)
            {
                context.Result = new ChallengeResult(effectivePolicy.AuthenticationSchemes.ToArray());
            }
            else if (authorizeResult.Forbidden)
            {
                context.Result = new ForbidResult(effectivePolicy.AuthenticationSchemes.ToArray());
            }
        }

    }
}
```