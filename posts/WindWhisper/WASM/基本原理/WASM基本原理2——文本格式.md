---
layout: post
title: WebAssembly基本原理2——文本格式
date: 2018-1-18 19:08:05
tags:
- WASM
- WebAssembly
- JavaScript 
categories:
- 风语
- WASM
---

`WASM`的文本格式通常用`S-expression`来表示。其中，每个节点位于一对括号之中，其中的第一个标签指示节点类型，其后是属性列表或者子节点列表。例如：
```wasm
(module (memory 1) (func)) 
```
该表达式的意思是：有一个模块，它有两个子节点，分别为`memory`和`func`，其中`memory`节点有属性为1。

## 数据类型

`WASM`当前支持的数据类型还很少，只有四个可用类型：

* `i32`：32位整数
* `i64`：64位整数
* `f32`：32位浮点数
* `f64`：64位浮点数

## 函数

在`WASM`模块内部，基本上所有的代码都是用函数来组织的。<!--more-->

### 函数定义

函数语法形式为：
```wasm
( func <signature> 
    <locals> 
    <body> 
)
```
例如：
```wasm
(func (param i32) (param f32) 
    (local f64)
    get_local 0
    get_local 1
    get_local 2
)
```
这里使用数字索引来引用变量。为了方便，我们可以使用变量名来代替：
```wasm
(func (param $p1 i32) (param $p2 f32) 
    (local $loc f64) 
    get_local $p1
    get_local $p2
    get_local $loc
    ...
)
```
同样，像局部变量一样，函数默认也是通过索引来区分的，为了方便，我们可以为函数起个名字：
```wasm
(func $add (param $p1 i32) (param $p2 i32) (result i32)
    get_local $p1
    get_local $p2
    i32.add
)
```
### 函数导出

如果想要这个函数可以在其他模块中调用，则需要导出这个函数:
```wasm
(module
    (func $add (param $p1 i32) (param $p2 i32) (result i32)
        get_local $p1
        get_local $p2
        i32.add
    )
    (export "add" (func $add))
)
```
为了方便，还可以将其写为一行：
```wasm
(module
    (func (export "add") (param $p1 i32) (param $p2 i32) (result i32)
        get_local $p1
        get_local $p2
        i32.add
    )
)
```

### 函数调用

### 同一模块下的函数调用

如果想在同一模块中调用这个函数，则只需使用`call`指令：
```wasm
(module
    (func $answer (result i32)       ;; 这个函数没有参数
        i32.const 42                 ;; 宇宙的终极答案
    )
    (func $some (result i32)
        call $answer                 ;; 调用同一个模块中的函数
    )
)
```

### 调用 JavaScript 中的函数

`WASM`是被设计用来补充`JavaScript`的，所以注定不会有像`JavaScript`那么丰富的接口(至少在短期内是这样)。为了完成更多功能，在`WASM`中向`JavaScript`借力(也就是调用`JavaScript`函数)是必不可少的。
为此，首先要从`JavaScript`中导入相应函数，例如，我们有一个`JavaScript`对象：
```javascript
var obj = {
    console: {
        log: function(arg) { console.log(arg); }
    }
};
```
假如我们想在`WASM`中使用这里的`obj.console.log`函数，则需要在`WASM`相应模块中先声明要导入的这个函数，然后即可调用之：
```wasm
(module
    (import "console" "log" (func $log (param i32)))   ;; 申明要导入的函数
    (func (export "myLog")                             
        i32.const 42
        call $log                                      ;; 调用外部导入的函数
    )
)
```
### 在`JavaScript`中调用`WASM`中的函数

目前`WASM`仍需要借助于`JavaScript`才能执行。所以，我们需要一段`JavaScript`来调用：
```javascript

// 要导入给WASM用的对象
var importObj = {
    console: {
        log: function(arg) { console.log(arg); }
    }
};

// buf 是WASM程序的字节码
WebAssembly.instantiate(buf, importObj)
    .then(result=>{
        // 获取实例
        const instance=result.instance;
        instance.exports.myLog();
    })
```
注意，这里并没有向`WASM`暴露的函数传递参数，这是有意为之，因为这需要在`JavaScript`和`WASM`之间共享数据，这部分知识点将在后续笔记中涵盖。
