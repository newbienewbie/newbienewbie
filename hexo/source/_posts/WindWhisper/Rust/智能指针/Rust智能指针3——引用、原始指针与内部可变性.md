---
layout: post
title: Rust智能指针3——引用、原始指针与内部可变性
date: 2018-02-28 09:25:28
tags:
- Rust
- 智能指针
- 引用计数
- Cell<T>
- RefCell<T>
categories:
- 风语
- Rust
- 智能指针
---

本文是正式开始智能指针之前的基础知识之三：引用、原始指针、与内部可变性。

## 引用和原始指针

`Rust`中的引用在本质上就是指针，并没有什么黑魔法。对于原始指针和普通引用，在运行时，二者所指的内容完全一致。事实上，普通引用(`&T`、`&mut T`)都会被编译器隐式转化为原始指针(`*const T`、`*mut T`)，只不过这个转化是安全的。在`Rust`中，有两类原始指针：
1. `*const T` : 类似于 `&T`引用，不可变
2. `*mut T`   : 类似于 `&mut T`，可变

以`*const T`为例，可以把`&T`进行显式转换：
```Rust
let x = 42;
let raw_pointer = &x as *const i32;
```
或者可以写成这样：
```Rust
let x: i32 = 10;
let raw_pointer: *const i32 = &x;
```

但是，如果程序员手工使用原始指针，编译器并没有办法保证原始指针所指向的内存的有效性。正因为如此，`Rust`中大部分直接使用原始指针的场景都要加上`unsafe`： <!--more-->
```Rust
let x_value= unsafe { *raw_pointer };
```
由引用向原始指针转换是安全的，因为编译器确保了引用的有效性；但是反过来，则是不安全的，这也是我们在 `*`解引用时加上`unsafe{}`块的原因。也就是说，编译器认为这段解引用原始指针的代码不安全，不过程序员对编译器做出了承诺：“我知道这段代码可能不安全，但是编译器你别管了，我以程序员的名义起誓，我确信这段代码没问题”。

此外，原始指针也不会自动清理内存，原始指针就是纯粹的数，也不会`move`所有权。

## 引用和内部可变性

