---
layout: post
title: BotBuilder 源码通读1 —— A Big Picture
date: 2019-01-17 21:12:03
tags:
- Bot Framework
- CSharp
categories:
- 风语
- CSharp
- Bot Framework
---


```
+---------------+     +-----------+                                  +---------------+
|               |     |           |                                  |               |
|  ASP.NET Core +----->           |                            +----->  QnA Services |                   
|               <-----+           |                            |     |               |
+---------------+     |           |                            |     +-------------- +
                      |           |                            |     +---------------+
                      |           +-------------+ +--------+   |     |               |
+---------------+     |           |             | |        |   +-----> Luis Services |
|               |     |           |             -->        |   |     |               |
|  ASP.NET Web  +-----> BotAdapter| Middlewares | |  IBot  +--->     +---------------+
|               <-----+           |             <--        |                         
+---------------+     |           |             | |        |   |     +---------------+
                      |           +-------------+ +--------+   |     |               |
+---------------+     |           |                            |     |   ... Other   |
| Console App   |     |           |                            +----->   Connected   |
|     ...       +----->           |                                  |    Services   |
|  other apps   |     |           |                                  |               |
+---------------+     +-----------+                                  +---------------+
```

<!-- more -->


## `IBot`

`IBot`代表了对聊天机器人抽象：
```csharp
public interface IBot
{
    Task OnTurnAsync(ITurnContext turnContext, CancellationToken cancellationToken = default(CancellationToken));
}
```
该接口只有唯一的一个方法`OnTurnAsync(context,ct)`，旨在处理收到的`Activity`。注意:
1. `IBot`并不关心`Activity`是怎么来的，也不关心具体如何发出`Activity`，他只负责处理`TurnContext`。
2. `IBot`并不关心`TurnContext`是如何构建的，这是外层`BotAdapter`的事情
3. `IBot`的`OnTurnAsync(context,ct)`方法并不接收`next`参数，这是因为该接口方法是作为中间件集的最内层（回调函数）调用——这在后文中会解释。

## `BotAdapter`

`BotAdapter`代表聊天机器人和各种`Endpoint Service`之间的适配器。每当收到活动，适配器就会提取必要信息(诸如身份信息之类)，创建相应的聊天上下文`ITurnContext`；然后调用`RunPipelineAsync(context, callback,ct)`触发中间件依次调用，完成之后会回调`IBot`的`OnTurnAsync(context)`；最后，拿到结果，发送给channel。

`BotAdapter`是一个抽象类，提供了三组`API`：

* 中间件注册: 利用`Use()`方法向内部的`MiddlewareSet`属性注册中间件
* 会话流（中间件调用）:`ContinueConversationAsync()`。从本质上说，会话流其实就是中间件调用的过程
* 活动相关的抽象方法：发送`Activity`、更新`Update`、删除`Activity`，均为抽象方法，留待具体的子类实现

**中间件注册**

```csharp
public abstract class BotAdapter
{
    protected MiddlewareSet MiddlewareSet { get; } = new MiddlewareSet();
    
    // ...
    
    // 注册中间件
    public BotAdapter Use(IMiddleware middleware)
    {
        MiddlewareSet.Use(middleware);
        return this;
    }
    
    // ...
}

```

**会话流（中间件调用）**
```csharp
public abstract class BotAdapter
{
    // ...
       
    public virtual Task ContinueConversationAsync(string botId, ConversationReference reference, Func<ITurnContext, Task> callback, CancellationToken cancellationToken)
    {
        using (var context = new TurnContext(this, reference.GetContinuationActivity()))
        {
            return RunPipelineAsync(context, callback, cancellationToken);
        }
    }

    protected async Task RunPipelineAsync(ITurnContext context, BotCallbackHandler callback,  CancellationToken cancellationToken)
    {
        BotAssert.ContextNotNull(context);
        if (context.Activity != null){
            try {
                // 传入callback作为中间件集的最内层
                await MiddlewareSet.ReceiveActivityWithStatusAsync(context, callback, cancellationToken).ConfigureAwait(false);
            } catch (Exception e) {
                // ... 错误处理
            }
        }else {
            if (callback != null){
                await callback(context).ConfigureAwait(false);
            }
        }
    }
}
```
注意：`RunPipelineAsync()`接收一个`BotCallbackHandler`委托类型作为回调参数。其实该委托类型就是`Func<ITurnContext,CancellationToken,Task>`：
```csharp
public delegate Task BotCallbackHandler(ITurnContext turnContext, CancellationToken cancellationToken);
```

**当`BotAdapter`自身中间件全部调用完成后会触发该回调**。事实上，在与`ASP.NET Core`集成时，`IBot::OnTurnAsync()` 方法就是作为回调函数传入`RunPipelineAsync()`的。换言之，**`IBot`的`OnTurnAsync()`是作为中间件集的最内层参与调用的**。


此外，`BotAdapter`还规定了几个抽象方法用于如何处理活动：
```csharp
public abstract class BotAdapter
{
    // 异步地发出活动
    public abstract Task<ResourceResponse[]> SendActivitiesAsync(ITurnContext context, Activity[] activities, CancellationToken cancellationToken);

    // 异步地更新活动
    public abstract Task<ResourceResponse> UpdateActivityAsync(ITurnContext context, Activity activity, CancellationToken cancellationToken);

    // 异步地删除活动
    public abstract Task DeleteActivityAsync(ITurnContext context, ConversationReference reference, CancellationToken cancellationToken);
}
```

