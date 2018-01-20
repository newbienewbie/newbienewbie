---
title: WebAssembly基本原理3——Memory 
date: 2018-1-19 22:54:45
tags:
- WASM
- WebAssembly
- JavaScript 
categories:
- 风语
- WASM
---

`WebAssembly.Memory`是一段字节数组（a large array of bytes），用于在`WebAssembly`和`JavaScript`之间共享内存。`WebAssembly`包含诸如`i32.load`和`i32.store`指令来实现对线性内存的读写；从`JavaScript`的角度来看，`Memory`就是一个可以包含一切内容的、可变尺寸的`ArrayBuffer`。

## 创建`Memory`对象

如何创建一个`WebAssembly.Memory`实例？有两种方法，一是使用`JavaScript`创建一个`WebAssembly.Memory`对象并导入到`WebAssembly`模块实例中；二是，当我们不手动提供一个`Memory`实例时，`WebAssembly`模块会自动创建一个`Memory`对象，并把它和相应模块实例挂接起来，我们可以将之导出给`JavaScript`。

### 如何使用 `JavaScript` 创建`WebAssembly.Memory`对象

`JavaScript`能够通过`WebAssembly.Memory()`接口创建`WebAssembly.Memory`内存实例
```javascript
var memory = new WebAssembly.Memory({initial:10, maximum:100})
```
内存实例对象拥有一个`buffer`属性，也即`Memory.prototype.buffer`，它返回一个指向整个线性内存的`ArrayBuffer`对象。此外，内存实例对象还有一个`grow()`方法(每页`64KB`)，也即`Memory.prototype.grow()`，这意味着内存实例能够增长，但是由于`ArrayBuffer`不能改变大小，所以，当增长产生的时候，当前的`ArrayBuffer`会被移除，然后一个新的`ArrayBuffer`会被创建，并指向新的、更大的内存。<!--more-->

### 导入`Memory`对象

用`JavaScript`所创建的`WebAssembly.Memory`对象要和模块实例挂接起来，还需要进行导入：
```javascript

// 创建一个Memory对象
var memory = new WebAssembly.Memory({initial:1});

// 待导入
var importObj = {
    js: { 
        mem: memory 
    },
};

fetch('simple.wasm')
    // 获取字节码
    .then(response =>response.arrayBuffer())
    // 编译和实例化
    .then(bytes =>WebAssembly.instantiate(bytes, importObject))  // 这里传入一个导入对象
    .then(results => {
        results.instance // 使用实例
    });
```
这样，这块内存就同时可以在`WASM`和`JavaScript`中进行访问了。

## 使用

设想这样一个使用场景，我们想在`WASM`中调用`JavaScript`中的`console.log()`函数输出一段字符串。首先当然是要在`WASM`声明导入一个`console.log`函数。但是`WASM`目前只支持`i32`、`i64`、`f32`、`f64`四种类型，如何输出一个字符串呢？这要借助于`WebAssembly.Memory`对象。

从本质上说，一个字符串其实是位于线性内存某处的 *字节序列* 。为了传递一个字符串，我们所需要做的其实就是传递字符串在线性内存中的偏移量及其长度两个整型变量。
所以，`JavaScript`中，该函数的原型类似于：
```javascript
consoleLogString(offset, length) { /* ... */ }
```
而在`WASM`中，所要导入的函数原型为：
```wasm
(import "console" "log" (func $log (param i32) (param i32)))
```
这样，使用普通的`call`指令即可调用`JavaScript`函数输出`Memory`对象中的字符串。

现在的问题是，怎么实现这个`JavaScript`函数？其实很简单，借助于文本解码器API就可以把我们的字节解码为一个`JavaScript`字符串。（这里，我们使用`utf8`，不过，许多其他编码也是支持的。）
```javascript
consoleLogString(offset, length) {
    // 在这里，使用闭包来引用`memory`对象
    var bytes = new Uint8Array(memory.buffer, offset, length);
    // 解码获取字符串
    var string = new TextDecoder('utf8').decode(bytes);
    // 调用输出函数输出字符串
    console.log(string);
}
```
完整的`WASM`定义如下：
```wasm
(module
    (import "console" "log" (func $log (param i32 i32)))
    (import "js" "mem" (memory 1))
    (data (i32.const 0) "Hi")      ;; 数据段中写入 Hi
    (func (export "writeHi")
        i32.const 0                ;; 偏移为0 
        i32.const 2                ;; 偏移为2
        call $log)           
)
```
现在，我们可以从`JavaScript`中创建一个`1`页的`Memory`对象，然后把它传递进去。
```JavaScript
var memory = new WebAssembly.Memory({initial:1});

var importObj = {
    console: { log: consoleLogString }, 
    js: { mem: memory },
};

fetchAndInstantiate('logger2.wasm', importObject)
    .then(function(instance) {
        instance.exports.writeHi();
    });
```
这会在控制台输出"Hi"。

