---
layout: post
title: Authentication — (3.3) 认证处理器的实现之RemoteAuthenticationHandler
date: 2019-08-14 22:46:03
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

设想我们要写一个支持`OAuth2.0`的认证处理器，它支持使用`Google`、`Microsoft`、`Facebook`等账号登陆。由于它们共用一套认证逻辑`OAuth2.0`，所以我们不希望为每一个网站都写一遍处理认证的方法，而是希望针对每个网站的一些特性部分进行简单填充。一个合理的方式是让处理认证的方法接受一个如何登陆的字符串（比如`Google`），然后通过认证服务去自动调用对应具体的认证处理器（比如`GoogleHandler`）。
更一般的，除了`OAuth`,`OIDC`也是一种常见的远程认证方式。

为了抽象这种利用远程服务器进行认证的方式，`ASP.NET Core`提供了`RemoteAuthenticationHandler<TOptions>`抽象类。该类继承自`AuthenticationHandler<TOptions>`抽象基类，并且实现了`IAuthenticationRequestHandler`接口：
```csharp
public abstract class RemoteAuthenticationHandler<TOptions> : AuthenticationHandler<TOptions>, IAuthenticationRequestHandler
    where TOptions : RemoteAuthenticationOptions, new()
{
    protected string SignInScheme => Options.SignInScheme;
    
    protected new RemoteAuthenticationEvents Events
    {
        get { return (RemoteAuthenticationEvents)base.Events; }
        set { base.Events = value; }
    }
    
    // ...
}
```
由于在继承自`AuthenticationHandler<TOptions>`的同时，还实现了`IAuthenticationRequestHandler`接口，这个`RemoteAuthenticationHandler<TOptions>`类就有两套处理认证的机制。一套是`AuthenticationHandler<TOptions>`的认证、质询、禁止等方法；另一套是`IAuthenticationRequestHandler`的接口方法`HandleRequestAsync()`用于直接对请求进行中间件级别的处理，并中断后续请求处理过程。<!-- more -->

需要特别指出的是，`RemoteAuthenticationHandler`中有一个受保护的 **`SignInScheme`** 属性。其用途为：
1. 当用户认证成功时，使用该`SignInScheme`将用户**登入**
2. 当需要认证用户时，只需查看当前用户在该`SignInScheme`下是否已经登陆
3. 当用户被判定登陆失败提示`Forbidden`时，调用认证服务转而调用`SignInScheme`模式对应的认证处理器方法。

### `AuthenticationHandler<TOptions>`系的方法

这一系列的方法包括处理认证、处理质询、处理禁止、处理登入、和处理登出几个方法。其中，处理禁止的方法最为简单，只是简单转而调用`SignInScheme`对应的处理器方法：
```csharp
protected override Task HandleForbiddenAsync(AuthenticationProperties properties)=> Context.ForbidAsync(SignInScheme);
```

而其处理认证的方法也只是复用`SigninScheme`模式进行认证：
```csharp
protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
{
    var result = await Context.AuthenticateAsync(SignInScheme);
    if (result != null)
    {
        if (result.Failure != null) {  return result; }

        // The SignInScheme may be shared with multiple providers, make sure this provider issued the identity.
        string authenticatedScheme;
        var ticket = result.Ticket;
        if (ticket != null && ticket.Principal != null && ticket.Properties != null
            && ticket.Properties.Items.TryGetValue(AuthSchemeKey, out authenticatedScheme)
            && string.Equals(Scheme.Name, authenticatedScheme, StringComparison.Ordinal))
        {
            return AuthenticateResult.Success(new AuthenticationTicket(ticket.Principal,
                ticket.Properties, Scheme.Name));
        }

        return AuthenticateResult.Fail("Not authenticated");
    }

    return AuthenticateResult.Fail("Remote authentication does not directly support AuthenticateAsync");
}
```
其他几个方法均类似，故不复赘述。

### `IAuthenticationRequestHandler`系的接口方法