这些抽象方法留待继承自`BotAdapter`的子类去实现。借助`BotAdapter`，`Bot`可以独立于具体的服务：比如可以构筑于`Website`之上，借助于`HTTP`传输活动；甚至可以构建于一个控制台适配器之上，例如可能有类似如下的代码：
```csharp
// 创建一个控制台适配器
var adapter = new ConsoleAdapter()    // 自定义的ConsoleAdapter类
    // 为适配器添加中间件
    .Use(/*...*/);

// 创建一个聊天机器人
var echoBot = new EchoBot();

// 连接适配器和机器人 
adapter.ProcessActivity(async (context) => await echoBot.OnTurn(context))
    .Wait();
```
这里的`ProcessActivity()`方法是`ConsoleAdapter`的自定义方法，只是负责构建`OnTurnContext`，该方法会调用具体的`Bot`处理相关逻辑。

### `BotFrameworkAdapter`

上文说到，`IBot`并不关心如何接收`Activity`，也不关心具体如何传输`Activity`，这些工作是外层的`BotAdapter`完成的。具体的适配器还需要根据收到的`Activity`创建`TurnContext`。然后触发中间件调用`RunPipelineAsync(context, callback, cancellationToken)`。比如`BotFrameworkAdapter`作为`BotAdapter`的子类，提供了一个名为`ProcessActivityAsync`的方法:

```csharp
public async Task<InvokeResponse> ProcessActivityAsync(ClaimsIdentity identity, Activity activity, BotCallbackHandler callback, CancellationToken cancellationToken)
{
    using (var context = new TurnContext(this, activity))
    {
        // ...
        await RunPipelineAsync(context, callback, cancellationToken).ConfigureAwait(false);
        // ...
    }
    
    return null;
}
```

可以看到，该`ProcessActivity(id,activity,cb,ct)`方法会根据`Activity`创建`TurnConext`，并转而调用`RunPipelineAsync(ctx,cb,ct)`方法，从而触发中间件调用及`IBot`的`OnTurnAsync()`的执行。

### 与 ASP.NET Core 集成

其实，从上文分析过程中，我们已经发现了与其他应用集成的基本思路：

* 找到`BotAdapter`实现 
* 找到`IBot`实现
* 构建`Activity`，
* 构建`TurnContext`
* 调用`RunPipelineAsync(ctx,cb,ct)`，从而触发`BotAdapter`的各中间件执行及`IBot::OnTurnAsync()`回调


第一步和第二步可以借助于依赖注入实现，所以在`ASP.NET Core`中使用时，要先要注册`IBot`服务；然后再注册`ASP.NET Core`框架的中间件触发`RunPipeline(ctx,cb,ct)`的执行：

```csharp
public void ConfigureServices(IServiceCollection services)
{
     services.AddBot<YourBot>(options =>{
         // ...
     });
}

public void Configure(IApplicationBuilder app, IHostingEnvironment env, ILoggerFactory loggerFactory)
{
    app.UseDefaultFiles()
        .UseStaticFiles()
        .UseBotFramework();
}
```

**`ASP.NET Core`服务注册**

通常在与`ASP.NET Core`集成时，用户需要添加两个服务：

1. `IBot`服务：瞬态的
2. `IAdapterIntegration`服务: 通过`TryAddBotFrameworkAdapterIntegration()`注册一个`IAdapterIntegration`单例工厂`BotFrameworkAdapterSingletonFactory`。该工厂只是简单的创建一个`BotFrameworkAdapter`对象，并`Options`中配置的中间件都注册到其中间件集中。

```csharp
public static IServiceCollection AddBot<TBot>(this IServiceCollection services, Func<IServiceProvider, TBot> botFactory, Action<BotFrameworkOptions> configureAction = null)
    where TBot : class, IBot
{
    if (services == null) {/* throw  */}
    if (botFactory == null) {/* throw  */}

    if (configureAction != null) {
        services.Configure(configureAction);
    }

    return services
        .TryAddBotFrameworkAdapterIntegration()
        .AddTransient<IBot>(botFactory);
}

private static BotFrameworkAdapter BotFrameworkAdapterSingletonFactory(IServiceProvider serviceProvider)
{
    var options = serviceProvider.GetRequiredService<IOptions<BotFrameworkOptions>>().Value;
    var logger = serviceProvider.GetRequiredService<ILogger<IAdapterIntegration>>();

    var botFrameworkAdapter = new BotFrameworkAdapter(
        options.CredentialProvider,
        options.ChannelProvider,
        options.ConnectorClientRetryPolicy,
        options.HttpClient,
        null,
        logger)
    {
        OnTurnError = options.OnTurnError,
    };

    foreach (var middleware in options.Middleware)
    {
        botFrameworkAdapter.Use(middleware);
    }

    return botFrameworkAdapter;
}
```

**`ASP.NET Core`中间件调用**

`app.UseBotFramework()`的核心是针对特定`path`的请求进行处理：
```csharp
public static IApplicationBuilder UseBotFramework(this IApplicationBuilder applicationBuilder)
{
    // ...
    
    applicationBuilder.Map(
        paths.BasePath + paths.MessagesPath,
        botAppBuilder => botAppBuilder.Run(new BotMessageHandler().HandleAsync)
    );
}
```
而`BotMessageHandler`只是简单地根据当前`HttpContext.Request`构建`Activity`；并通过依赖注入，索取`BotAdapter`服务及`IBot`服务；再把`IBot::OnTurnAsync(context,ct)`方法作`BotAdapter`的中间件的回调执行。

