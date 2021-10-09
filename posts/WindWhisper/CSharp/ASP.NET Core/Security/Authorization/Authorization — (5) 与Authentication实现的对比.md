---
layout: post
title: Authorization — (5) 授权与认证的实现对比
date: 2019-12-12 00:46:00
tags:
- ASP.NET Core
- Authorization
- Authentication
- CSharp
- 源码分析
categories:
- 风语
- CSharp
- ASP.NET Core
- Security
- Authorization
---


## 概念对比

|   | Authentication   | Authorization   |
|---|---|---|---|---|
|全局选项| `AuthenticationOptions` | `AuthorizationOptions` |
| 模式/策略  | `AuthenticationScheme`:  <br> &nbsp;&nbsp; - `Name`,<br> &nbsp;&nbsp; - `HandlerType`<br>   | `AuthorizationPolicy`: <br> &nbsp;&nbsp; - `AuthenticationSchemes`,<br> &nbsp;&nbsp;  - `Requirements`<br>   |
| 模式/策略Provider|  `IAuthenticationSchemeProvider` <br> `AuthenticationSchemeProvider` | `IAuthorizationPolicyProvider` <br> `DefaultAuthorizationPolicyProvider`  |   |   |
| 具体模式/策略细节  | `AuthenticationSchemeOptions`  | `IRequirement`  |   |   |
| 具体模式/策略Handler |  `IAuthenticationHandler` <br> `AuthenticationHandler<SomeSchemeOptions>`  | `IAuthorizationHandler` <br>`Authorization<SomeRequirement>`    | 
| HandlerProvider  |  `IAuthenticationHandlerProvider`<br> `AuthenticationHandlerProvider` | `IAuthorizationHandlerProvider` <br> `DefaultAuthorizationHandlerProvider`   | 
| 服务  |  `IAuthenticationService`<br> `AuthenticationService` | `IAuthorizationService`<br> `DefaultAuthorizationService` |   

<!-- more -->

### 配置过程对比

针对`Authentication`的配置过程，如：
```csharp
services.AddAuthentication(options =>{
    ...
}) // 返回一个AuthenticationBuilder
    .AddScheme<SomeSchemeOptions,SomeAuthenticationHandler>(name,opts=>{ ... })
    .AddCookie(name, opts =>{ ... })
    .AddJwtBearer(name, opts =>{ ... }
    ...
;
```
其实是在配置全局的`AuthenticationOptions`。他们都会在内部调用`AddSchemeHelper<TOptions,THandler>(name,configurer)` 会配置全局的AuthenticationOptions，向其中添加`<schemeName>-<handlerType>`的映射关系。

类似的，`Authorization`的配置过程其实就是配置`AuthorizationOptions`的过程，如： 
```csharp
services.AddAuthorization(options =>
{
    options.AddPolicy("policy1", policyBuilder => { 
        policyBuilder.Requirements.Add(new MyRequirement());
        // ...
    } );
    options.AddPolicy("policy2", policyBuilder => { 
        policyBuilder.RequireAssertion(ctx =>{
            ... return true;
            ... return false;
        });
    });
    ... // other policies
});
```
和可以添加多种`AuthenticationScheme`一样，我们可以为`AuthorizationOptions`添加多个`Policy`。不过这里每个`Policy`中可以有多个`Requirements`和`AuthenticationSchemes`。此外，和`Authentication.AddScheme<TOptions,THandler>(...)`不同，可以观察到这里的配置过程对某个`Requirement`对应的`AuthorizationHandler`一无所知，所以也无法把特定的`AuthorizationHandler`自动注册为服务——这也是开发者需要手工注册`AuthorizationHandler`服务的根本原因。
