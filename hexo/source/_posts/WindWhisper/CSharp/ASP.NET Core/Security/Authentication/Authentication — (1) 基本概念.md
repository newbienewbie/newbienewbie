---
layout: post
title: Authentication — (1) 基本概念
date: 2019-08-14 21:20:03
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

这部分代码在`HttpAbstractions`项目中定义，定义在`Microsoft.AspNetCore.Authentication`命名空间下。

本篇笔记分为两大部分：
1. 第一部分主要讲述**认证模式**、**认证处理器**及相应的**认证模式Provider**和**认证处理器Provider**
2. 第二部分主要对认证过程中涉及的相关类型进行描述，主要包括**认证属性**、**认证票据**、**认证结果**

### 认证模式

认证模式类`AuthenticationScheme`非常简单，顾名思义，它代表了某一种特定的认证模式，其中还包含了对应的认证处理器的类型信息：
```csharp
public class AuthenticationScheme
{
    public AuthenticationScheme(string name, string displayName, Type handlerType)
    {
        if (name == null) { /* throw */ }
        if (handlerType == null) { /* throw */ }
        if (!typeof(IAuthenticationHandler).IsAssignableFrom(handlerType)) { /* throw */ }

        Name = name;
        HandlerType = handlerType;
        DisplayName = displayName;
    }

    public string Name { get; }
    public string DisplayName { get; }

    public Type HandlerType { get; }
}
```

常见的认证模式有 `Cookies`、`Bearer`、`OAuth`、`OpenIdConnect`、`Google`、`Microsoft`、`Facebook`等。每种 认证模式都有各自的处理器负责处理用户认证事宜。注意，**`Scheme`中存储的并非是`Handler`实例，而是`Handler`的类型！** <!-- more -->

### 认证处理器相关接口


`IAuthenticationHandler`接口负责针对每个请求进行认证处理，包含了**初始化**、**认证**、**质询**、和**禁止**访问几个功能：
```csharp
public interface IAuthenticationHandler
{
    Task InitializeAsync(AuthenticationScheme scheme, HttpContext context); // 初始化
    Task<AuthenticateResult> AuthenticateAsync();                           // 认证
    Task ChallengeAsync(AuthenticationProperties properties);               // 质询
    Task ForbidAsync(AuthenticationProperties properties);                  // 禁止
}
```

除了以上几个通用的功能，还有两个特化的认证处理器接口用于**登入**和**登出**：

```csharp
public interface IAuthenticationSignOutHandler : IAuthenticationHandler
{
    Task SignOutAsync(AuthenticationProperties properties);
}

public interface IAuthenticationSignInHandler : IAuthenticationSignOutHandler
{
    Task SignInAsync(ClaimsPrincipal user, AuthenticationProperties properties);
}
```

最后，还有一个特化的接口`IAuthenticationRequestHandler` 用于**中间件级别的请求处理**：

```csharp
public interface IAuthenticationRequestHandler : IAuthenticationHandler
{
    Task<bool> HandleRequestAsync();
}
```
如果一个`IAuthenticationHanlder`接口对象可以转换为`IAuthenticationRequestHandler`接口，则说明该 接口对象否想参与中间件级别的请求处理，其`HandlerRequestAsync()`方法将用于对请求进行处理；当该方法完成后，如果希望系统停止后续中间件的处理，则返回`true`，否则返回`false`。

### `AuthenticationSchemeProvider`

`IAuthenticationSchemeProvider`接口用于
* 枚举当前认证模式
* 增、删某种认证模式
* 查找某种认证模式
```csharp
public interface IAuthenticationSchemeProvider
{
    Task<IEnumerable<AuthenticationScheme>> GetAllSchemesAsync();
    Task<AuthenticationScheme> GetSchemeAsync(string name);
   
    Task<AuthenticationScheme> GetDefaultAuthenticateSchemeAsync();
    Task<AuthenticationScheme> GetDefaultChallengeSchemeAsync();
    Task<AuthenticationScheme> GetDefaultForbidSchemeAsync();
    Task<AuthenticationScheme> GetDefaultSignInSchemeAsync();
    Task<AuthenticationScheme> GetDefaultSignOutSchemeAsync();

    void AddScheme(AuthenticationScheme scheme);
    void RemoveScheme(string name);

    Task<IEnumerable<AuthenticationScheme>> GetRequestHandlerSchemesAsync();
}
```

