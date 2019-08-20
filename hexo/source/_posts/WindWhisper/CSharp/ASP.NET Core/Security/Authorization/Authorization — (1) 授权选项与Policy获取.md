---
title: Authorization — (1) 授权选项与Policy获取
date: 2019-08-20 21:14:03
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

和`Authentication`一样，`Authorization`机制也有一个对应的`AuthorizationOptions`供开发者进行配置。更进一步地，和`AuthenticationOptions.AddScheme(name,configureBuilder)`类似，`AuthorizationOptions`也提供了一个名为`AddPolicy(string name, Action<AuthorizationPolicyBuilder> configurePolicy)`方法来配置授权策略。

不过和`Authentication`机制不同的是，`AddAuthentication()`返回的是一个`AuthenticationBuilder`实例，这样开发者就可以链式构建`AuthenticationOptions`：
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
```

但是`AddAuthorization()`并没有返回一个`Builder`之类东西来供开发者链式构建`AuthorizationOptions`，这可能是基于向后兼容考虑。在`Authorization`中，开发者直接使用`AddPolicy()`等实例方法来配置授权策略：<!-- more -->
```csharp
services.AddAuthorization(options =>
{
    options.AddPolicy("policy1", policyBuilder => { /* ... */ } );
    options.AddPolicy("policy2", policyBuilder => { /* ... */ } );
    ... // other policies
});
```

注意这里`options.AddPolicy()`方法对具体的`AuthorizationHandler`一无所知，所以也不会去把相关`AuthorizationHandler`注册为服务，这也导致了在授权服务的配置过程中，我们需要手工把相关授权处理器注册为服务。

不管怎么说，开发者都可以根据项目需要配置多种授权策略。

## AuthorizationOptions

`AuthorizationOptions`负责三件事：一是存储当前`WebApp`中注册的所有`Policy`，这块工作主要是通过一个私有的字典`IDictionary<string,AuthorizationPolicy>`完成；二是为当前`WebApp`指定默认策略(`DefaultPolicy`)和回退策略(`FallbackPolicy`)；三是为当前`WebApp`指定认证失败后的钩子。


#### 策略的添加与查询
```csharp
public class AuthorizationOptions
{
    private IDictionary<string, AuthorizationPolicy> PolicyMap { get; } = new Dictionary<string, AuthorizationPolicy>(StringComparer.OrdinalIgnoreCase);
    
    public void AddPolicy(string name, AuthorizationPolicy policy)
    {
        if (name == null) { /* throw */ }
        if (policy == null) { /* throw */ }
        PolicyMap[name] = policy;
    }

    public void AddPolicy(string name, Action<AuthorizationPolicyBuilder> configurePolicy)
    {
        if (name == null) { /* throw */ }
        if (configurePolicy == null) { /* throw */ }

        var policyBuilder = new AuthorizationPolicyBuilder();
        configurePolicy(policyBuilder);
        PolicyMap[name] = policyBuilder.Build();
    }

    public AuthorizationPolicy GetPolicy(string name)
    {
        if (name == null) { /* throw */ }
        
        return PolicyMap.ContainsKey(name) ? PolicyMap[name] : null;
    }

    // ...

}
```

#### 默认策略、回退策略和认证失败钩子

此三个属性较为简单，其中默认策略是要求用户登陆。
```csharp
public class AuthorizationOptions
{
    // ...
    
    public AuthorizationPolicy DefaultPolicy { get; set; } = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
    public AuthorizationPolicy FallbackPolicy { get; set; }

    public bool InvokeHandlersAfterFailure { get; set; } = true;

}
```

## AuthorizationPolicyProvider  

顾名思义，`IAuthorizationPolicyProvider`用于向外部提供`Policy`。根据`Policy`的不同，该接口提供三种调用方式：

- 获取指定名称的`Policy`
- 获取默认的`Policy`
- 获取用于`Fallback`的`Policy`

```csharp
public interface IAuthorizationPolicyProvider
{
    Task<AuthorizationPolicy> GetPolicyAsync(string policyName);    // 获取指定名称的Policy
    Task<AuthorizationPolicy> GetDefaultPolicyAsync();              // 获取默认的Policy
    Task<AuthorizationPolicy> GetFallbackPolicyAsync();             // 获取用于Fallback的Policy
}
```

作为`IAuthorizationPolicyProvider`的默认实现，`DefaultAuthorizationPolicyProvider`会从`DI`容器中获取`AuthorizationOptions`，然后向外部提供特定的`Policy`：
```csharp
public class DefaultAuthorizationPolicyProvider : IAuthorizationPolicyProvider
{
    private readonly AuthorizationOptions _options;
    private Task<AuthorizationPolicy> _cachedDefaultPolicy;
    private Task<AuthorizationPolicy> _cachedFallbackPolicy;

   
    public DefaultAuthorizationPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        if (options == null){ /* throw */ }
        _options = options.Value;
    }
    
    // 返回默认的Policy（优先从本地缓存加载）
    public Task<AuthorizationPolicy> GetDefaultPolicyAsync()
    {
        return GetCachedPolicy(ref _cachedDefaultPolicy, _options.DefaultPolicy);
    }

    // 返回用于Fallback的Policy（优先从本地缓存加载）
    public Task<AuthorizationPolicy> GetFallbackPolicyAsync()
    {
        return GetCachedPolicy(ref _cachedFallbackPolicy, _options.FallbackPolicy);
    }
    
    // 从Options返回指定名称的Policy
    public virtual Task<AuthorizationPolicy> GetPolicyAsync(string policyName)
    {
        return Task.FromResult(_options.GetPolicy(policyName));
    }
    
    private Task<AuthorizationPolicy> GetCachedPolicy(ref Task<AuthorizationPolicy> cachedPolicy, AuthorizationPolicy currentPolicy)
    { /* ... */ }
    
}
```

