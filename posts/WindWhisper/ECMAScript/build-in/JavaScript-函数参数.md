---
layout: post
title: JavaScript 函数参数
date: 2016-11-04 09:56:04
tags:
- ECMAScript
- arguments
categories:
- 风语
- ECMAScript
- build-in
---

JavaScript 函数中，有一个本地变量，`arguments`，这是一个非常原始的货色，
* 它暴露的`array-like`属性我们要将其转换为真正的`Array`实例。
* 它暴露的`callee`属性绝大多数情况有更好的替代品。
* 它暴露的`caller`属性已经被废弃

## Array 实例 与 array-like 对象

首先有一个基本认识是: `arguments`并非真正的`Array`实例，而是一个 `array-like` 对象。

### array-like 对象的特征

如果一个对象具有以下属性，则可认为是`array-like`对象

1. 拥有`length`属性
2. 拥有一系列整数属性，范围为 `(0...length-1]`

和真正的`Array`实例不同，`array-like`对象并不具有常见的数组方法，诸如：

* slice() 
* forEach()，map()，filter()，reduce()，join()
* push()，pop()，shift()，unshift()
* splice()
* ...

### 把 array-like 对象转化为真正的 Array 实例

在 `ES2015` 之前，可以利用
```JavaScript
var slice=Array.prototype.slice;
var arr=slice.apply(arrayLike); // ES5 以后才支持接受 array-like 参数。IE9 未实现。
```
示例：
```JavaScript
!function fn(){
    var args1=Array.prototype.slice.apply(arguments); 
    var args2=Array.prototype.slice.call(arguments);
    console.log(`${Array.isArray(args1)} ${args1}`) ;
    console.log(`${Array.isArray(args2)} ${args2}`) ;
}(1,2,3,4,5);
```

输出为:
```
true 1,2,3,4,5
true 1,2,3,4,5
```


在 `ES2015` 中 引入了新的方法：
```JavaScript
Array.prototype.from(arrayLike[, mapFn[, thisArg]])
```

可以实现从 `array-like` 对象或者是`iterable object`转化到真正的 `Array` 实例。


### 把 arguments 转化为真正的 Array 实例

除了上文提到的两个转换方法，可以使用`ES2015`中函数引入了新的特性——`rest parameter`:

```JavaScript
// ES2015 以前:
function f(arg1, arg2){
    var args = Array.prototype.slice.call(arguments, f.length);
    // args 现在是真正的数组，表示 arguments 的第2项(0-based)之后的所有参数组成的数组
}
 
// ES2015 :
function(arg1, arg2, ...args) {
    // args 现在是真正的数组，表示 arguments 的第2项(0-based)之后的所有参数组成的数组
}
```


## arguments 的其他属性


### arguments.length 

这是一个容易被忽略的知识点，`arguments` 这个伪变量的`length`属性和函数对象本身的`length`属性意义并不一致：
* 函数对象的`length`属性是形式参数的个数；
* `arguments.length`属性是某次调用的实际参数的个数。 

示例：
```
!function(arg1,arg2){
    console.log(`function.length:\t${arguments.callee.length}`);
    console.log(`arguments.length:\t${arguments.length}`);
}(1,2,3);

```
输出为：
```
function.length:        2
arguments.length:       3
```


## arguements 与函数的调用关系

有两个已经不推荐使用的属性，可以用来表示函数的调用关系：

* `arguments.callee` 指向当前执行的函数。
* `arguments.caller` 指向调用当前函数的函数。

尽管现在诸多网上资料都会列出这两个属性，但是应当慎重使用`callee`，禁止使用`caller` !

### callee

`callee`属性指向当前正在执行的函数。对早期的ES版本，其在匿名函数中有很好的应用场景，比如上文中用之获取正在执行的函数对象的`length`属性。

从 ES5 开始，严格模式下禁止使用 `arguments.callee()`，因为这么调用会造成无法内联、尾递归，另外一个主要原因是递归调用会获取到一个不同的`this`值。

为了避免使用`arguments.callee`，我们可以使用函数表达式来解决问题：

```JavaScript
!function(){
    const arr=[1,2,3,4,5].map(function factorial (n) {
        return !(n > 1) ? 1 : factorial(n-1)*n;
    });
    console.log(arr);
}();
```
输出为：
```
[ 1, 2, 6, 24, 120 ]
```

### caller

`arguemnts.caller`属性已经被移除！
早期主要用于提供调用当前执行函数的函数，这样就可以在执行函数的时候先调用自身。在 JavaScript1.1 曾有实现，然后由于潜在的不安全原因，被移除。
不要使用！
