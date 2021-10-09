---
layout: post
title: Authentication — (2) 认证服务及其对HttpContext的认证扩展方法
date: 2019-08-14 21:30:03
tags:
- ASP.NET Core
- CSharp
- Authentication
- 源码分析
categories:
- 风语
- CSharp
- ASP.NET Core
- Security
- Authentication
---


此部分代码位于`aspnet/HttpAbstractions`项目中，命名空间为 `Microsoft.AspNetCore.Authentication` 。


认证服务及以其为基础对`HttpContext`的扩展方法是所有认证过程的核心：
* 对于默认的认证模式，是直接转发调用`HttpContext.Authenticate()`扩展方法
* 对于自定义的认证请求处理，需要手工在`HandleRequestAsync()`函数中，自行使用`Context.SignInSync(signInScheme,principal,properties)`进行登入

## 认证服务接口

`IAuthentictionService`接口规定认证、质询、禁止、登入、登出共五个功能：

```csharp
public interface IAuthenticationService
{
    Task<AuthenticateResult> AuthenticateAsync(HttpContext context, string scheme);

    Task ChallengeAsync(HttpContext context, string scheme, AuthenticationProperties properties);

    Task ForbidAsync(HttpContext context, string scheme, AuthenticationProperties properties);

    Task SignInAsync(HttpContext context, string scheme, ClaimsPrincipal principal, AuthenticationProperties properties);

    Task SignOutAsync(HttpContext context, string scheme, AuthenticationProperties properties);
}
```

而其默认实现`AuthenticationService`中包含了两个重要字段，即当前的认证模式集`Schemes`和认证处理器集`Handlers`(后面会单独讲解`IClaimsTransformation Transform`)： <!-- more -->

```csharp
public class AuthenticationService : IAuthenticationService
{
    public AuthenticationService(IAuthenticationSchemeProvider schemes, IAuthenticationHandlerProvider handlers, IClaimsTransformation transform)
    {
        Schemes = schemes;
        Handlers = handlers;
        Transform = transform;
    }

    public IAuthenticationSchemeProvider Schemes { get; }
    public IAuthenticationHandlerProvider Handlers { get; }
    public IClaimsTransformation Transform { get; }
    // ...
}
```

这些认证服务接口相关方法的实现比较类似，基本都是转发调用相应认证处理器的相应方法。

#### AuthenticateAsync

比如，`AuthenticationAsync(context,scheme)`方法会选择合适的认证处理器进行认证：
```csharp
public virtual async Task<AuthenticateResult> AuthenticateAsync(HttpContext context, string scheme)
{
    if (scheme == null)
    {
        var defaultScheme = await Schemes.GetDefaultAuthenticateSchemeAsync();
        scheme = defaultScheme?.Name;
        if (scheme == null) { /* throw */ }
    }

    var handler = await Handlers.GetHandlerAsync(context, scheme);
    if (handler == null) { /* throw */ }

    var result = await handler.AuthenticateAsync();
    if (result != null && result.Succeeded)
    {
        var transformed = await Transform.TransformAsync(result.Principal);
        return AuthenticateResult.Success(new AuthenticationTicket(transformed, result.Properties, result.Ticket.AuthenticationScheme));
    }
    return result;
}
```
这里`AuthenticationAsync(context,scheme)`的处理步骤为：
1. 如果`scheme`未指定，就选择默认的认证模式
2. 根据`scheme`获取相对应的认证处理器`handler`
3. 调用`handler`进行认证