其默认实现为`AuthenticationSchemeProvider`，由于源码较为简单，此处不再赘述。

### `AuthenticationHandlerProvider`

`IAuthenticationHandlerProvider`用于提供与指定模式名相匹配的认证处理器的实例，其接口定义为：
```csharp
public interface IAuthenticationHandlerProvider
{
    Task<IAuthenticationHandler> GetHandlerAsync(HttpContext context, string authenticationScheme);
}
```

作为`IAuthenticationHandlerProvider`接口的默认实现，`AuthenticationHandlerProvider`包含了一个`IAuthenticatioSchemProvider`属性，获取相应认证模式处理器的类型，然后根据类型信息创建一个实例并存入缓存：

```csharp
namespace Microsoft.AspNetCore.Authentication
{
    public class AuthenticationHandlerProvider : IAuthenticationHandlerProvider
    {
        public AuthenticationHandlerProvider(IAuthenticationSchemeProvider schemes)
        {
            Schemes = schemes;
        }

        public IAuthenticationSchemeProvider Schemes { get; }
        // 创建一个字典作为缓存
        private Dictionary<string, IAuthenticationHandler> _handlerMap = new Dictionary<string, IAuthenticationHandler>(StringComparer.Ordinal);

        public async Task<IAuthenticationHandler> GetHandlerAsync(HttpContext context, string authenticationScheme){
            // 优先从缓存中查询
            if (_handlerMap.ContainsKey(authenticationScheme)){ return _handlerMap[authenticationScheme]; }

            var scheme = await Schemes.GetSchemeAsync(authenticationScheme);
            if (scheme == null){ return null; }
            
            // 创建实例、初始化、存入缓存
            var handler = (context.RequestServices.GetService(scheme.HandlerType) ??
                ActivatorUtilities.CreateInstance(context.RequestServices, scheme.HandlerType))
                as IAuthenticationHandler;
            if (handler != null){
                await handler.InitializeAsync(scheme, context);
                _handlerMap[authenticationScheme] = handler;
            }
            return handler;
        }
    }
}
```

### 认证属性、认证票据和认证结果

#### `AuthenticationProperties`

认证属性是一个简单的类似于字典一样的对象，用于存取关于认证会话的各项属性。其中，最核心的是两个字典属性：

* `Items` ： `Dictionary<string,string>`型字典
* `Parameters`：`Dictionary<string,object>`型字典，用于在handler之间共享对象，不可序列化或者持久化

```csharp
public class AuthenticationProperties
{
    // ...

    public IDictionary<string, string> Items { get; }

    public IDictionary<string, object> Parameters { get; }
}
```

为了方便起见，`AuthenticationProperties`针对`Parameters`字典和`Items`提供了如下的取、存方法

```csharp
public class AuthenticationProperties
{
    // ...
    
    public T GetParameter<T>(string key) => Parameters.TryGetValue(key, out var obj) && obj is T value ? value : default;

    public void SetParameter<T>(string key, T value) => Parameters[key] = value;
        
    public string GetString(string key)
    {
        return Items.TryGetValue(key, out string value) ? value : null;
    }

    public void SetString(string key, string value)
    {
        if (value != null) {
            Items[key] = value;
        } else if (Items.ContainsKey(key)) {
            Items.Remove(key);
        }
    }
}       
```

而`Items`虽然只能存储`string`型值，但是配合`ToString()`和从字符串解析的功能，还可以对`bool`、`DateTime`型数据类型进行存取：

```csharp
public class AuthenticationProperties
{
    // ...
    
    protected bool? GetBool(string key) { /* ...*/ }

    protected void SetBool(string key, bool? value) { /* ...*/ }
    
    protected DateTimeOffset? GetDateTimeOffset(string key) { /* ...*/ }

    protected void SetDateTimeOffset(string key, DateTimeOffset? value) { /* ...*/ }
}
```

在此基础之上，对一些常用属性及值提供了便利方法：

