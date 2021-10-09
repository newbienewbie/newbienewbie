---
layout: post
title: Authentication — (4) Authentication服务的配置与构建
date: 2019-08-14 23:46:03
tags:
- ASP.NET Core
- Authentication
- CSharp
- 源码分析
categories:
- 风语
- CSharp
- ASP.NET Core
- Security
- Authentication
---

## 世界观

`ASP.NET Core`可以配置多种认证，让各个认证模式协同工作。这种配置主要体现在两个方面:
1. 需要对`DI`容器中的 **`AuthenticationOptions`** 进行设置: 其中包含了每一种认证模式对应的`<scheme>-<handlerType>`的映射关系、以及默认的相关scheme名等信息。
2. 需要把各个`scheme`对应的 **`handler`类** **作为服务**注册 到`DI`容器中。

### `AuthenticationBuilder`

事实上，`ASP.NET Core`暴露了一个`AuthenticationBuilder`来帮助开发者对认证进行设置。由于认证除了简单地`new`一个`AuthenticationBuilder`实例之外，还需要注册一些其他服务（比如编码解码功能等），`ASP.NET Core`为`IServiceCollection`提供了一个`AddAuthentication()`扩展方法，封装了上述过程，调用后返回一个`AuthenticationBuilder`实例：
```csharp
public static AuthenticationBuilder AddAuthentication(this IServiceCollection services)
{
    if (services == null)
    {
        throw new ArgumentNullException(nameof(services));
    }

    services.AddAuthenticationCore();
    services.AddDataProtection();
    services.AddWebEncoders();
    services.TryAddSingleton<ISystemClock, SystemClock>();
    return new AuthenticationBuilder(services);
}
```
除了`.AddAuthentication()`这种核心方式，还有两种重载形式：<!-- more -->
```csharp
public static AuthenticationBuilder AddAuthentication(this IServiceCollection services, Action<AuthenticationOptions> configureOptions) {
    if (services == null) { throw ...; }
    if (configureOptions == null){ throw ...; }

    var builder = services.AddAuthentication();
    services.Configure(configureOptions);
    return builder;
}

public static AuthenticationBuilder AddAuthentication(this IServiceCollection services, string defaultScheme)
    => services.AddAuthentication(o => o.DefaultScheme = defaultScheme);
```

可以看到，这两种重载只是在`.AddAuthentication()`这个方法基础之上再添加一点配置功能，仅此而已。最终`.AddAuthentication()`都返回一个`AuthenticationBuilder`实例，用于后续的链式配置。

#### `AuthenticationBuilder`的核心方法

`AuthenticationBuilder`是用于配置认证服务的一个类，该类暴露一个核心方法 **`AddScheme<TOptions, THandler>(schemeName, displayName, configureAction)`** 。在内部，该方法会调用一个私有方法`AddSchemeHelper<TOptions, THandler>(schemeName, displayName, configureOptionsAction)`来完成前文所述的两个工作细节：
1. 配置全局的`AuthenticationOptions`（向其中添加`<schemeName>-<handlerType>`的映射关系，调用传入的委托配置选项），
2. 然后再把相应的`Handler`注册到`DI`容器。

`AddSchemeHelper<TOptions, THandler>(schemeName, displayName, configureOptionsAction)`的实现为：
```csharp
private AuthenticationBuilder AddSchemeHelper<TOptions, THandler>(string authenticationScheme, string displayName, Action<TOptions> configureOptions)
    where TOptions : AuthenticationSchemeOptions, new()
    where THandler : class, IAuthenticationHandler
{
    // 设置AuthenticationOptions中的 scheme-handler 映射关系
    Services.Configure<AuthenticationOptions>(o =>
    {
        o.AddScheme(authenticationScheme, scheme => {
            scheme.HandlerType = typeof(THandler);
            scheme.DisplayName = displayName;
        });
    });
    // 配置TOptions钩子
    if (configureOptions != null)
    {
        Services.Configure(authenticationScheme, configureOptions);
    }
    // 添加TOptions 
    Services.AddOptions<TOptions>(authenticationScheme).Validate(o => {
        o.Validate(authenticationScheme);
        return true;
    });
    // 注册handler服务
    Services.AddTransient<THandler>();
    return this;
}
```
这里的`TOptions`是特定的某种认证模式下的配置，如`JwtBearerOptions`、`CookieAuthenticationOptions`等。这个具体的`TOptions`会在认证时被对应的`THanlder`使用。

