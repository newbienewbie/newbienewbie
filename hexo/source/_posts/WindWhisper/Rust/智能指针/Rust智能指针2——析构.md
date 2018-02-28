---
title: Rust智能指针2——析构
date: 2018-02-27 18:27:38
tags:
- Rust
- 智能指针
- Drop
- 析构
categories:
- 风语
- Rust
- 智能指针
---

在[《Rust所有权系统1——世界观》](http://www.itminus.com/blog/2017/12/29/WindWhisper/Rust/%E6%89%80%E6%9C%89%E6%9D%83%E7%B3%BB%E7%BB%9F/%E6%89%80%E6%9C%89%E6%9D%83%E7%B3%BB%E7%BB%9F1%E2%80%94%E2%80%94%E4%B8%96%E7%95%8C%E8%A7%82/)中，我们举了这样一个例子：

```Rust
{
    let x = Box::new(100i32);  // 在堆上分配内存，存储32位整数100
    // ...
}                              // `Rust`在编译时会帮我插入代码来释放这个堆上内存
```
用来说明，`Rust`编译器会在作用域结束的位置插入代码，来帮我们释放资源。我们不必手工管理内存，再不需要像写C时那样`malloc()`，更不需要心惊胆战是不是哪里忘记`free()`或者疑神疑鬼是不是重复`free()`了，生活美好得就更在`Java`里一样。但是问题是，`Rust`是怎么知道要去释放哪些资源的呢？ 这要从`Drop`这个`Trait`说起。

<!--more-->

## `Drop` 
事实上，`Rust`提供了一个名为`Drop`的`Trait`，可以定制当一个类型的值在作用域结束前要做些什么，从功能上讲，这个`Trait`十分类似于`C++`的析构函数。`Box<T>`类型也实现了这个`Trait`，每当`Box<T>`的一个实例作用域结束，其所实现的`Drop`的`drop()`方法就被调用，从而释放该实例所指向的堆上内存空间。

假设我们有一个简单的结构体：
```Rust
struct Sth {
    field: String,
}

impl Sth {
    fn new(s:String)->Sth{
        Sth{field:s}
    }
}
```
现在想在其实例析构时做点其他事，比如检查特朗普是不是又发推特了：
```Rust
impl Drop for Sth {
    fn drop(&mut self){
        // 找到最新的推特，这里假装是 特朗普又举着手指说 ：你被开除了 ! 
        self.field=String::from("You Are Fired!");
        // ...
        println!("The latest Tweets from Donald J. Trump is < {} >",self.field);
    }
}
```
和常见`GC`的`mark-and-swipe`不同，编译器插入资源回收代码都是在编译期发生的事儿。正是由于这个特点，`Rust`中的资源析构是确定性的。

## 手工释放

有时候我们会想尽早释放内存，但是需要注意的是，尽管一个类型可以实现`Drop`，但是`Rust`中并不允许人为手工地显式调用其实例的`drop()`方法。这是因为会触发多次释放内存（`double free`）的问题。考虑一段有问题的程序：
```Rust
{
    sth.drop();  // sth.drop() 被显式调用
}                // 这里会发生什么？
```
假如`Rust`允许这样显式调用`sth.drop()`，那么当作用域结束，编译器插入的用于释放资源的代码就会被重复执行，显然，这造成了多次释放同一段内存的出问题。要是想提前手工释放内存，可以使用`std::mem::drop()`函数:
```Rust
{
    let sth = Sth { string: String::from("hello,world") };
    drop(sth);
    // ...
}
```

## 小结

`Drop`类似于`C++`的析构机制，这个`Trait`给了智能指针自动释放资源的能力，让我们的生活美好得如同在`Java`中那样。正因为此，`Drop`也是智能指针相对于普通引用(指针)的重要区别之一。
