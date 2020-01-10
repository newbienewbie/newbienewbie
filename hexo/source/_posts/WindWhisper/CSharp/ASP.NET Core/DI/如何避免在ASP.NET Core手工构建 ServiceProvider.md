---
title: ASP.NET Core 依赖注入 — 如何避免手工构建 Service Provider 实例
date: 2019-12-31 14:47:03
tags:
- IoC
- DI
- 依赖注入
- 控制反转
- ASP.NET Core
- CSharp
categories:
- 风语
- CSharp
- ASP.NET Core
- DI
---

依赖注入是个很好的理念。不过服务的注册都是在启动时（`Startup-time`)完成的。在Host完成启动之前的`Startup::ConfigureServices()`里，我们是没法拿到所注册服务的实例的。如果全盘采用依赖注入，这当然不成问题：服务和服务之间的依赖，可以在动态时刻自动解析。但是，有时候现实并不会那么完美，当配置一些选项的时候，我们可能需要一个具体的实例。有时候这会造成一定的困惑，尤其是当我们需要配合传统的手工`new`一个服务实例的时候（e.g.: `new SomeServiceA(serviceB, serviceC,...)`)。在以前，网上随处可见有人推荐`ServiceCollection.BuilServiceProvider()`然后通过`ServiceProvier.GetRequiredService<ServiceB>()`获取所依赖的服务。

然而，自 ASP.NET Core 3.x 起，如果我们在应用层代码手工调用`ServiceCollection.BuildServiceProvider()`，很可能会得到一条警告消息：

> Warning ASP0000 Calling 'BuildServiceProvider' from application code results in an additional copy of singleton services being created.

这是因为构建新的`ServiceProvider`会导致构建新的服务实例副本，而且这些新的服务实例副本完全独立于原来的服务容器。这往往会造成一些难以发现的Bug，例如这个[Stack Overflow上的这个问题](https://stackoverflow.com/q/58212736/10091607)。

那么如何避免手工创建`ServiceCollection.BuildServiceProvider()`呢？

<!-- more -->

## 普通服务的处理方法

1. 无脑添加服务类型：
```csharp
services.AddSingleton<IServiceA, ServiceB>();
services.AddSingleton<IServiceB, ServiceB>();
```

2. 工厂函数法

有时候上述方法并不可行，我们需要更精细的控制实例的构造过程，这时候可以使用工厂函数来返回一个实例：
```csharp
services.AddSingleton<IServiceA, ServcieA>();
services.AddSingleton<IServiceB>(sp => {
    var svcA = sp.GetRequiredService<IServiceA>();
    return new ServiceB(svcA);
});
```

## Options的处理方法

特别地，针对`Options`，官方提供了[两种注入方法](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options?view=aspnetcore-3.1#use-di-services-to-configure-options)。分别是委托法和配置选项类法。

### 方法一、 委托法
```csharp
services.AddOptions<MyOptions>("optionalName")
    .Configure<Service1, Service2, Service3, Service4, Service5>(
        (o, s, s2, s3, s4, s5) => 
            o.Property = DoSomethingWith(s, s2, s3, s4, s5));
```
这里的`Configure<...>(opts,...)`方法有多种变体，其第一个参数是相关选项，而后的参数分别代表需要通过依赖注入来解析的实例。



一个典型的例子是[SO上这个thread](https://stackoverflow.com/q/59539927/10091607)：OP需要自定义一个`ModelBinderProvider`，并希望向其中注入一个`ILogger`:
```csharp
public class MyOwnModelBinderProvider: IModelBinderProvider
{
    public MyOwnModelBinderProvider(ILogger<MyOwnModelBinderProvider> logger)
    {
       // .. bla bla
    }
}
```
然而，正常情况下，大家添加`ModelBinderProvider`并非是通过依赖注入进行的，而是手工构建:
```csharp
services.AddControllersAndViews(configure => configure.ModelBinderProviders.Insert(
    0, 
    new MyOwnModelBinderProvider(/** WHAT TO PUT HERE? **/)
));
```
问题在于，欲手工构建`MyOwnModelBinderProvider`，必须先拿到`ILogger<MyOwnModelBinderProvider>`实例。然而，`ILogger<MyOwnModelBinderProvider>`是在程序启动之后通过`DI`容器获取的。如何不通过手工构建`IServiceProvider`实例来解决这个问题呢？

其实，追踪一下`ASP.NET Core`的源码实现可以发现，`AddControllersAndViews(configure)`除了添加控制器、视图等相关服务之外，还会配置一个`MvcOptions`选项。在底层，`ASP.NET Core`是通过以下这个方法配置`MvcOptions`的：
```csharp
public static IMvcBuilder AddMvcOptions( this IMvcBuilder builder, Action<MvcOptions> setupAction){
    if (builder == null){ /* throw ...*/ }
    if (setupAction == null){ /* throw ...*/ }

    builder.Services.Configure(setupAction);
    return builder;
}
```
既然`MvcOptions`是通过`Options`模式来配置的，我们就可以使用依赖注入来配置它的细节！于是就有了这样一个[顺理成章的解决办法](https://stackoverflow.com/a/59540037/10091607)：
```csharp
builder.Services.AddOptions<MvcOptions>()
    .Configure<ILoggerFactory>((options, loggerFactory) =>
    {
        options.ModelBinderProviders.Add(new MyOwnModelBinderProvider(loggerFactory));
    });
```


### 方法二、`IConfigureOptions<TOptions>`法：

除了委托法之外，官方还提供了[另外一种方式](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/configuration/options?view=aspnetcore-3.1#use-di-services-to-configure-options)：

> Create your own type that implements `IConfigureOptions<TOptions>` or `IConfigureNamedOptions<TOptions>` and register the type as a service.

显然，这种方式相比于委托法更加重量级。

我们还是以[SO上的一个thread](https://stackoverflow.com/q/53288633/10091607)为例：OP想要根据当前用户的权限的不同，序列化不同的字段给客户端。总体思路是，我们可以自定义一个`DefaultContractResolver`类，判断当前属性是否有相关`Attribute`(例如`[RequireRoleView("HR")]`)，然后通过`UserManager`服务获取当前用户的所有角色，最后通过比对当前用户是否拥有相应的角色来决定是否实例化该字段。

不过，其中一个问题在于，为了自定义如何`JSON`序列化，传统上我们是通过为`JsonOptions`添加`ContractResolver`进行的，而且，尴尬的是，我们往往都是手工构建这个实例的：
```csharp
services.AddMvc().AddJsonOptions(o =>{
    options.SerializerSettings.ContractResolver = new  RoleBasedContractResolver( ??? );
});
```
显然在这里，这种手工`new`的方式是不合适的。解决办法和上面的思路一致，我们可以通过依赖注入来配置`JsonOptions`选项——这里我自定义了一个`IConfigureOptions<MvcJsonOptions>`类：
```csharp
public class MyMvcJsonOptionsWrapper : IConfigureOptions<MvcJsonOptions>
{
    IServiceProvider ServiceProvider;
    public MyMvcJsonOptionsWrapper(IServiceProvider serviceProvider)
    {
        this.ServiceProvider = serviceProvider;
    }
    public void Configure(MvcJsonOptions options)
    {
        options.SerializerSettings.ContractResolver =new RoleBasedContractResolver(ServiceProvider);
    }
}
```
然后将之作为服务注册到`DI`容器即可:
```csharp
services.AddTransient<IConfigureOptions<MvcJsonOptions>,MyMvcJsonOptionsWrapper>();
```