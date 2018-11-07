---
title: WebAssembly基本原理4——Table
date: 2018-1-20 19:48:53
tags:
- WASM
- WebAssembly
- JavaScript 
categories:
- 风语
- WASM
---

总的来说，`Table`是一个`JavaScript`包装对象，具有`array-like`结构，目前只能用来存储的函数引用。不管是`JavaScript`还是`WASM`，都可以访问、修改`Table`。

为什么需要`Table`? `call`指令可以直接调用函数名来调用函数，然而这种方式是静态的，编译时就需要确定函数名。如果我们有一个运行时才能确定的函数，又如何才能调用？设想有一段`C`函数`dispatch()`，可以接收一个函数指针作为参数，然后调用之。
```c
typedef void(*fp)();

void dispatch(fp x) {
  x();
}
```
注意这里`fp`类型的函数指针所指向的内容是运行期才能确定的，怎么构造与之等价的`WASM`？

直观的解决办法当然是给出一个函数地址，然后让`WASM`根据函数地址找到相关函数，这样就不用写死函数名了。问题是在线性内存中存储函数，再直接给出一个函数地址让`WASM`调用的做法是十分不安全的，因为线性内存暴露了所存储的原始内容。在计算机编程中，没有什么纸老虎问题是不能用封装解决的；如果有，那就再加一层。所以解决办法是引入一个包装对象——`table`。从`JavaScript`的角度看，`table`是个`array-like`，在`table`中可以存储一系列的函数引用，可以按索引来访问相关位置上的元素(函数引用)。最后，通过向`call_indirect`指令传递一个表格索引值（也就是`i32`型索引值，代表函数指针在表格中的位置），而非一个具体的函数指针，就可以实现运行时的动态函数调用。

于是与上面这段`C`代码等价的`WASM`可以写成: <!--more-->
```wasm
(module
    (table 0 anyfunc)                             ;; 定义一个table 

    (type $fp (func))                             ;; 定义$fp 函数的签名 void (*fp)();

    (func $dispatch  (param $0 i32)               ;; 定义$dispatch 函数
        (call_indirect $fp (get_local $0))        ;; 间接调用$fp函数，该引用位于table第0个位置
    )

    (export "dispatch" (func $dispatch))          ;; 导出$dispatch函数为"dispatch"
)
```

## 实例化

`Table`既可以用`WASM`创建，也可以用`JavaScript`创建。

## 在`JavaScript`中创建

`JavaScript`创建`WebAssembly.Table`的接口为：
```javascript
var tbl = new WebAssembly.Table(tableDescriptor);
```
其中，`tableDescriptor`拥有如下属性:
* `element`：字符串，代表`Table`中元素的值的类型，目前只能为`anyfunc` (函数)。这里之所以叫`anyfunc`类型，是因为该类型可以容纳任何签名的函数。
* `initial` 指定`Table`中初始元素数量。
* `maximum` 可选的，指定`Table`可增长到的最大元素数

所创建的`Table`实例有如下关键的属性和方法：
* `Table.prototype.length`：表的长度
* `Table.prototype.grow()`：令表的长度增加指定大小
* `Table.prototype.get()`: 根据索引值，返回相应位置的元素
* `Table.prototype.set()`: 设置指定索引值位置的元素

除了可以使用`JavaScript`创建`WebAssembly.Table`，还可以使用`JavaScript`填充`Table`中的元素：
```javascript
function() {
    var tbl = new WebAssembly.Table({initial:2, element:"anyfunc"});

    var f1 = function() { … }
    var f2 = function() { … }

    tbl.set(0, f1);
    tbl.set(1, f2);
};
```

### 在`WASM`中创建

我们还可以直接用`WASM`创建`Table`，并把相关函数指针作为元素填充到其中：
```wasm
(module
    (table 2 anyfunc)                         ;; 创建一个Table

    (func $f1 (result i32)
        i32.const 42
    )
    (func $f2 (result i32)
        i32.const 13
    )

    (elem (i32.const 0) $f1 $f2)             ;; 填充Table元素，偏移量为0

    ;; ... 
)
```
这里`(table 2 anyfunc)`中的`anyfunc`，和`JavaScript`中的含义相同。

### 在`WASM`中调用

要想在`WASM`中间接调用相关函数，先要声明其函数签名，然后采用`call_indirect`指令间接调用即可
```wasm
(type $some_func (func (result i32)))                     ;; 定义函数签名

(func (export "callByIndex") (param $i i32) (result i32)
    (call_indirect $some_func (get_local $i) )            ;; 间接调用函数引用
)
```
看起来似乎有点古怪，是不是?其实很好理解：
* 这个`(type $some_func (func (result i32)))`，作用其实是类似于`C`的`typedef`，或者类似于`Rust`的`type`，都是在声明一个函数的原型。
* 这个`(call_indirect $some_func (get_local $i) )`，效果则十分类似于`JavaScript`里的`table[$i]()`，即是找到`Table`中偏移量为`$i`的元素，然后调用该元素所指向的函数。

### 在`JavaScript`中调用

在`JavaScript`中，将`Table`实例导入`WebAssembly`后，即可通过`#get()`方法直接使用：
```javascript
var tbl = new WebAssembly.Table({initial:2, element:"anyfunc"});

var importObj = {
    js: { tbl:tbl }
};

fetchAndInstantiate('tbl_example.wasm', importObject)
    .then(function(instance) {
        console.log(tbl.length);    // "2"
        console.log(tbl.get(0)());  // 获取第0个函数，然后调用之 "42"
        console.log(tbl.get(1)());  // 获取第1个函数，然后调用之 "83"
    });
```

