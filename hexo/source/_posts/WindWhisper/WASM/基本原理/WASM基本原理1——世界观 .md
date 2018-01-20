---
title: WebAssembly基本原理1——世界观 
date: 2018-1-17 20:17:50
tags:
- WASM
- WebAssembly
- JavaScript 
categories:
- 风语
- WASM
---

## 世界观

`WebAssembly`是`W3C`组织制定的一项开放标准，正如其名字暗示的那样，它是`Web`平台上的“汇编语言”，具有速度快、效率高、可移植、安全、向后兼容等特点。

模块是一段可执行的机器码，经过加载、编译、实例化后，即可与`JavaScript`充分互动。基本的样板代码为：

```JavaScript
fetch('simple.wasm')
    // 获取字节码
    .then(response =>response.arrayBuffer())
    // 编译和实例化
    .then(bytes =>WebAssembly.instantiate(bytes, importObject))
    .then(results => {
        results.instance // 使用实例
    });
```
<!--more-->

## 实例化

上面这段样板代码中实例化核心的功能是：

```JavaScript
WebAssembly.instantiate(bytes, importObject)
```

这里，我们给`WebAssembly.instantiate()`函数传递了一段字节码，此函数会以`Promise`的方式，对其编译，完成后返回的对象包含了对编译后的`Module`对象的引用和相应的一个`Instance`对象:

```JavaScript
{
  module : Module,      // 编译后的Module对象
  instance : Instance   // 实例化后的Instance对象
}
```

另外，也可以直接给`WebAssembly.instantiate()`函数传递一个编译后的`Module`对象，这样此函数就会返回一个实例对象：
```JavaScript
WebAssembly.instantiate(mod, importObject)
    .then(function(instance) {
        // 使用实例
    });
```

### 导入对象

这里的第二个参数`importObject`是什么呢？这是一个导入对象，其可能有四种对象

* `values`：由于目前`WASM`只支持整型和浮点型，所以传进去的值也只能是这两种类型。
* `function closures`：可以传递一个`JavaScript`函数闭包进去。
* `memory`：代表一段内存对象。`WASM`的`memory`对象在`JavaScript`里可以被当作`ArrayBuffer`对象来管理，二者通过`memory`对象来回传递数据。当一个`WASM`模块实例化的时候，它需要这样一个内存对象，我们可以通过创建一个新的`WebAssembly.Memory`然后传进去；或者，让`WASM`自动创建一个内存对象并和相应的实例挂接起来。这块内存由`JavaScript`的`GC`管理，一旦`WASM`的模块对象作用域完毕，这块内存数组也会将会被`GC`回收。
* `tables`：位于`WASM`内存之外的数组，目前其中的值只能引用函数。

## 使用


一旦我们获取了实例，就可以在`JavaScript`中使用了：
```JavaScript
// 调用 导出的函数:
instance.exports.exported_func();

// 访问 导出的内存:
var i32 = new Uint32Array(instance.exports.memory.buffer);

// 访问导出的表:
var table = instance.exports.table;
console.log(table.get(0)());
```