---
title: Rust智能指针1——解引用
date: 2018-02-27 12:42:23
tags:
- Rust
- 智能指针
- Deref
- DerefMut
categories:
- 风语
- Rust
- 智能指针
---

本文是正式开始智能指针学习之前的基础知识之一：解引用。

`Deref`这个`trait`允许我们在一定形式上重载`*`操作符。换言之，通过智能指针实现`Deref`的方式，就能让智能指针被当作一个普通引用来使用：在那些需要操作引用的地方，我们也可以直接使用智能指针。

## `*`操作符的工作机制

在本质上，`Rust`中的常规引用是与`C`语言中的指针相等价的，而`*`操作符所做的就是解引用。以下这段`Rust`代码和`C`的指针用法完全一致：
```Rust
fn main() {
    let x = 42;
    let y = &x;

    assert_eq!(42, x);
    assert_eq!(42, *y);
}
```
在上述例子中，`y`是个常规引用，`*`操作符会顺着指针进行取值。事实上，如果一个任意类型实现了`Deref`，`Rust`编译器就会自动对`*`解引用操作进行替换：先进行`Deref`的`deref()`方法调用，然后再对返回值进行一个普通的解引用。

举个例子，为了获取宇宙的终极奥秘，我们写一个任意类型：
<!--more-->
```Rust
use std::ops::Deref;

struct Anything<T>(T);

impl<T> Anything<T> {
    fn new(x: T) -> Anything<T> {
        Anything(x)
    }
}

impl<T> Deref for Anything<T> {
    type Target = T;            // 定义关联类型
    fn deref(&self) -> &T {     // 注意，返回引用
        &self.0
    }
}
```
当我们进行解引用操作：
```Rust
fn main() {
    let anything=Anything::new(42);
    assert_eq!(42,*anything);
}
```
`Rust`编译器会先调用`Deref`中的`deref()`方法，返回自身的第一个字段引用，然后再进行普通的解引用，得到字段值。也就是说，`Rust`编译器会自动将上述`*y`转换为：
```Rust
*(y.deref())
```
这一切都是编译期发生的事，并没有运行时负担。第一次看到这种方式解引用的时候，我心中有个疑惑：为什么`Rust`不规定`Deref`的`deref()`方法直接返回真正的对象，而要再绕一步地进行普通`*`解引用？原因在于`Rust`的所有权系统。如果这里`deref()`方法返回的不是一个引用类型，那么该值的所有权就会随着`deref()`方法的返回被转移出去，从而导致自身再也没办法使用该值。这也是`Rust`的`*`操作符是对`deref()`返回的引用再常规解引用的原因。

## 强制解引用

显然，对于实现了`Deref`的类型的引用，可以根据`deref()`方法转换为其他类型的引用。当我们将特定类型的引用作为参数，传递给函数(或方法)时，如果编译器发现参数的类型并不严格匹配函数(或方法)的定义，就会隐式产生一系列`deref()`，来把我们实际提供的类型转换成参数所需的类型。这一切都是自动发生的，称之为 *deref coercion* 。

举个例子，假设现有一个函数，接受一个`&str`型参数，然后输出宇宙的终极答案:
```Rust
fn foo(s :&str){
    println!("the answer is : {}",s);
}
```
然后我们可以在不重写这个函数定义的前提下，就进行这样调用：
```Rust
fn main() {
    let anything=Anything::new("42");
    foo(&anything);

    let anything=Anything::new(String::from("42"));
    foo(&anything);
}
```
原因在于，`Rust`编译器发现`foo()`函数接受的应是`&str`类型，但是我们提供了`&Anything<>`类型。由于`Anything<>`类型是个`Deref`，然后就会顺着`Deref`的`deref()`提取：
1. 在第一个示例中，实际传递的`&Anything<&str>`并不符合函数定义，但是`Anything<String>`是个`Deref`，所以编译器自动为我们插入`deref()`的调用代码，拿到了`&str`，最后才进行`foo()`函数调用。
2. 在第二个示例中，实际传递的`&Anything<String>`也不符合函数定义，所以先通过`Anything<String>`的`deref()`返回了 `&String`型，此时仍然不满足要求；又由于`String`同样也是个`Deref`，还会继续`deref()`，拿到一个 `string slice`，也就是`&str`类型，最终匹配函数定义。

值得说明的是`deref coercion`是编译期发生的事，属于零成本抽象。类似于`Deref`，为了重载`mutable reference`的`*`行为，`Rust`还提供了`DerefMut Trait`。在以下三种情况下，会触发`deref coercion`：
1. 当`T: Deref<Target=U>`，可将`&T`转换为`&U`
2. 当`T: Deref<Target=U>`，可将`&mut T`转换为`&U` 
3. 当`T: DerefMut<Target=U>`，可将`&mut T`转换为`&mut U` 

## 小结

从本质上说，`Deref`和`DerefMut`给了类型以重载解引用的能力，基于这种机制，我们可以让包装类型的引用表现的和常规引用一样。`Deref`的这种特性是智能指针和常规引用的重要区别之一。