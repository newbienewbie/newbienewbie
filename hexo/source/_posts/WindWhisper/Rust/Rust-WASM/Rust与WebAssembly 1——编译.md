---
title: Rust与WebAssembly 1——编译
date: 2018-03-02 09:12:43
tags:
- WASM
- WebAssembly
- JavaScript 
- Rust
categories:
- 风语
- Rust
- Rust和WASM
---

## 如何编译到`WebAssembly`

目前而言，`WebAssembly`并无`GC`，各种其他能力也还在蓬勃开发之中。根据[Mozilla文档](https://developer.mozilla.org/en-US/docs/WebAssembly/Concepts)，当下能靠谱的编译到`WebAssembly`尚只有三种语言：
1. `C`
2. `C++`
3. `Rust`

对于`Rust`而言，目前可以采用如下方案:
1. Rust with Emscripten ：走`C/C++`一样的路线
2. Rust without Emscripten : 2017年11月底的时候，`Rust`的`nightly`版本支持`target=wasm32-unknown-unkonwn`，可以无需`emscripten`直接编译`wasm`

### 工具链和编译目标的安装

这里以编译到`wasm32-unknown-unknown`为例。编译目标设置为`wasm32-unknown-unnkown`，好处是不用再依赖`emscripten`，不过目前而言，此特性尚未加到`stable`中去，只能在`nightly`版本中使用(随着`Rust`官方在`WebAssembly`领域的持续发力，这个方案会越来越成熟)。首先当然是需要安装`nightly`版本：
```
rustup toolchain install nightly     
```
然后添加到`wasm32-unknown-unknown`的编译目标:<!--more-->
```
rustup target add wasm32-unknown-unknown --toolchain nightly
```

### `rustc`单文件编译

随后即可调用命令
```
rustc +nightly --target wasm32-unknown-unknown <rs文件名>
```
进行编译。当然，目前编译出的结果还包含很多实际没用的垃圾代码，为了减小体积，可以通过`wasm-gc`之类的工具(虽然这就是一行命令的事儿，不过我并不关心，因为这并不重要——随着直接编译到`wasm32-unknown-unknown`功能的越来越完善，这种事肯定不会再需要开发者操心)。

### `cargo`项目编译

大多数情况下，我们都是用`cargo new myproject`来创建项目，为了编译整个`cargo`项目，我们可以在`Cargo.toml`中配置：
```toml
[lib]
path = "src/lib.rs"
crate-type = ["cdylib"]
```
然后即可调用命令编译:
```
cargo +nightly build --target wasm32-unknown-unknown --release
```

### `cargo web` 

使用上述两个办法有几个不足：
1. 不能`watch`文件变化自动编译
2. 缺乏一个Web服务器，目前`WebAssembly`还只能通过`JavaScript`动态载入，导致浏览器中无法加载`WASM`代码

所以，`Rust`社区在上述方案的基础之上构建了一个更方便的办法，也即`cargo web`子命令。

安装 `cargo web`子命令非常简单：
```
cargo install -f cargo-web
```
然后在相关路径下直接调用`cargo web`子命令即可。

构建：
```
cargo web build --target=wasm32-unknown-unknown
```

测试：
```
cargo web test --node.js  # 使用node.js测试，默认是无脑Chrome浏览器
```

开启一个嵌入式Web服务器，会在必要时自动触发编译：
```
cargo web start
```

由于默认也不是`wasm32-unknown-unknown`的编译目标，目前也只支持`nightly`，所以要写作这样：
```
cargo +nightly web start --target=wasm32-unknown-unknown
```

#### 配置

为了省去命令行那么长的传参，可以将诸多参数统统写到配置文件`Web.toml`里(挨着`Cargo.toml`放就行)，例如官方提供的一个：
```
default-target = "wasm32-unknown-unknown"

# This will prepend a given JavaScript file to the resulting `.js` artifact.
# You can put any initialization code here which you'd like to have executed
# when your `.js` file first loads.
#
# This accepts either a string (as shown here), or an array of strings,
# in which case it will prepend all of the specified files in their
# order of appearance.
prepend-js = "src/runtime.js"

[cargo-web]
# Asserts the minimum required version of `cargo-web` necessary
# to compile this crate; supported since 0.6.0.
minimum-version = "0.6.0"

# These will only take effect on *-emscripten targets.
[target.emscripten]
# You can have a target-specific `prepend-js` key.
prepend-js = "src/emscripten_runtime.js"
# This will enable Emscripten's SDL2 port. Consult Emscripten's documentation
# for more details.
link-args = ["-s", "USE_SDL=2"]

# You can also specify the target by its full name.
[target.wasm32-unknown-unknown]
prepend-js = "src/native_runtime.js"
```

#### 工作原理分析

我们可以写一个最简单的程序来分析它是如何工作的，新建一个项目：
```
cargo new --lib hello
```
指定其类型为`cdylib`，这个类型可以用于让编译出的动态库很方便地被其他语言载入：
```toml
[lib]
crate-type=["cdylib"]
```
(后文会说`cargo new --bin hello`这种方式创建的项目是如何工作的，如果是`--bin`类型，无需指定`cdylib`。)
随便编写一个`Rust`函数：
```Rust
#[no_mangle]
pub extern "C" fn add(x: i32, y :i32) -> i32 {
    x+y
}
```
调用`cargo web`编译：
```
cargo +nightly web deploy --target=wasm32-unknown-unknown
```
获得 三个文件：
* index.html
* hello.js
* hello.wasm

其中，编译出的`wasm`代码经过精简后为：
```wat
(module
  (type $t0 (func (param i32 i32) (result i32)))
  ;; 下面就是我们用`Rust`编写的 add(x,y) 函数
  (func $add (type $t0) (param $p0 i32) (param $p1 i32) (result i32)
    get_local $p1
    get_local $p0
    i32.add)
  (table $__web_table 0 anyfunc)
  (memory $memory 17)
  (export "add" (func $add))             ;; 导出add(x,y)函数
  (export "__web_table" (table 0))
  (export "memory" (memory 0))
  (data (i32.const 4) "\10\00\10\00"))
```
而生成的`js`则是起到了胶水功能，代码主体非常简单，就是一个立即执行函数，负责编译、实例化`WASM`模块，然后将需要导出的部分以同步或者`promise`的方式挂载到外部环境上。
```javascript
if (typeof Rust === "undefined") { var Rust = {}; }

(function (root, factory) {
    // AMD
    if (typeof define === "function" && define.amd) { define([], factory); } 
    // node.js 
    else if (typeof module === "object" && module.exports) { module.exports = factory(); } 
    // plain browser
    else { Rust.hello = factory(); }
}(this, function () {
    function __initialize(__wasm_module, __load_asynchronously) {
        const Module = {};    // 注意返回的是这个`Module`的`exports`属性
        // 以异步或者同步方式加载模块，
        // 返回Module.exports或者Promise的返回
    }

    // 使用node.js api读取当前目录下的指定wasm文件
    if (typeof window === "undefined") {
        const fs = require("fs");
        const path = require("path");
        const wasm_path = path.join(__dirname, "hello.wasm");
        const buffer = fs.readFileSync(wasm_path);
        const mod = new WebAssembly.Module(buffer);

        return __initialize(mod, false);
    } 
    // 使用浏览器API获取指定名称的wasm文件
    else {
        return fetch("hello.wasm")
            .then(response => response.arrayBuffer())
            .then(bytes => WebAssembly.compile(bytes))
            .then(mod => __initialize(mod, true));
    }
}))
```
至于其中的`__initialize()`函数，主要是实例化模块、把相关结构存到内部变量`Module`上，注意，默认情况下，并非`pub extern "C" `标注的就会被这个引入到`js`。在其内部有个`__instantiate(instance)`函数，将根据编译出的实例对象，更改内部的`Module`对象。
```javascript
function __initialize(){
    const Module={};
    // ...

    function __instantiate(instance) {
        Object.defineProperty(Module, 'instance', {
            value: instance
        });
        Object.defineProperty(Module, 'web_malloc', {
            value: Module.instance.exports.__web_malloc
        });
        Object.defineProperty(Module, 'web_free', {
            value: Module.instance.exports.__web_free
        });
        Object.defineProperty(Module, 'web_table', {
            value: Module.instance.exports.__web_table
        });


        __imports.env.__web_on_grow();

    }

    // ...

}
```

注意其中的
```javascript

        __imports.env.__web_on_grow();

```
前后有留白。
            
1. 前一行留白对应的是：尽管在生成的`wasm`文件中已经将相关`pub extern "C"`声明的函数导出，但是生成的`js`里并没有把`module.instance.exports`对象挂到`Module.exports`。如果需要，可以手工在`__instantiate()`添加；另一种情况是，配合使用`stdweb`使用时，可以自动`js_export`自动导出并挂载。
2. 后一行留白对应的是：如果项目是`cargo new --bin`生成的运行程序而非一个库，则`cargo web`会在生成的`wasm`代码中导出`Rust`中的`main()`函数`(export "main" (func $main)`，然后再在生成的`js`代码中`__imports.env.__web_on_grow();`之后的位置调用`Module.instance.exports.main()`，也即是`Rust`中的`main()`函数。

## 小结

这篇笔记记录了如何从`Rust`编译到`WebAssembly`。不过，现在很多`Web`接口尚未对`WebAssembly`开放，`WebAssembly`对浏览器的控制能力还是相对较弱。所以要做出一个实用的`WebAssembly`程序，借助`JavaScript`再所难免。为此，`Rust`社区开发了`stdweb`库，可以让`Rust`和`JavaScript`之间方便的交换数据，也支持在`Rust`中嵌入`javascript`代码，最后统统编译为`WebAssembly`代码，从而在`Node.js`和浏览器环境中运行。