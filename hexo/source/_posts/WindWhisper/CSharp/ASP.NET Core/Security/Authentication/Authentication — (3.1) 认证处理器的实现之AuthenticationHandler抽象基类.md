---
layout: post
title: Authentication — (3.1) 认证处理器的实现之AuthenticationHandler抽象基类
date: 2019-08-14 21:40:03
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


前文说到，`AspNet/HttpAbstractions`项目中定义了`IAuthenticationHandler`接口，负责针对每个请求进行认证处理，包含了初始化、认证、质询、和禁止访问4个功能：

```csharp
public interface IAuthenticationHandler
{
    Task InitializeAsync(AuthenticationScheme scheme, HttpContext context);
    Task<AuthenticateResult> AuthenticateAsync();
    Task ChallengeAsync(AuthenticationProperties properties);
    Task ForbidAsync(AuthenticationProperties properties);
}
```

在`AspNet/Security`项目中，提供了一个抽象类`AuthenticationHandler<TOptions>`作为` IAuthenticationHandler`的基础实现：

```csharp
public abstract class AuthenticationHandler<TOptions> : IAuthenticationHandler 
    where TOptions : AuthenticationSchemeOptions, new()
{
     // ...
}
```

其中，初始化只是简单地设置模式、`HttpContext`，创建事件处理器等：<!-- more -->
```csharp
    // 初始化，设置scheme，context ，事件等
    public async Task InitializeAsync(AuthenticationScheme scheme, HttpContext context)
    {
        // ...
        
        Scheme = scheme;
        Context = context;

        Options = OptionsMonitor.Get(Scheme.Name) ?? new TOptions();
        Options.Validate(Scheme.Name);

        await InitializeEventsAsync();
        await InitializeHandlerAsync();
    }
```

而其余三个关键的接口方法分别负责认证、质询、和禁止，三者的处理逻辑都是先进行**转发检测**，判断是否要转发给其他认证模式。如果需要转发，则转而调用`HttpContext`上的认证服务处理；否则，就会调用自身的处理认证、处理质询、和处理禁止方法。


转发检测是通过`ResolveTarget(scheme)`这个函数完成的，该函数非常简单，只是根据当前认证处理器的配置选项，解析需要转发给哪个目标认证模式：

```csharp
    protected virtual string ResolveTarget(string scheme)
    {
        var target = scheme ?? Options.ForwardDefaultSelector?.Invoke(Context) ?? Options.ForwardDefault;

        // Prevent self targetting
        return string.Equals(target, Scheme.Name, StringComparison.Ordinal)
            ? null
            : target;
    }
```
可以看到获取目标模式的优先级为：
1. 如果配置了`ForwardDefaultSelector`函数，则调用此函数来获取转发模式，
2. 如果结果为空，则尝试用`ForwardDefault`选项来设置

### 认证


如果想把认证过程转发给其他认证模式，则转而调用`HttpContext`的认证服务进行处理；否则，则使用自己的逻辑进行处理，并返回认证结果。当然，为了避免同一次请求过程中反复计算`AuthenticationResult`，需要把结果缓存下来，也即调用`await HandleAuthenticateOnceAsync();`来避免反复计算:

```csharp
    public async Task<AuthenticateResult> AuthenticateAsync()
    {
        // target scheme string
        var target = ResolveTarget(Options.ForwardAuthenticate);
        if (target != null)
        {
            return await Context.AuthenticateAsync(target);
        }

        // Calling Authenticate more than once should always return the original value.
        var result = await HandleAuthenticateOnceAsync();
        // ... log
        return result;
    }
```    

` HandleAuthenticateOnceAsync()`函数只是简单的调用自身的`HandleAuthenticateAsync()`进行处理，这里的`HandleAuthenticateAsync()`是一个抽象方法，留待子类实现；在当次请求过程中，第一次认证结束后的认证结果会缓存下来，当次请求过程中如果还有后续认证需求的话，直接从当前缓存中返回认证结果：
```csharp
    protected Task<AuthenticateResult> HandleAuthenticateOnceAsync()
    {
        if (_authenticateTask == null)
        {
            _authenticateTask = HandleAuthenticateAsync();
        }

        return _authenticateTask;
    }
    
    protected abstract Task<AuthenticateResult> HandleAuthenticateAsync();
```

### 质询

和认证方法类似，质询也是优先判断是否要转发给其他模式质询，如果没有的话，再调用自身的抽象方法`HandleChallengeAsync`处理质询过程：
```csharp
    public async Task ChallengeAsync(AuthenticationProperties properties)
    {
        var target = ResolveTarget(Options.ForwardChallenge);
        if (target != null)
        {
            await Context.ChallengeAsync(target, properties);
            return;
        }

        properties = properties ?? new AuthenticationProperties();
        await HandleChallengeAsync(properties);
        Logger.AuthenticationSchemeChallenged(Scheme.Name);
    }
```
这里默认的处理质询过程只是返回一个`401`
```csharp
    protected virtual Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 401;
        return Task.CompletedTask;
    }
```

### 禁止

至于禁止方法，同样还是优先判断是否要转发给其他模式禁止。如果不需要，则由`HandleForbiddenAsync()`方法自身处理禁止过程：
```csharp
    public async Task ForbidAsync(AuthenticationProperties properties)
    {
        var target = ResolveTarget(Options.ForwardForbid);
        if (target != null)
        {
            await Context.ForbidAsync(target, properties);
            return;
        }

        properties = properties ?? new AuthenticationProperties();
        await HandleForbiddenAsync(properties);
        Logger.AuthenticationSchemeForbidden(Scheme.Name);
    }
```

默认禁止只是返回一个`403` :
```csharp
    protected virtual Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 403;
        return Task.CompletedTask;
    }
```