```csharp
{
    internal const string IssuedUtcKey = ".issued";
    internal const string ExpiresUtcKey = ".expires";
    internal const string IsPersistentKey = ".persistent";
    internal const string RedirectUriKey = ".redirect";
    internal const string RefreshKey = ".refresh";
    internal const string UtcDateTimeFormat = "r";

    public bool IsPersistent
    {
        get => GetString(IsPersistentKey) != null;
        set => SetString(IsPersistentKey, value ? string.Empty : null);
    }

    /// <summary>
    /// Gets or sets the full path or absolute URI to be used as an http redirect response value.
    /// </summary>
    public string RedirectUri
    {
        get => GetString(RedirectUriKey);
        set => SetString(RedirectUriKey, value);
    }

    /// <summary>
    /// Gets or sets the time at which the authentication ticket was issued.
    /// </summary>
    public DateTimeOffset? IssuedUtc
    {
        get => GetDateTimeOffset(IssuedUtcKey);
        set => SetDateTimeOffset(IssuedUtcKey, value);
    }

    /// <summary>
    /// Gets or sets the time at which the authentication ticket expires.
    /// </summary>
    public DateTimeOffset? ExpiresUtc
    {
        get => GetDateTimeOffset(ExpiresUtcKey);
        set => SetDateTimeOffset(ExpiresUtcKey, value);
    }

    /// <summary>
    /// Gets or sets if refreshing the authentication session should be allowed.
    /// </summary>
    public bool? AllowRefresh
    {
        get => GetBool(RefreshKey);
        set => SetBool(RefreshKey, value);
    }
}
```

#### `AuthenticationTicket`


认证票据封装了用户身份信息和一些配套的认证属性，如过期信息、是否允许刷新等。

```csharp
public class AuthenticationTicket
{

    public AuthenticationTicket(ClaimsPrincipal principal, AuthenticationProperties properties, string authenticationScheme)
    {
        if (principal == null) { /* throw */ }

        AuthenticationScheme = authenticationScheme;
        Principal = principal;
        Properties = properties ?? new AuthenticationProperties();
    }

    public AuthenticationTicket(ClaimsPrincipal principal, string authenticationScheme) 
        : this(principal, properties: null, authenticationScheme: authenticationScheme)
    { }


    public string AuthenticationScheme { get; private set; }

    public ClaimsPrincipal Principal { get; private set; }

    public AuthenticationProperties Properties { get; private set; }
}
```


#### `AuthenticationResult`

认证结果有三种，分别是：

* 没有结果：暂时无法确定最终认证结果，留待其他认证处理程序处理。
* 认证成功：需要提供认证票据
* 认证失败：需要指定失败消息

`AuthenticationResult`提供了一个类来封装了以上所有信息：

```csharp
public class AuthenticateResult
{
    public AuthenticationTicket Ticket { get; protected set; }    // 认证成功时的票据

    public ClaimsPrincipal Principal => Ticket?.Principal;        // 认证成功时票据中的主体

    public AuthenticationProperties Properties { get; protected set; } // 认证属性

    public Exception Failure { get; protected set; }               // 认证失败时的失败异常

    public bool None { get; protected set; }                       // 认证是否没有结果
     
    public bool Succeeded => Ticket != null;                       // 认证是否已经成功
}
```

`AuthenticationResult`还提供了三类静态方法来创建认证结果
```csharp
public class AuthenticateResult
{
    // ...
    
    
    public static AuthenticateResult NoResult()
    {
        return new AuthenticateResult() { None = true };
    }
    
    public static AuthenticateResult Success(AuthenticationTicket ticket)
    {
        if (ticket == null)
        {
            throw new ArgumentNullException(nameof(ticket));
        }
        return new AuthenticateResult() { Ticket = ticket, Properties = ticket.Properties };
    }

    public static AuthenticateResult Fail(Exception failure)
    {
        return new AuthenticateResult() { Failure = failure };
    }

    public static AuthenticateResult Fail(Exception failure, AuthenticationProperties properties)
    {
        return new AuthenticateResult() { Failure = failure, Properties = properties };
    }

    public static AuthenticateResult Fail(string failureMessage)
        => Fail(new Exception(failureMessage));

    public static AuthenticateResult Fail(string failureMessage, AuthenticationProperties properties)
        => Fail(new Exception(failureMessage), properties);
}
```

