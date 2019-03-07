---
title: BotBuilder 源码通读3 —— 状态管理之 BotState
date: 2019-03-06 20:00:00
tags:
- Bot Framework
- CSharp
categories:
- 风语
- CSharp
- Bot Framework
---


## `BotState`

对于`Bot`而言，根据作用域的不同，可以分为三大块：

- `UserState` ： 特定`Channel`下的特定用户的状态。持久化时的键名为`{ChannelId}/users/{UserId}`
- `ConversationState`：特定`Channel`下的特定会话的状态。持久化时的键名为`{ChannelId}/conversations/{ConversationId`
- `PrivateConversationState`：特定`Channel`下，特定会话的特定用户的状态。持久化时的键名为`{ChannelId}/conversations/{ConversationId}/users/{UserId}`。

这三个类都继承自抽象类`BotState`：

```
                             +----------------+
                             |                |
                             |    BotState    |
                             |                |
                             +-------^-^-^----+
                                     | | |
                                     | | |
                  +------------------+ | +------------------+
                  |                    |                    |
+-----------------+---+    +-----------+-+    +-------------+--------------+
|                     |    |             |    |                            |
|  ConversationState  |    |  UserState  |    |  PrivateConversationState  |
|                     |    |             |    |                            |
+---------------------+    +-------------+    +----------------------------+
```

<!-- more -->

## 状态实现

从实现上说，状态有两层：缓存和持久层。

每次为了修改某个状态的一个属性，如果都直接操作持久层显然并不合适。所以更多时候，我们需要把状态对象加载到缓存中，然后针对缓存进行多次操作，最后再将状态对象持久化之。

这里的状态对象(`CachedBotState`)是以键值对的形式挂到`ITurnContext.TurnState`这个字典对象上的。也即：
```
TurnContext.TurnState["<cache-key>"]
```

其中，不同状态有不同的缓存名，总体而言，它们基本都是以类型名作为键名的：

- `UserState`: `TurnState.Get<CachedBotState><nameof(UserState)>()`
- `ConversationState`: `TurnState.Get<CachedBotState><nameof(ConversationState)>()`
- `PrivateConversationState`: `TurnState.Get<CachedBotState><nameof(PrivateConversationState)>()`



这里的缓存状态对象`CachedBotState`并没有什么复杂的代码，只是对一个字典进行简单地包装：
```csharp
private class CachedBotState
{
    public CachedBotState(IDictionary<string, object> state = null)
    {
        State = state ?? new ConcurrentDictionary<string, object>();
        Hash = ComputeHash(State);
    }

    public IDictionary<string, object> State { get; set; }

    public string Hash { get; set; }

    public bool IsChanged()
    {
        return Hash != ComputeHash(State);
    }

    internal string ComputeHash(object obj)
    {
        return JsonConvert.SerializeObject(obj);
    }
}
```

其实，准确的说，状态对象是`CachedBotState.State`而非缓存状态对象`CachedBotState`。缓存状态对象`CachedBotState`只不过再在状态对象之上提供了一点简单包装，令其可以检测`IsChagned`、`Hash`等信息，仅此而已。

另一方面，对于外部使用用者而言，他们并不知道缓存状态对象类型`CachedBotState`的存在，他们只意识到状态对象(`CachedBotState.State`)。从理解的角度上讲，可以把缓存状态对象当作状态对象(`CachedBotState.State`)。


### 缓存状态属性管理

很多时候，我们并不是要操作整个状态对象，而是要对状态对象的某个属性进行操作。为此，`BotState`暴露了以下一组针对状态属性的访问`API`：