值得注意的是，如果认证成功，还会通过所注入的`IClaimsTransformation`服务对结果的`Principal`进行转换。这里有一个有意思的使用场景：第三方生成的`JWT`令牌格式并不一定满足`ASP.NET Core`默认的格式（参见[SO回答](https://stackoverflow.com/questions/56352055/cant-get-asp-net-core-2-2-to-validate-my-jwt/56354885#56354885)）。

比如，根据[dotnet/corefx](https://github.com/dotnet/corefx/blob/a10890f4ffe0fadf090c922578ba0e606ebdd16c/src/System.Security.Claims/src/System/Security/Claims/ClaimTypes.cs#L27),`ClaimTypes.Role`的字符串键名为`http://schemas.microsoft.com/ws/2008/06/identity/claims/role`,这要求我们传入JWT 以之来配置`Role`:
```json
{
  "nbf": ...,
  "exp": ...,
  "iss": ...,
  "aud": ...,
   ...,
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role": [
    "offline_access",
    "...other roles"
  ],
}
```
但是有时候第三方可能用以下方式配置JWT的Role：
```json
"realm_access":{  
  "roles":[  
     "offline_access",
     "uma_authorization"
  ]
},
```
这时候我们就可以注入一个自定义的`IClaimsTransformation`，实现`Principal`的转换：
```
services.AddTransient<IClaimsTransformation, ClaimsTransformer>();
```

#### SignInAsync

登入与认证类似：也是先检测指定的模式，如果为空则选择默认的登入模式；随后，利用`scheme`获取相应的认证处理器，转换为`IAuthenticationSignInHandler`接口对象，最后再用转换出的`IAuthenticationSignInHandler`对象对`principal`进行登入。
```csharp
public virtual async Task SignInAsync(HttpContext context, string scheme, ClaimsPrincipal principal, AuthenticationProperties properties)
{
    if (principal == null) { /* throw */ }

    if (scheme == null)
    {
        var defaultScheme = await Schemes.GetDefaultSignInSchemeAsync();
        scheme = defaultScheme?.Name;
        if (scheme == null) { /* throw */ }
    }

    var handler = await Handlers.GetHandlerAsync(context, scheme);
    if (handler == null) { /* throw */ }

    var signInHandler = handler as IAuthenticationSignInHandler;
    if (signInHandler == null) { /* throw */ }

    await signInHandler.SignInAsync(principal, properties);
}
```

## `HttpContext`的认证扩展方法

以认证服务为基础，`ASP.NET Core`为`HttpContext`添加了一系列扩展方法：

```csharp
public static class AuthenticationHttpContextExtensions
{
    public static Task<AuthenticateResult> AuthenticateAsync(this HttpContext context, string scheme) =>
        context.RequestServices.GetRequiredService<IAuthenticationService>().AuthenticateAsync(context, scheme);

    public static Task ChallengeAsync(this HttpContext context, string scheme, AuthenticationProperties properties) =>
        context.RequestServices.GetRequiredService<IAuthenticationService>().ChallengeAsync(context, scheme, properties);

    public static Task ForbidAsync(this HttpContext context, string scheme, AuthenticationProperties properties) =>
        context.RequestServices.GetRequiredService<IAuthenticationService>().ForbidAsync(context, scheme, properties);

    public static Task SignInAsync(this HttpContext context, string scheme, ClaimsPrincipal principal, AuthenticationProperties properties) =>
        context.RequestServices.GetRequiredService<IAuthenticationService>().SignInAsync(context, scheme, principal, properties);

    public static Task SignOutAsync(this HttpContext context, string scheme, AuthenticationProperties properties) =>
        context.RequestServices.GetRequiredService<IAuthenticationService>().SignOutAsync(context, scheme, properties);


    public static Task<string> GetTokenAsync(this HttpContext context, string scheme, string tokenName) =>
        context.RequestServices.GetRequiredService<IAuthenticationService>().GetTokenAsync(context, scheme, tokenName);

    public static Task<string> GetTokenAsync(this HttpContext context, string tokenName) =>
        context.RequestServices.GetRequiredService<IAuthenticationService>().GetTokenAsync(context, tokenName);
}
```

这些方法都是简单地转而调用认证服务的相关方法。至此，我们可以通过`HttpContext`自动调用当前认证服务的相关方法。