还记得还记得我们在所有权系统中描述的[借用规则](http://www.itminus.com/blog/2017/12/29/WindWhisper/Rust/%E6%89%80%E6%9C%89%E6%9D%83%E7%B3%BB%E7%BB%9F/%E6%89%80%E6%9C%89%E6%9D%83%E7%B3%BB%E7%BB%9F1%E2%80%94%E2%80%94%E4%B8%96%E7%95%8C%E8%A7%82/) 吗？

> 1. 在任何时间，可以有一个可变引用，也可以有任意数量的不可变引用，但是不能同时拥有这两种情况。
> 2. 引用在其存活时间内必须总是有效的。

规则1 有效地确保了内存安全、避免了数据竞争，但是带来好处的同时也会在一些情况下捆住了我们的手脚，我们只能在 *不可变的共享引用* 和 *唯一的可变引用* 中二选一，一旦编写了存在其他情况的代码，就会触发编译期错误。

现在有一个场景是，对于借出的多个不可变引用，我们并不想改变整个引用的对象(这显然时违反内存安全的)，而是想只改变其中一个字段(完整地)，也就是要做字段级别的可变性控制，是否可行？类似于其他语言中字段级的`const`，不过`Rust`中默认都是`immutable`，所以要做的不是声明其不可变，而是指示某个字段其可变。在这种机制下，我们可以通过一个不可变结构的引用修改其中的一个字段，这称之为 *内部可变性* (`interior mutability`)

## `Cell<T>`

简单的说，我们需要的是这样一种东西：我们可以利用对象的不可变引用，改变其中一个字段。`Cell<T>`允许我们通过在类型定义时将相关字段声明为`Cell<T>`类型来实现。不过`Cell<T>`要求相关字段是`Copy`(不包含指针等)，比如，是简单的整数类型，所以对其读写只需要简单的内存复制就行。

这种需求场景及使用方式非常容易理解，例如[官方文档中的例子](https://doc.rust-lang.org/std/cell/struct.Cell.html) ：
```Rust
use std::cell::Cell;

struct SomeStruct {
    regular_field: u8,
    special_field: Cell<u8>,
}

let my_struct = SomeStruct {
    regular_field: 0,
    special_field: Cell::new(1),
};

let new_value = 100;

// ERROR, because my_struct is immutable
// my_struct.regular_field = new_value;

// WORKS, although `my_struct` is immutable, field `special_field` is mutable because it is Cell
my_struct.special_field.set(new_value);
assert_eq!(my_struct.special_field.get(), new_value);
```

### `Cell<T>`的API

乍一看，`Cell`本身相当简单，就是包装一下`value`，然后提供几个`API`：
```Rust
pub struct Cell<T> {
    value: UnsafeCell<T>,
}
```
但是，且慢，`UnsafeCell`是个什么鬼？
> The `UnsafeCell<T>` type is the only legal way to obtain aliasable data that is considered mutable. 

所有的具有内部可变性特点的类型，都必须要基于`UnsafeCell<T>`来实现。为什么要有这个规定呢？我们直接通过原始指针 `*const T`转换为`*mut T`，然后再在根据原始指针在指定位置写入相关值不就解决问题了？例如：
```Rust
unsafe {
    let p = &(self.value) as *const T as *mut T;
    *p = v;
}
```
然而，这种操作可能在一些情况下(比如涉及内存被回收的时候)产生悬空引用问题。作为把内存安全看得比程序员的命还重要的语言，`Rust`绝不会这样简单采用原始指针进行转换的方式。所以，提供了`UnsafeCell<T>`这个类型，该类型使用了编译器的内部黑魔法，确保了内存操作的安全性。而`Cell<T>`以此为基础，才能实现内存安全的内部可变性。`Cell`暴露的几个重要方法为：

`#new(value)` ： 
```Rust
pub const fn new(value: T) -> Cell<T> {
    Cell {
        value: UnsafeCell::new(value),
    }
}
```

`get()`会返回所包含值的一个拷贝：
``` Rust
pub fn get(&self) -> T {
    unsafe{ *self.value.get() }
}
```
`get_mut()`会返回对底层数据的可变引用：
```Rust
pub fn get_mut(&mut self) -> &mut T {
    unsafe {
        &mut *self.value.get()
    }
}
```
`set()`则会对旧值进行整体替换：
```Rust
pub fn set(&self, val: T) {
    let old = self.replace(val);
    drop(old);
}

pub fn replace(&self, val: T) -> T {
    mem::replace(unsafe { &mut *self.value.get() }, val)
}
```

### `Cell`的特点与限制

通过观察上面的源码可以知道：
1. `Cell<T>`每次`get()`、`set()`调用其实都是做简单地拷贝，这也是`Cell<T>`要求`T`类型实现`Copy`的原因。
2. `Cell`没有运行时的额外性能损失，因为对于`Copy`类型，哪怕是`C`语言，也是进行类似`memcpy`的操作。

`Cell`成功的绕开了编译期关于继承不变性的约束，让我们可以使用不可变引用来修改其中的一个字段。事实上，下一篇笔记要说的引用计数型智能指针`Rc<T>`就要用到`Cell<usize>`来实现内部可变性。

另一方面，`Cell<T>`是基于`T`是`Copy`的前提设计的，要针对不具备`Copy`能力的字段使用内部可变性，可以使用`RefCell<T>`。显然，`RefCell<T>`的内部实现要比`Cell<T>`麻烦的多，它必须自行在运行时维护进行`借用检查`，`borrow_mut()`和`borrow()`的使用必须符合 *引用规则* 。如果我们违反了这一点，就会在运行时触发`panic`。

