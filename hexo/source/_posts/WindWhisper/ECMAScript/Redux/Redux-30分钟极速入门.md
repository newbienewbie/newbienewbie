---
title: Redux 30分钟极速入门
date: 2017-05-10 13:09:06
tags: 
- ECMAScript
- Node.js
- React
- Redux
categories:
- 风语
- ECMAScript
- Redux
---

## Redux 世界观

`Redux`遵从的是`Flux`模式，本质上就是一个 `event dispatcher`。

由于`React` 提供了`数据`->`视图`的映射，如果改变`数据`，`React`就会自动渲染出相应的`视图`。为了处理复杂的情况，比如用户点击，传统的方式，可能是为组件添加各种事件监听器，一旦监听器被触发，就执行相关代码逻辑，最后通过`setState()`改变状态，从而自动渲染出新的视图。但是当应用复杂度增加到一定数量级时，代码会越来越不可控，也就是说，我们需要单独提炼出一个管理数据的功能，以让`React`根据数据自动渲染视图。

`Redux`的核心工作就是管理数据，具体而言就是:

1. 视图可以在某种情况下创建动作并予以触发
2. 根据当前状态、和所触发动作，生成新的状态 
3. `React`根据新的状态渲染新的视图

`Redux`和`React`是独立的、互不耦合的，其负责的工作就是管理数据，所以为了简单起见，以下我们不再讨论`React`，只使用纯`JavaScript`讨论怎么根据`Redux`管理状态。

## Store 、Action、和 Reducer

既然`Redux`是用来管理数据的，那么就需要一个地方来存储数据、然后提供修改数据的机制。这个机制的核心在于`store`——用于存储`state`、调度`action`。

1. 维持应用状态(state)； 提供 getState() 方法获取 state；
2. 调度动作：提供 dispatch(action) 方法更新 state；
3. 订阅管理：通过 var unsubscribe=subscribe(listener) 注册监听器、注销监听器。

### Action

`action`是改变状态的`payload`，假设我们有一个任务系统，包括两种任务动作分类，一是探索、而是完成，则可以这样定义`action`:

```JavaScript
// 定义各种 Action 分类字符串常量
const ACTIONS={ QUEST:'task.quest', COMPLETE:'task.complete', };

// 创建一个动作 quest
function quest(ebook){
    return { type:ACTIONS.QUEST, value:ebook, };
}

// 创建一个动作 complete
function complete(ebook){
    return { type:ACTIONS.COMPLETE, value:ebook, };
}

module.exports={ ACTIONS, quest, complete, };
```

### Reducer

规定了`action`，还要规定如何响应`action`。这部分工作是`reducer`的职责，本质上`reducer`所做的就是实现:
```JavaScript
(当前状态,动作)=>新状态。
```

针对上文的`action`，编写如下`reducer`:
```JavaScript
const taskActions=require('../actions/task');

const reducer = function (state = {}, action) {
    switch (action.type) {
        case taskActions.ACTIONS.QUEST:
            console.log(`test ${action.type}\t${action.value}`);
            return Object.assign({},state, {message: action.value})
        case taskActions.ACTIONS.COMPLETE:
            console.log(`test ${action.type}\t${action.value}`);
            return Object.assign({},state, {message: action.value})
        default:
            return state;
    }
}
module.exports=reducer;
```

### Store

#### 创建`store`

`store` 是`Redux`的核心，`Redux`提供了`createStore()`函数来创建`store`
```JavaScript
const {createStore}=require('redux');
const reducer=require('./reducers');
const store = createStore(reducer);
```

#### 调度`action`

调度动作这一步包括两小步：
* 创建动作：由动作创建器创建动作
* 派发动作：由`store.dispatch()`派发动作触发`reducer`

```JavaScript
let taskActions= require('./actions/task');

const questAction=taskActions.quest('hello,world');
store.dispatch(questAction);
```

输出为：
```
test task.quest hello,world
```

#### 创建`action`后自动触发调度

可以通过装饰器的思想，构造一个同名函数，每次创建动作就可以自动触发动作派发，从而避免每次手工`dispatch`。

`bindActionCreators()`就是这样一个函数：绑定各个 `action creator` 到 `dispatch` —— 把相应 `action creator` 包装成会自动触发`dispatch`动作的对象。

首先看下用于单个绑定的`bindActonCreator()`装饰器，其实现类似于：
```JavaScript
function bindActionCreator(actionCreator, dispatch){
    return function(){
        return dispatch(actionCreator.apply(undefined, arguments));
    };
}
```
此函数非常简单，返回一个函数对象，经调用后将生成`action`并触发`dispatch`调用。

而`bindActionCreators()`可以理解为`bindActionCreator()`的批量模式：
```JavaScript
function bindActionCreators(actionCreators, dispatch){
    if (typeof actionCreators === 'function') {
        return bindActionCreator(actionCreators, dispatch);
    }
    
    if (typeof actionCreators !== 'object' || actionCreators === null) {
        throw new Error('bindActionCreators expected an object or a function, instead received ' + (actionCreators === null ? 'null' : typeof actionCreators) + '. ' + 'Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?');
    }
    
    var keys = Object.keys(actionCreators);
    var boundActionCreators = {};
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var actionCreator = actionCreators[key];
        if (typeof actionCreator === 'function') {
            boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
        }
    }
    return boundActionCreators;
}
```

有了`bindActionCreators`，就可以批量完成动作创建器到调度的绑定，从而实现自动调度：
```JavaScript
const {bindActionCreators}=require('redux');
// 装饰
taskActions=bindActionCreators(taskActions,store.dispatch);

// 创建后自动派发动作
taskActions.quest('hello,world');
taskActions.complete('fuck,world');
```

输出为：
```
test task.quest hello,world
test task.complete      fuck,world
```