在开始这部分内容之前，先要了解下这个类的一个辅助方法：`ShouldHandleRequestAsync()`。我们知道，远程认证结束后，远程服务器需要把用户重定向到本服务器的某个地址（称之为**回调地址**）。该方法的工作原理便是判断当前路径是否为配置好的**回调地址**，如果是，则意味着当前请求是远程服务器认证结束后重定向来的**回调请求**，需要拦截处理。
```csharp
public virtual Task<bool> ShouldHandleRequestAsync() => Task.FromResult(Options.CallbackPath == Request.Path);
```

作为`IAuthenticationRequestHandler`接口的核心方法，`HandleRequestAsync()`方法基本思路是，**判断当前路径是否为预配返回地址，如果不是，则意味着当前请求并不适合用`IAuthenticationRequestHandler`接口处理，直接返回`false`；否则，意味着当前的请求是由远程认证服务器认证结束后重定向来的请求，应当确认用户身份，触发相关事件钩子，最终在登入用户之后，中断后续的请求处理过程(`return true`)**。
```csharp
public virtual async Task<bool> HandleRequestAsync()
{
    if (!await ShouldHandleRequestAsync())
    {
        return false;
    }
    
    // ...
    
    var authResult = await HandleRemoteAuthenticateAsync();
    // check authResult... 
    
    // create a ticketContext if authResult succeeds 
    // ... await Events.TicketReceived(ticketContext);
    
    await Context.SignInAsync(SignInScheme, ticketContext.Principal, ticketContext.Properties);

    // Default redirect path is the base path
    if (string.IsNullOrEmpty(ticketContext.ReturnUri))
    {
        ticketContext.ReturnUri = "/";
    }

    Response.Redirect(ticketContext.ReturnUri);
    return true;
}
```
这里`HandleRemoteAuthenticateAsync()`是一个抽象方法，留待不同的子类提供实现。

## `RemoteAuthenticationHandler` 流程概述

总结而言，`RemoteAuthenticationHandler`的完整调用流程可以

以`GoogleHandler`为例，
1. 用户访问某个页面，点击“使用Google登陆”按钮，申请使用Google账号提交，浏览器发送请求到`https://your-server/Identity/Account/ExternalLogin?returnUrl=%2F`:
2. `ASP.NET Core` 相关登陆页面将之重定向至`Google`授权页面
```
https://accounts.google.com/o/oauth2/v2/auth?
    response_type=code
    &client_id=xxx
    &scope=openid%20profile%20email
    &redirect_uri=https%3A%2F%2Fyour-server%2Fsignin-google
    &state=xxx
```
3. `Google`认证用户完成以后，将用户重定向至`ASP.NET Core` 的指定URL（携带`code`等参数），该URL通常是：`/sigin-google`:
```
 https://your-server/signin-google?
    state=xxx
    &code=yyy
    &scope=zzz
    &authuser=0
    &session_state=abc
    &prompt=none
```
4. 浏览器访问上述URL，中间件`AuthenticationMiddleware`会调用`GetRequestHandlerSchemesAsync()`方法获取所有的`RequestHandlerSchemes`，然后逐一尝试将该认证处理器转换`AuthenticationRequestHandler`，如果成功，则调用其`HandleRequestAsync()`方法。`GoogleHandler::HandleRequestAsync()`方法继承自`RemoteAuthenticationHandler`，会先调用`ShouldHandleRequestAsync()`进行判断是否需要处理请求。默认情况下，该方法只是检测`Options.CallbackPath`和 `Request.Path`是否相等而已。如果不等，说明当前认证处理器不应当处理当前请求相等；否则，比如这里等于`signin-google`，则会进行远程认证处理(不同的远程认证模式，其处理方式也不同，比如，`OAuth2.0`中常见的方式是用`code`换取`token`)，处理认证完成之后，倘若认证成功，则再将用户`SigninAsync()`之。

参见SO上的回答:
https://stackoverflow.com/questions/52980581/how-signin-google-in-asp-net-core-authentication-is-linked-to-the-google-handler/52984793#52984793