```csharp
    // get a property from the state cache in the turn context.
    protected Task<T> GetPropertyValueAsync<T>(ITurnContext turnContext, string propertyName, CancellationToken cancellationToken = default(CancellationToken))
    {
        // ...
    }

    // Set the value of a property in the state cache in the turn context.
    protected Task SetPropertyValueAsync(ITurnContext turnContext, string propertyName, object value, CancellationToken cancellationToken = default(CancellationToken))
    {
        // ...
    }

    // Deletes a property from the state cache in the turn context.
    protected Task DeletePropertyValueAsync(ITurnContext turnContext, string propertyName, CancellationToken cancellationToken = default(CancellationToken))
    {
        // ...
    }
    
    // Clear all the properties of the state cache in the turn context
    public Task ClearStateAsync(ITurnContext ctx, CancellationToken ct = default(CancellationToken))
    {
        if (ctx == null) { throw new ArgumentNullException(nameof(ctx)); }

        // Explicitly setting the hash will mean IsChanged is always true. And that will force a Save.
        ctx.States[_contextServiceKey] = new CachedBotState { Hash = string.Empty };
        return Task.CompletedTask;
    }
```

这几个`API`非常简单，只是简单地对状态对象的某个属性进行存、取、删操作（注意，这组`API`相对较为底层，全都假设了当前状态对象已经被加载到`ITurnContext`中）。

### 存储层管理：

显然仅在内容中管理状态对象是不够的，我们还需要能将之持久化。`BotFramework v4`对存储层做了基于键名进行读、写、删的抽象，可以根据键名对状态对象进行整体存取：
```csharp
public interface IStorage
{
    Task<IDictionary<string, object>> ReadAsync(string[] keys, CancellationToken cancellationToken = default(CancellationToken));

    Task WriteAsync(IDictionary<string, object> changes, CancellationToken cancellationToken = default(CancellationToken));

    Task DeleteAsync(string[] keys, CancellationToken cancellationToken = default(CancellationToken));
}
```

其中，键名约定如下：
- `UserState` ：存储层键名为`{ChannelId}/users/{UserId}`
- `ConversationState`：存储层键名为`{ChannelId}/conversations/{ConversationId`
- `PrivateConversationState`：存储层键名为`{ChannelId}/conversations/{ConversationId}/users/{UserId}`。

有了存储层的抽象，定义加载、保存、删除状态对象就非常方便了：
```csharp
    public async Task LoadAsync(ITurnContext turnContext, bool force = false, CancellationToken cancellationToken = default(CancellationToken))
    {
        if (turnContext == null) { throw new ArgumentNullException(nameof(turnContext));}

        var cachedState = turnContext.TurnState.Get<CachedBotState>(_contextServiceKey);
        var storageKey = GetStorageKey(turnContext);
        if (force || cachedState == null || cachedState.State == null)
        {
            var items = await _storage.ReadAsync(new[] { storageKey }, cancellationToken).ConfigureAwait(false);
            items.TryGetValue(storageKey, out object val);
            turnContext.TurnState[_contextServiceKey] = new CachedBotState((IDictionary<string, object>)val);
        }
    }

    public async Task SaveChangesAsync(ITurnContext turnContext, bool force = false, CancellationToken cancellationToken = default(CancellationToken))
    {
        if (turnContext == null) { throw new ArgumentNullException(nameof(turnContext)); }

        var cachedState = turnContext.TurnState.Get<CachedBotState>(_contextServiceKey);
        if (force || (cachedState != null && cachedState.IsChanged()))
        {
            var key = GetStorageKey(turnContext);
            var changes = new Dictionary<string, object>
            {
                { key, cachedState.State },
            };
            await _storage.WriteAsync(changes).ConfigureAwait(false);
            cachedState.Hash = cachedState.ComputeHash(cachedState.State);
            return;
        }
    }

    public async Task DeleteAsync(ITurnContext turnContext, CancellationToken cancellationToken = default(CancellationToken))
    {
        if (turnContext == null) { throw new ArgumentNullException(nameof(turnContext)); }

        var cachedState = turnContext.TurnState.Get<CachedBotState>(_contextServiceKey);
        if (cachedState != null)
        {
            turnContext.TurnState.Remove(_contextServiceKey);
        }

        var storageKey = GetStorageKey(turnContext);
        await _storage.DeleteAsync(new[] { storageKey }, cancellationToken).ConfigureAwait(false);
    }
```
