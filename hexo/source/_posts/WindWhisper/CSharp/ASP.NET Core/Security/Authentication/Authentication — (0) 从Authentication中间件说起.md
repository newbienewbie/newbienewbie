---
layout: post
title: Authentication — (0) 从Authentication中间件说起
date: 2019-08-14 21:10:03
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

`ASP.NET Core`认证相关的代码比较分散，主要涉及三个项目仓库：
1. [HTTP Abstractions](https://github.com/aspnet/AspNetCore/tree/master/src/Http/Http.Abstractions)项目，即以前的[aspnet/HttpAbstractions](https://github.com/aspnet/HttpAbstractions)仓库。在这个仓库中，包含了一些与认证相关的高层接口和与框架安全相关的核心概念。
2. [Security](https://github.com/aspnet/AspNetCore/tree/master/src/Security)项目，即之前的[aspnet/Security](https://github.com/aspnet/Security)仓库。这个仓库中定义了与认证相关的一些基本实现，并内置了一些常见的认证模式、认证处理器。
3. [Identity](https://github.com/aspnet/AspNetCore/tree/master/src/Identity)项目，即之前的[aspnet/Identity](https://github.com/aspnet/Identity)。这个仓库是`ASP.NET Core Identity`框架的实现。本系列的笔记不会对其做过多的源码分析，这里只作为一种认证模式介绍。

去年8月份，我在阅读`ASP.NET Core`认证相关的源码后，陆陆续续在有道云笔记中记录了8篇笔记(系列)：

0. Authentication — (0) 从Authentication中间件说起
1. Authentication — (1) 基本概念.md
2. Authentication — (2) 认证服务及其对HttpContext的认证扩展方法
4. Authentication — (3.1) 认证处理器的实现之AuthenticationHandler抽象基类
5. Authentication — (3.2) 认证处理器的实现之JwtBearerHandler
6. Authentication — (3.3) 认证处理器的实现之RemoteAuthenticationHandler
7. Authentication — (4) Authentication服务的配置与构建
8. Authentication — (5) 如何自定义认证处理器

（一点题外话：*最近这大半年，我几乎都只在有道云上记录笔记(PC端+App+网页版)。不过最近我在修改笔记的过程中发现，有道云笔记网页版经常会发生笔记相互覆盖的情况。最恼火的是，一旦修改了标题，连历史记录也一并丢失了！这种情况已经出现我身上数次了。基于此，我以后记笔记的策略是：有道云做初稿，随时记录想法；整理完成后提交公众号发布，由于公众号有良好的CDN网络，供平时阅读和温习；最后使用个人网站作为终极备份*）

随着`ASP.NET Core`的发展，之前的三个仓库在去年已经被存档，目前新的项目都位于`ASP.NET Core`中心仓库下。为了表述方便，这个系列的源码分析文章对老仓库和新项目位置不做过多区分。

中间件`AuthenticationMiddleware`是理解`ASP.NET Core`认证的入口，尽管搞懂这块需要很多基本知识，作为总纲式的知识，我还是选择把它作为第一篇讲述。<!-- more -->
随后的两篇笔记分别讲述了一些与认证相关的基础类与接口，以及在其基础之上形成的认证服务类。这两篇笔记只是讲述各个类在认证过程中扮演的角色，内容枯燥乏味，犹如流水账一般。但是这块知识是阅读后续第三部分实现的基本前提。
这个系列笔记的第三部分主要讲述各种认证处理器的实现。这部分是与认证相关的源码分析的核心。
第四部分则记录`Authentication`服务配置与构建的背后原理。
作为收尾，最后一篇笔记以如何自定义一个认证处理器结束这个系列的源码分析。

我会在下一篇笔记讲述认证处理器的基本概念，并在后续的数篇笔记中解释认证处理器是如何工作的。这篇源码笔记的目的是分析**认证过程是如何和一个HTTP请求联系起来的**。

## 认证中间件

要想得到正确的`Context.User`，必须先注册相关认证服务，然后在合适的位置启用认证中间件：
```
app.UseAuthentication();  // 必须启用于相关中间件之前
// ...
app.UseMvc(routes =>{
    ...
});
```

对于每一个请求, `AuthenticationMiddleware`中间件都会尝试对当前用户进行认证，这里的认证工作主要通过认证处理器（`AuthenticationHandler`)来进行。

中间件[`AuthenticationMiddleware`](https://github.com/aspnet/Security/blob/26d27d871b7992022c082dc207e3d126e1d9d278/src/Microsoft.AspNetCore.Authentication/AuthenticationMiddleware.cs#L11-L63) 的核心源码为：

```csharp
public async Task Invoke(HttpContext context)
{
    context.Features.Set<IAuthenticationFeature>(new AuthenticationFeature
    {
        OriginalPath = context.Request.Path,
        OriginalPathBase = context.Request.PathBase
    });

    // Give any IAuthenticationRequestHandler schemes a chance to handle the request
    var handlers = context.RequestServices.GetRequiredService<IAuthenticationHandlerProvider>();
    foreach (var scheme in await Schemes.GetRequestHandlerSchemesAsync())
    {
        var handler = await handlers.GetHandlerAsync(context, scheme.Name) as IAuthenticationRequestHandler;
        if (handler != null && await handler.HandleRequestAsync())
        {
            return;
        }
    }

    var defaultAuthenticate = await Schemes.GetDefaultAuthenticateSchemeAsync();
    if (defaultAuthenticate != null)
    {
        var result = await context.AuthenticateAsync(defaultAuthenticate.Name);
        if (result?.Principal != null)
        {
            context.User = result.Principal;
        }
    }

    await _next(context);
}
```
这段中间件源码的基本逻辑非常简单：首先遍历所有中间件级别的认证模式，并逐一尝试把相应的认证处理器转换成`IAuthenticationRequestHandler`接口，然后调用其`HandleRequestAsync()`方法(如果返回`true`，则表示当前需要中断后续所有中间件的请求处理)。如果之前的中间件级别的处理并未截断后续处理，则尝试使用默认的认证模式对用户进行认证。

所谓中间件级别的认证，是指可以中断后续请求处理过程的认证。比如对于一些`OAuth2.0`的认证模式，需要根据当前是否是远程授权成功后的回调请求来中断后续的中间件处理。这些细节都会在后续几篇源码分析笔记中详细阐述，下一篇主要介绍与认证处理器相关的几个基础类。

