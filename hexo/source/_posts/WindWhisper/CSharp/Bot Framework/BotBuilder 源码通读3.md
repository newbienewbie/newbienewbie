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

本质上，`BotState`并不是状态，而是状态管理器。状态可以被抽象为一个`IDictionary<string,object>`型对象，而状态管理器是可以对某个状态进行存、取、删的管理器，更具体的，状态管理器还可以对某个状态的某个属性进行存、取、删操作。

* 状态是`IDictionary<string,object>`型对象，一个程序可以包含有任意多种类型的状态，常见的状态分类**会话状态**、**用户状态**、和**私有会话状态**
* 状态属性是某个状态下的一个属性，还是一个`IDictionary<string,object>`类型的对象，一个状态可以包含任意多的属性。
* 类`BotState`及其实现`ConversationState`类、`UserState`类等均是**针对某种具体状态的管理器**。其中嵌入了一个`IStorage`对象，在此基础之上，状态管理器可以从持久层加载特定的状态、可以删除特定的状态，还可以保存特定的状态到持久层。比如`ConversationState`是针对会话状态的管理器，负责对会话状态及会话状态的属性进行存、取、删；而`UserState`则是针对用户状态的管理器，负责对用户状态及用户状态的属性进行存、取、删；
* 状态属性访问器是隐含了

<!-- more -->

## 状态管理器的实现

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

其实，准确的说，状态对象是`CachedBotState.State`(类型是`IDictionary<string,object>`)而非缓存状态对象`CachedBotState`。缓存状态对象`CachedBotState`只不过再在状态对象之上提供了一点简单包装，令其可以检测`IsChagned`、`Hash`等信息，仅此而已。

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
