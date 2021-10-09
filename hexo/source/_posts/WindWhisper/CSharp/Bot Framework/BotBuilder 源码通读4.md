---
layout: post
title: BotBuilder 源码通读4 —— 状态管理之状态属性访问器
date: 2019-03-07 22:10:00
tags:
- Bot Framework
- CSharp
categories:
- 风语
- CSharp
- Bot Framework
---


上文说到，`BotState`基类提供了几个若干方法来管理缓存和持久层。但是这些方法使用起来并不方便。
比如调用`GetPropertyValueAsync<T>(ctx,prop)`方法，用户需要关心缓存是否已经加载到`ITurnContext.TurnState[prop]`中，同样的情况也会发生于`DeletePropertyValueAsync(ctx, prop)`、`SetPropertyValueAsync(ctx,prop)`和`ClearStateAsync(ctx)`方法上。

每次都通过`BotState`来load状态、然后尝试根据一个字符串来读取/删除/设置某个`PropertyValue`，这种方式对于开发者而言过于啰嗦，于是，`BotState`还提供了一个方法来简化我们的代码——`IStatePropertyAccessor<T>`：状态属性访问器——用于对内存中的状态属性进行存取操作。
```csharp
public abstract class BotState : IPropertyManager
{
    // ...
    
    public IStatePropertyAccessor<T> CreateProperty<T>(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentNullException(nameof(name));
        }

        return new BotStatePropertyAccessor<T>(this, name);
    }
}
```
`BotState`可以通过`CreateProperty<T>(string name)`方法返回一个`IStatePropertyAccessor<T>`对象。这里，`IStatePropertyAccessor<T>`代表了可以对状态属性进行读、写、删的访问器：<!-- more -->
```csharp
public interface IStatePropertyAccessor<T> : IStatePropertyInfo
{

    Task<T> GetAsync(ITurnContext turnContext, Func<T> defaultValueFactory = null, CancellationToken cancellationToken = default(CancellationToken));

    Task DeleteAsync(ITurnContext turnContext, CancellationToken cancellationToken = default(CancellationToken));

    Task SetAsync(ITurnContext turnContext, T value, CancellationToken cancellationToken = default(CancellationToken));
}
```

其中，`BotStatePropertyAccessor<T>`存取器代码为：
```csharp
private class BotStatePropertyAccessor<T> : IStatePropertyAccessor<T>
{
    private BotState _botState;

    public BotStatePropertyAccessor(BotState botState, string name)
    {
        _botState = botState;
        Name = name;
    }

    /// <summary>
    /// Gets name of the property.
    /// </summary>
    public string Name { get; private set; }


    public async Task DeleteAsync(ITurnContext turnContext, CancellationToken cancellationToken)
    {
        await _botState.LoadAsync(turnContext, false, cancellationToken).ConfigureAwait(false);
        await _botState.DeletePropertyValueAsync(turnContext, Name, cancellationToken).ConfigureAwait(false);
    }

    public async Task<T> GetAsync(ITurnContext turnContext, Func<T> defaultValueFactory, CancellationToken cancellationToken)
    {
        await _botState.LoadAsync(turnContext, false, cancellationToken).ConfigureAwait(false);
        try
        {
            return await _botState.GetPropertyValueAsync<T>(turnContext, Name, cancellationToken).ConfigureAwait(false);
        }
        catch (KeyNotFoundException)
        {
            // ask for default value from factory
            if (defaultValueFactory == null)
            {
                throw new MissingMemberException("Property not set and no default provided.");
            }

            var result = defaultValueFactory();

            // save default value for any further calls
            await SetAsync(turnContext, result, cancellationToken).ConfigureAwait(false);
            return result;
        }
    }

    public async Task SetAsync(ITurnContext turnContext, T value, CancellationToken cancellationToken)
    {
        await _botState.LoadAsync(turnContext, false, cancellationToken).ConfigureAwait(false);
        await _botState.SetPropertyValueAsync(turnContext, Name, value, cancellationToken).ConfigureAwait(false);
    }
}

```

可以看到，用户只要简单的`Get()`、`Set()`即可完成数据存取操作，不再劳心当前缓存对象是否存在，也不需要事先手工加载缓存。

不过，需要注意的是，这个`IStatePropertyAccessor<T>`的存、取、删操作只是针对缓存而言的，并不会自动持久化。
