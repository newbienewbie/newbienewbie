---
title: BotBuilder 源码通读6 —— 对话建模与实现2
date: 2019-05-30 20:38:50
tags:
- Bot Framework
- CSharp
categories:
- 风语
- CSharp
- Bot Framework
---

上一篇关于[`BotBuilder`对话建模](/blog/2019/03/20/WindWhisper/CSharp/Bot%20Framework/BotBuilder%20%E6%BA%90%E7%A0%81%E9%80%9A%E8%AF%BB5/)的博文中讲述了对话建模的一些基本思想和工作原理。这一篇作为补充，记录几个具体的对话类作用。

## `Prompt`

`Prompt<T>`类对话是最为基础的一类`Dialog`。这类`Dialog`无非就是询问用户、提示用户输入，并对用户输入的结果予以检验。比如`Prompt<T>::ContinueDialogAsync()`方法实现为：
```csharp
public override async Task<DialogTurnResult> ContinueDialogAsync(DialogContext dc, CancellationToken cancellationToken = default(CancellationToken))
{
    if (dc == null) { /* throw */ }
    // Don't do anything for non-message activities
    if (dc.Context.Activity.Type != ActivityTypes.Message) { return EndOfTurn; }

    // Perform base recognition
    var instance = dc.ActiveDialog;
    var state = (IDictionary<string, object>)instance.State[PersistedState];
    var options = (PromptOptions)instance.State[PersistedOptions];

    //识别用户输入
    var recognized = await OnRecognizeAsync(dc.Context, state, options, cancellationToken).ConfigureAwait(false);
    // 记录所尝试的次数
    state[AttemptCountKey] = Convert.ToInt32(state[AttemptCountKey]) + 1;

    // 验证是否有效
    // ... set `isValid` by : `_validator(promptContext,cancellationToken)`

    // 结束对话并恢复上一级对话执行
    if (isValid) { return await dc.EndDialogAsync(recognized.Value, cancellationToken).ConfigureAwait(false); }

    if (!dc.Context.Responded) { await OnPromptAsync(dc.Context, state, options, true, cancellationToken).ConfigureAwait(false); }
    return EndOfTurn;
}
```

从上面的代码可以看出，`Prompt<T>`的`ContinueDialogAsync()`方法需要子类提供`OnPromptAsync()`方法和`OnRecognizeAsync()`的实现，以负责提示用户输入、及识别用户输入。：
```csharp
protected abstract Task OnPromptAsync(ITurnContext turnContext, IDictionary<string, object> state, PromptOptions options, bool isRetry, CancellationToken cancellationToken = default(CancellationToken));

protected abstract Task<PromptRecognizerResult<T>> OnRecognizeAsync(ITurnContext turnContext, IDictionary<string, object> state, PromptOptions options, CancellationToken cancellationToken = default(CancellationToken));
```

`Prompt<T>`有不同的子类实现，最常见的莫过于`TextPrompt`，它接受一个`string`类型作为输入。其他常见的`Prompt<>`子类包括：`NumberPrompt<T>`、`DateTimePrompt`、`ConfrimPrompt`、`ChoicePrompt`、`AttachmentPrompt`等。此外，还有一些极个别的对话类，名字中带有`Prompt`，但并非继承自`Prompt<T>`，比如`OAuthPrompt`类，此处不予赘述。<!-- more -->

## `WaterfallDialog`

`WaterfallDialog`是一种对瀑布流执行流程的抽象。简单的说，它有若干小步，每个小步都是一个委托类型：
```csharp
public delegate Task<DialogTurnResult> WaterfallStep(WaterfallStepContext stepContext, CancellationToken cancellationToken);
```
这些小步接受`WaterfallStepContext`参数，并像一个对话`API`那样返回一个`DialogTurnResult`。在`WaterfallDialog`运行时，这些小步依次执行，直至全部完成。

从实现上说，这些小步会被组织为一个`List<WaterfallStep>`，然后在状态里保存一个`stepIndex`的整型变量记录当前是第几步。每当`ContinueDialogAsync()`/`ResumeDialogAsync()`执行后，都会触发下一步的运行:

```csharp
public override async Task<DialogTurnResult> ContinueDialogAsync(DialogContext dc, CancellationToken cancellationToken = default(CancellationToken))
{
    if (dc == null) { /* throw */ }
    // Don't do anything for non-message activities.
    if (dc.Context.Activity.Type != ActivityTypes.Message) { return Dialog.EndOfTurn; }

    // Run next step with the message text as the result.
    return await ResumeDialogAsync(dc, DialogReason.ContinueCalled, dc.Context.Activity.Text, cancellationToken)
        .ConfigureAwait(false);
}


public override async Task<DialogTurnResult> ResumeDialogAsync(DialogContext dc, DialogReason reason, object result, CancellationToken cancellationToken = default(CancellationToken))
{
    if (dc == null) { /* throw */ }
    // Increment step index and run step
    var state = dc.ActiveDialog.State;
    var index = Convert.ToInt32(state[StepIndex]);
    return await RunStepAsync(dc, index + 1, reason, result, cancellationToken)
        .ConfigureAwait(false);
}
```


## `ComponentDialog`

`ComponentDialog`是一个组件对话。顾名思义，这是按照设计模式中的组合模式来设计的对话组件。我们可以把一组对话组合成一个`ComponentDialog`，这个`ComponentDialog`本身又继承自`Dialog`类，故可以将之作为一个整体用于`Dialog`的相关场景。

### `AddDialog(dialog)`

`ComponentDialog`在内部嵌入了一个`DialogSet`，通过调用`AddDialog(Dialog dialog)`方法可以向其中添加子对话。借助于`DialogSet`，这些子对话之间可以互相调用。

```csharp
public ComponentDialog AddDialog(Dialog dialog)
{
    _dialogs.Add(dialog);                         // 把子对话加入对话集
    if (string.IsNullOrEmpty(InitialDialogId))
    {
        InitialDialogId = dialog.Id;              // 设置初始对话ID
    }

    return this;
}
```

一种可能的执行流程为:

* 在启动时，`BeginDialogAsync(DialogContext outerDc, object opts, CancellationToken ct)`会启动当前自身`DialogSet`中的Id为初始ID的`Dialog`。如此，对话栈中就被压入了一个的子对话。
* 当程序收到消息继续执行时，程序无脑执行栈顶对话的`ContinueDialogAsync()`方法。假设当前栈顶是子对话A，子对话A根据自身需要，可能调用了对话B
* 当程序收到消息继续执行时，程序无脑执行栈顶B对话的`ContinueDialogAsync()`方法，假设B对话只是简单询问用户消息并保存在某个状态中，那么B对话在收到消息后`ContinueDialogAsync()`执行时保存相关消息，结束当前对并返回上一步对话（通过`dc.EndDialogAsync(result)`结束当前会话并触发上一级对话的`ResumeDialogAsync()`）
* 当程序收到消息继续执行(当前栈顶为A对话)，程序无脑执行栈顶A对话的`ContinueDialogAsync()`方法。A对话的`ContinueDialogAsync()`发现相关信息均已收集到，通过`dc.EndDialogAsync(result)`结束会话，如何触发A的上一级会话的`Resume`。如果栈中再无其他会话，则会直接返回一个状态为`DialogTurnStatus.Complete`的结果。

