---
title: BotBuilder 源码通读2 —— 中间件的实现
date: 2019-01-30 22:00:00
tags:
- Bot Framework
- CSharp
categories:
- 风语
- CSharp
- Bot Framework
---

`BotBuilder`的中间件非常简单，从实现上说，这里的中间件全部都是基于接口的中间件，并不存在基于约定的中间件。

## 中间件接口

`BotBuilder`中间件接口本身非常简单，只有一个方法`OnTurnAsync(context,next,cancelToken)`用于处理收到的`Activity`。

```csharp
public interface IMiddleware
{
    Task OnTurnAsync(ITurnContext context, NextDelegate next, CancellationToken cancellationToken = default(CancellationToken));
}
```

而所谓`NextDelegate`，也非常简单：
```csharp
 public delegate Task NextDelegate(CancellationToken cancellationToken);
```
含义是调用下一个中间件的`OnTurnAsync(ctx,next,ct)`方法。

## 中间件链式调用

`Bot Framework`支持添加一组中间件。为此，我们需要一个中间件集类：
```csharp
public class MiddlewareSet : IMiddleware
{
    private readonly IList<IMiddleware> _middleware = new List<IMiddleware>();

    public MiddlewareSet Use(IMiddleware middleware)
    {
        _middleware.Add(middleware);
        return this;
    }


    // 处理收到的Activity
    public async Task OnTurnAsync(ITurnContext context, NextDelegate next, CancellationToken cancellationToken)
    {
        await ReceiveActivityInternalAsync(context, null, 0, cancellationToken).ConfigureAwait(false);
        await next(cancellationToken).ConfigureAwait(false);
    }


    private Task ReceiveActivityInternalAsync(ITurnContext context, Func<ITurnContext, Task> callback, int nextMiddlewareIndex, CancellationToken cancellationToken)
    {
        // 如果已经到达最后一个中间件，则触发回调！
        if (nextMiddlewareIndex == _middleware.Count)
        {
            return callback?.Invoke(context) ?? Task.CompletedTask;
        }

        // 获取下一个中间件
        var nextMiddleware = _middleware[nextMiddlewareIndex];

        // 执行下一个中间件，并给出NextDelegate委托，令后续的中间件可以得到调用
        return nextMiddleware.OnTurnAsync(
            context,
            (ct) => ReceiveActivityInternalAsync(context, callback, nextMiddlewareIndex + 1, ct),
            cancellationToken);
    }
    
    // ...
}
```

此类的核心原理是这个私有的`ReceiveActivityInternalAsync()`方法——通过指定索引，调用特定的中间件，并且，把继续调用下一个中间件的`Lambda`表达式作为`next`参数（`NextDelegate`类型）传递给相应的中间件；一旦`next`发生调用，则就会触发下一个中间件执行。

注意：中间件集`MiddlewareSet`实现了`IMiddleware`接口，这非常类似于设计模式中所常见的组合模式。正是有了这样的设计，我们可以把一组中间件当作一个中间件来使用 —— 只需要触发对外暴露的`OnTurnAsync(ctx,cb,ct)`方法，就会触发内部各中间件的依次执行。