在此基础上，`AuthenticationBuilder`又提供了一系列`AddScheme<TOptions, THandler>(...)`方法供开发者注册相应认证`scheme`及`handler`。`AddScheme<TOptions, THandler>(...)`最简单的形式是对`AddSchemeHelper`的转发调用:
```csharp
public virtual AuthenticationBuilder AddScheme<TOptions, THandler>(string authenticationScheme, string displayName, Action<TOptions> configureOptions)
    where TOptions : AuthenticationSchemeOptions, new()
    where THandler : AuthenticationHandler<TOptions>
    => AddSchemeHelper<TOptions, THandler>(authenticationScheme, displayName, configureOptions);
```

#### 特定认证模式的配置

各个不同的认证模式往往会**提供一些具体的扩展方法来简化特定的认证模式配置**，比如 **`AddCookie()`** 的源码实现为：
```csharp
public static AuthenticationBuilder AddCookie(this AuthenticationBuilder builder, string authenticationScheme, string displayName, Action<CookieAuthenticationOptions> configureOptions)
{
    builder.Services.TryAddEnumerable(ServiceDescriptor.Singleton<IPostConfigureOptions<CookieAuthenticationOptions>, PostConfigureCookieAuthenticationOptions>());
    builder.Services.AddOptions<CookieAuthenticationOptions>(authenticationScheme).Validate(o => o.Cookie.Expiration == null, "Cookie.Expiration is ignored, use ExpireTimeSpan instead.");
    return builder.AddScheme<CookieAuthenticationOptions, CookieAuthenticationHandler>(authenticationScheme, displayName, configureOptions);
}
```
这使得开发者可以通过以下方式配置`Cookie`认证：
```csharp
services.AddAuthentication(options =>{
    ...
})
.AddCookie(IdentityConstants.ApplicationScheme, o =>
{
    o.LoginPath = new PathString("/Account/Login");
    o.Events = new CookieAuthenticationEvents
    {
        OnValidatePrincipal = SecurityStampValidator.ValidatePrincipalAsync
    };
})
.AddCookie(IdentityConstants.ExternalScheme, o =>
{
    o.Cookie.Name = IdentityConstants.ExternalScheme;
    o.ExpireTimeSpan = TimeSpan.FromMinutes(5);
})
.AddCookie(IdentityConstants.TwoFactorRememberMeScheme, o =>
{
    o.Cookie.Name = IdentityConstants.TwoFactorRememberMeScheme;
    o.Events = new CookieAuthenticationEvents
    {
        OnValidatePrincipal = SecurityStampValidator.ValidateAsync<ITwoFactorSecurityStampValidator>
    };
})
.AddCookie(IdentityConstants.TwoFactorUserIdScheme, o =>
{
    o.Cookie.Name = IdentityConstants.TwoFactorUserIdScheme;
    o.ExpireTimeSpan = TimeSpan.FromMinutes(5);
});
```
（其实，这段代码摘自官方`AddIdentity<TUser, TRole>(setupAction)`项目）

再比如`JwtBearer`模式提供了`AddJwtBearer()`扩展方法来简化其认证服务的配置：

```csharp
public static AuthenticationBuilder AddJwtBearer(this AuthenticationBuilder builder, string authenticationScheme, string displayName, Action<JwtBearerOptions> configureOptions)
{
    builder.Services.TryAddEnumerable(ServiceDescriptor.Singleton<IPostConfigureOptions<JwtBearerOptions>, JwtBearerPostConfigureOptions>());
    return builder.AddScheme<JwtBearerOptions, JwtBearerHandler>(authenticationScheme, displayName, configureOptions);
}
```

### 如何使用:

```csharp
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            // validate the server that created that token
            ValidateIssuer = true,
            // ensure that the recipient of the token is authorized to receive it
            ValidateAudience = true,
            // check that the token is not expired and that the signing key of the issuer is valid
            ValidateLifetime = true,
            // verify that the key used to sign the incoming token is part of a list of trusted keys
            ValidateIssuerSigningKey = true,
            ValidIssuer = issuer,
            ValidAudience = issuer,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
        };
    });
```


```csharp
service.AddAuthentication(...)
    .AddJwtBearer(options =>
        // ...
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                // replace "token" with whatever your param name is
                if (ctx.Request.Method.Equals("GET") && ctx.Request.Query.ContainsKey("token"))
                    ctx.Token = ctx.Request.Query["token"];
                return Task.CompletedTask;
            }
        };
    });
```
