---
title: Rust与WebAssembly 2——stdweb
date: 2018-03-02 14:32:50
tags:
- WASM
- WebAssembly
- JavaScript 
- Rust
- stdweb
categories:
- 风语
- Rust
- Rust和WASM
---

在上一篇笔记里，记录了`Rust`如何编译到`WASM`，这一篇我们将重点放在`stdweb`编写一个`Hello,world`上。首先创建一个项目：
```
cargo new helloworld --bin
```
添加依赖：
```toml
[dependencies]
stdweb ="0.4"
```
然后即可开始编码了。

## 如何控制浏览器

第一步毫无疑问当然是要写个`Hello,world`。不过`WebAssembly`暂时没有操作浏览器的接口，所以直接嵌入`js`即可：<!--more-->
```Rust
#![recursion_limit="128"]
#![feature(proc_macro)]
#[macro_use
extern crate stdweb;

use stdweb::js_export;

fn main() {
    stdweb::initialize();
    let msg="Hello, world";
    js!{
        alert(@{msg});
    }
    stdweb::event_loop();
}
```
调用命令`cargo+ nightly web start --target=wasm32-known-known`即可看到弹窗效果。根据[上一篇笔记](http://www.itminus.com/blog/2018/03/02/WindWhisper/Rust/Rust-WASM/Rust%E4%B8%8EWebAssembly%201%E2%80%94%E2%80%94%E7%BC%96%E8%AF%91/)的分析，`Rust`的`main`函数会在初始化的某个时间点调用，这也是当我们打开浏览器就可以看到弹窗的原因。

## 嵌入`js!{}`宏的工作机理 

事实上，`WebAssembly`现在并没有操作浏览器的接口，要想和浏览器交互，必须借助于`javascript`。`stdweb`给了在`Rust`中嵌入`js`的能力。但是，它是如何工作的？难道这段宏会对`js`进行分析然后编译为`wasm`?其实并不是。

其工作机理很简单，由于`JavaScript`的对象可以无缝导入`WASM`中，所以只需要把这段函数作为导入项来实例化`WebAssembly`模块，随后即可在`WebAssembly`中调用了。事实上，每一段`Rust`代码中的`js!{}`宏，都会被转换为一个`js`函数。不妨尝试用`canvas API`输出个`Hello,world`来分析下:
```Rust
fn main() {
    stdweb::initialize();
    let msg="Hello,world";
    js!{
        const canvas=document.createElement("canvas");
        canvas.width=300;
        canvas.height=300;
        canvas.style.border="2px solid gray";
        console.log(canvas);
        document.querySelector("body").append(canvas);
        const context=canvas.getContext("2d");
        context.fillStyle="green";
        context.fillRect(0,0,200,200);
        context.fillStyle="orange";
        context.font = "48px serif";
        context.fillText(@{msg}, 20, 150);
    }
    stdweb::event_loop();
}
```
上面`main()`中的这段`js!{}`宏会对应地生成:
```javascript
const __imports={
    env:{
        // ...
        "__extjs_3736f25989972a9a197f542330e37b10f196f77c": function ($0) {
            Module.STDWEB_PRIVATE.from_js($0, (function () {
                const canvas = document.createElement("canvas");
                canvas.width = 300;
                canvas.height = 300;
                canvas.style.border = "2px solid gray";
                console.log(canvas);
                document.querySelector("body").append(canvas);
                const context = canvas.getContext("2d");
                context.fillStyle = "green";
                context.fillRect(0, 0, 200, 200);
                context.fillStyle = "orange";
                context.font = "48px serif";
                context.fillText("Hello world", 20, 150);
            })());
        },
        // ...
    },
};
```
而对应的`WASM`代码中会有一个关于此`js`函数的导入:
```wat
(import "env" "__extjs_3736f25989972a9a197f542330e37b10f196f77c" (func $env.__extjs_3736f25989972a9a197f542330e37b10f196f77c (type $t5)))
```
这也是为什么`js!{}`嵌入代码得以无缝执行的原因。不过由于单引号`'`在`Rust`中被用作`lifetime`，所以无法在`js!{}`内使用单引号表示字符串——这完全不是什么大事，因为`JavaScript`还支持双引号 *"* 和 *`* 表示字符串。

## 如何暴露函数供`javascript`调用

既然`WebAssembly`尚无浏览器的操作接口，那么还有什么用处？当然是计算！要暴露一个`CPU`密集的函数给`javascript`函数使用非常简单：
```Rust
#[js_export]
fn add( x: i32 , y :i32) -> i32{
    x+y
}
```
事实上，如果不用`#[js_export]`，也可以直接采用`pub extern "C"`声明函数，这样编译出的`wasm`文件同样是会`export`相关函数的。只不过配套的`js`导出代码需要自己写(参见[上一篇笔记](http://www.itminus.com/blog/2018/03/02/WindWhisper/Rust/Rust-WASM/Rust%E4%B8%8EWebAssembly%201%E2%80%94%E2%80%94%E7%BC%96%E8%AF%91/))。这里我们并不想自己写`js`加载`wasm`代码，所以仍然采用`#[js_export]`的方式。

随后，我们就可以在浏览器中拿到`Rust`暴露的`add()`函数：
```javascript
Rust.hello.then(e=>{
    const {add}=e;
    console.log(add(3,4));    // 7
});
```

## 小结

`stdweb`最值得称道的地方在于提供了`Rust`和`JavaScript`的交互能力，从而让`Rust`专注于`CPU`密集的计算部分，让`JavaScript`负责与浏览器交互。