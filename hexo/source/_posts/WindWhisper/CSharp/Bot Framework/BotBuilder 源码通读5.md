---
layout: post
title: BotBuilder 源码通读5 —— 对话建模与实现1
date: 2019-03-20 20:02:00
tags:
- Bot Framework
- CSharp
categories:
- 风语
- CSharp
- Bot Framework
---



## `Dialog`

`BotBuilder`中的`Dialog`变迁历史是相当复杂的。`v4`版本之初，曾有过`IDialog`相关接口；后来出于一些原因，官方删除了这个接口；而在较新的[`ComposableDialog`分支](https://github.com/Microsoft/botbuilder-dotnet/tree/ComposableDialog)中，官方又引入了一个新的`IDialog`接口。本篇笔记以目前的`v4.1`版(`stable`)作为基础，并不涉及新的`IDialog`接口。


`v4.1`版本中的`Dialog` 是所有 `dialog` 的基类，大致公开以下几个属性和方法：
```
+-----------------------------------------+
|                                         |
|                 Dialog                  |
|                                         |
+-----------------------------------------+
|  Id                                     |
+-----------------------------------------+
|  BeginDialogAsync(dc,opt,ct)            |
|  ContinueDialogAsync(dc,ct)             |
|  ResumeDialogAsync(dc,reason,result,ct) |
|  RepromptDialogAsync(tc,instance,ct)    |
|  EndDialogAsync(tc,instance,reason,ct)  |
+-----------------------------------------+
```

从效果上讲，`Dialog`是对“对话”的抽象：一个`Dialog`便是一次对话；在一个对话进行期间，可以开启其他子对话，待子对话完成后会“恢复”父对话的处理。这个过程如同栈一样。
可以把`Dialog`类比作一个函数：定义一个`Dialog`类似于定义某种函数；`Dialog`的执行过程类似于函数的调用过程，`Dialog`的嵌套执行也类似于函数的嵌套调用。<!-- more -->
```csharp
public abstract class Dialog
{
    public static readonly DialogTurnResult EndOfTurn = new DialogTurnResult(DialogTurnStatus.Waiting);
    private IBotTelemetryClient _telemetryClient;

    public Dialog(string dialogId)
    {
        if (string.IsNullOrWhiteSpace(dialogId))
        {
            throw new ArgumentNullException(nameof(dialogId));
        }

        _telemetryClient = NullBotTelemetryClient.Instance;
        Id = dialogId;
    }

    public string Id { get; }

    /// <summary>
    /// Gets or sets the telemetry client for logging events.
    /// </summary>
    /// <value>The Telemetry Client logger.</value>
    public IBotTelemetryClient TelemetryClient
    {
        get {return _telemetryClient;}

        set{ _telemetryClient = value; }
    }


    public abstract Task<DialogTurnResult> BeginDialogAsync(DialogContext dc, object options = null, CancellationToken cancellationToken = default(CancellationToken));


    public virtual async Task<DialogTurnResult> ContinueDialogAsync(DialogContext dc, CancellationToken cancellationToken = default(CancellationToken))
    {
        // By default just end the current dialog.
        return await dc.EndDialogAsync(cancellationToken).ConfigureAwait(false);
    }

    public virtual async Task<DialogTurnResult> ResumeDialogAsync(DialogContext dc, DialogReason reason, object result = null, CancellationToken cancellationToken = default(CancellationToken))
    {
        // By default just end the current dialog and return result to parent.
        return await dc.EndDialogAsync(result, cancellationToken).ConfigureAwait(false);
    }

    public virtual Task RepromptDialogAsync(ITurnContext turnContext, DialogInstance instance, CancellationToken cancellationToken = default(CancellationToken))
    {
        // No-op by default
        return Task.CompletedTask;
    }

    public virtual Task EndDialogAsync(ITurnContext turnContext, DialogInstance instance, DialogReason reason, CancellationToken cancellationToken = default(CancellationToken))
    {
        // No-op by default
        return Task.CompletedTask;
    }
}
```

`Dialog`类几个最关键的方法的作用为:
* `BeginDialogAsync(dc, options, ct)`：启动对话框，负责对话框的初始化工作。比如新建`DialogState`、向客户端发送询问消息等。
* `ContinueDialogAsync(dc, ct)`：当收到消息后，需要继续执行的工作。比如获取当前`DialogState`，根据具体逻辑继续执行甚至结束对话框调用等
* `ResumeDialogAsync(dc,dialogReason,result,ct)`：通常表示当从子对话调用返回时，需要做的工作，这里的`result`参数就是子对话输出的结果。
* `EndDialogAsync(tc, dialogInstance, dialogReason, ct)`：结束对话框时需要做的清理工作。


需要说明的是，就跟函数定义一样，`Dialog`类只是定义了处理逻辑，处理逻辑本身并无状态。在程序中，我们通常需要反复、或者并行执行某个函数，在运行时，这会在栈上保存数据，函数多次的反复执行，并不会影响函数的定义本身。

## `DialogInstance` 和 `DialogState`

在程序中，每次函数执行，栈上某个函数帧对应中的内存都可以用来保存该函数执行过程中的状态，这里与函数帧等价的概念是便是`DialogInstance`。`DialogInstance`表示某个`Dialog`的某一次具体执行——或者说，是表示某个对话`Dialog`的实例：
```csharp
public class DialogInstance
{
    public string Id { get; set; }
    public IDictionary<string, object> State { get; set; }
}
```

为了引用某个`Dialog`，我们可以单纯使用对话名`Dialog.Id`属性——类似于函数名（标识符）。

而与函数栈等价的概念则是对话栈——表达了对话之间的调用顺序，保存在数据结构`DialogState.DialogStack`中——这是用一个`List<DialogInstance>`列表模拟的栈。

```csharp
public class DialogState
{
    public DialogState() : this(null){ }

    public DialogState(List<DialogInstance> stack)
    {
        DialogStack = stack ?? new List<DialogInstance>();
    }

    public List<DialogInstance> DialogStack { get; }
}
```
这里的`DialogState`是个很关键的概念，注意它保存的状态其实是一个`DialogInstance`列表，其中`DialogIntance`内部存储的也都是字符串、和一个简单字典对象——这些类型令`DialogState`易于实现持久化。**如果我们能处理好它的序列化和反序列化问题，我们就可以中断对话流的执行，然后再在某个时间点再恢复执行**。这给了我们流程化执行、中断、回复执行的能力。

## `DialogSet`

函数的互相调用是由编译器来帮我们完成的，要调用一个函数，我们需要只需要一个函数名（标识符）即可。为了书写简单、维护方便，许多编程语言都会以模块化的方式对函数定义进行组织。这里`DialogSet`的作用有点类似于 **模块**，`DialogSet`内的`Dialog`可以用`Dialog.Id`作为标识符互相调用。

`DialogSet`提供了注册`Dialog`、和查找`Dialog`的功能：
```csharp
public class DialogSet
{
    private IDictionary<string, Dialog> _dialogs;

    public IDialog Add(string dialogId, Dialog dialog)
    {
        if (string.IsNullOrEmpty(dialogId))
            throw new ArgumentNullException(nameof(dialogId));
        if (dialog == null)
            throw new ArgumentNullException(nameof(dialog));

        if (_dialogs.ContainsKey(dialogId))
        {
            throw new Exception($"DialogSet.add(): A dialog with an id of '{dialogId}' already added.");
        }
        return _dialogs[dialogId] = dialog;
    }

    public Waterfall Add(string dialogId, WaterfallStep[] steps)
    {
        if (string.IsNullOrEmpty(dialogId))
            throw new ArgumentNullException(nameof(dialogId));
        if (steps == null)
            throw new ArgumentNullException(nameof(steps));

        var waterfall = new Waterfall(steps);
        Add(dialogId, waterfall);
        return waterfall;
    }

    public IDialog Find(string dialogId)
    {
        if (string.IsNullOrEmpty(dialogId))
            throw new ArgumentNullException(nameof(dialogId));

        Dialog result;
        if (_dialogs.TryGetValue(dialogId, out result))
        {
            return result;
        }
        return null;
    }
    
    // ...
}
```

此外，`DialogSet`还提供了一个极其简单的帮助方法，用于根据当前`DialogSet`和一个`DialogState`，`new`一个对话上下文(`DialogContext`)
```csharp
    
    public DialogContext CreateContext(ITurnContext context, IDictionary<string, object> state)
    {
        // ... check null

        return new DialogContext(this, context, state);
    }
```
在`4.2`之后，`Bot Framework`让`DialogSet`的构造函数接受一个`IStatePropertyAccessor<DialogState>`对象。这样一来，`CreateContext(turnContext,dialogState)`方法就可以少传入一个参数，因为可以通过该访问器拿到`DialogState`。也就是说，在`4.2`之后，可以用如下方式构建`DialogContext`：

```csharp
var dialogStatePropertyAccessor = this.conversationState.CreateProperty<DialogState>("DialogState");

var dialogSet = new DialogSet(dialogStatePropertyAccessor);
dialogSet.Add(mainDialog);

var dialogContext = await dialogSet.CreateContextAsync(turnContext,cancellationToken);
```

## 对话执行控制与`DialogContext`

有了以上的抽象，我们已经可以实现`Dialog`的执行、中断、恢复执行等功能了。

`DialogTurnStatus`表示当前对话栈的状态：空态、等待态、完成态、取消态（并且无对话）。
```csharp
public enum DialogTurnStatus { Empty, Waiting, Complete, Cancelled, }
```

仅使用一个枚举来反映对话栈状态是不够的，对话完成后，可能还要一个`Result`来表示结果：
```csharp
public class DialogTurnResult
{
    public DialogTurnResult(DialogTurnStatus status, object result = null)
    {
        Status = status;
        Result = result;
    }

    public DialogTurnStatus Status { get; set; }

    public object Result { get; set; }
}
```

`DialogContext`封装了对话执行控制的相关功能：

其中有三个基础的公开属性，分别是对`ITurnContext`、`DialogSet`及`DialogState`的引用。这三个字段使用构造函数进行初始化：
```csharp
    internal DialogContext(DialogSet dialogs, ITurnContext turnContext, DialogState state)
    {
        Context = turnContext ?? throw new ArgumentNullException(nameof(turnContext));
        Dialogs = dialogs ?? throw new ArgumentNullException(nameof(dialogs));
        Stack = state.DialogStack;
    }
```

最后，`DialogContext`还提供有以下属性及方法用于控制流程：

1. `ActiveDialog`属性用于返回当前栈顶`DialogInstance`
2. `BeginDialogAsync(dialogId, opts, ct)`方法用于调用一个新的`Dialog`：也即把一个新的`DialogInstance`压入栈中，然后通过`Dialog::BeginDialogAsync()`方法“激活”该`Dialog`的执行。此方法返回一个`Task<DialogTurnResult>` 。
3. `ContinueDialogAsync(dc, ct)`方法用于对话栈的无脑继续继续执行。也即**找到栈顶`Dialog`，通过`Dialog::ContinueDialogAsync(this, ct)`方法继续执行`Dialog`**；如果当前栈为空，则直接返回一个`new DialogTurnResult(DialogTurnStatus.Empty)`
4. `EndDialogAsync(result,ct)`: 先弹出当前栈顶`Dialog`；要是栈中还有`Dialog`，则说明存在上一级调用，此时再通过`Dialog::ResumeDialogAsync(this, DialogReason.EndCalled, result, ct)`恢复执行`Dialog`；要是栈为空，则直接返回`new DialogTurnResult(DialogTurnStatus.Complete, result);`
5. `CancelAllDialogsAsync(ct)`：要是栈不为空，则逐一调用各`Dialog::EndDialogAsync(Context,instance,reason,ct)`方法；否则返回直接返回一个`new DialogTurnResult(DialogTurnStatus.Empty);`
6. `ReplaceDialogAsync(dialogId, opts = null, ct)`：用一个全新的`Dialog`替换当前栈顶`Dialog`。
7. `PromptAsync(dialogId, opts, ct)`: 强类型版本的`BeginDialogAsync(dialogId,opts,ct)`，仅此而已。
8. `RepromptDialogAsync(ct)`: 调用当前栈顶`Dialog`的`RepromptDialogAsync(Context, ActiveDialog, ct)`。

这其中最重要的方法是以下三个方法：
1. `BeginDialogAsync(dialogId,opts,ct)`: 把新的对话压入栈中，调用一个新对话
2. `ContinueDialogAsync(dc,ct)`：如前文所述，这个方法用于对话栈的无脑执行：每次处理消息，其实都是在调用的这个方法；倘若调用后发现这个此方法返回的结果指示当前是一个空栈，则意味着可能需要`BeginDialogAsync(dialogId)`来开始一个新的对话。
3. `EndDialogAsync(result,ct)`：这个方法实际上做了两件事，一是结束当前栈顶对话并弹出，也即执行当前栈顶对话的`dialog.EndDialogAsync(ctx,instance,reason,ct)`方法后移除当前栈顶对话；二是在栈顶会话结束并弹出后，恢复上一级父会话的执行 `dialog.ResumeDialogAsync(this,DialogReason.EndCalled,result,ct)`。

这三个方法是如此的重要，以至于官方的`Sample`中添加如下的扩展方法来让我们的对话执行更加无脑:
```csharp
public static async Task Run(this Dialog dialog, ITurnContext turnContext, IStatePropertyAccessor<DialogState> accessor, CancellationToken cancellationToken = default(CancellationToken))
{
    var dialogSet = new DialogSet(accessor);
    dialogSet.Add(dialog);

    var dialogContext = await dialogSet.CreateContextAsync(turnContext, cancellationToken);
    var results = await dialogContext.ContinueDialogAsync(cancellationToken);
    if (results.Status == DialogTurnStatus.Empty)
    {
        await dialogContext.BeginDialogAsync(dialog.Id, null, cancellationToken);
    }
}
```
