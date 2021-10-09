---
layout: post
title: Rust并发编程2——状态共享可修改
date: 2018-03-11 10:09:12
tags:
- Rust
- 并发编程
- 状态共享
categories:
- 风语
- Rust
- 并发编程
---

在`Rust`中，一贯的理念是，一个类型应该要么是共享只读，要么是独占可改。这也是所有权系统要求对同一实例的引用(`&T`)、可变引用(`&mut T`)不能共存的原因。不过，这种所有权规则有时候会给编程带来极大的不变性，在单线程场景下，可以通过`RefCell<T>`实现内部可修改，通过`Rc<T>`实现共享所有权，这样组合后就可以实现基于共享不可变引用的内部可修改了。

在多线程场景下，如果只是简单的数据共享，可以借助于[上一篇笔记中](http://www.itminus.com/blog/2018/03/10/WindWhisper/Rust/%E5%B9%B6%E5%8F%91%E7%BC%96%E7%A8%8B/Rust%E5%B9%B6%E5%8F%91%E7%BC%96%E7%A8%8B1%E2%80%94%E2%80%94%E6%B6%88%E6%81%AF%E4%BC%A0%E9%80%92/)的消息传递机制；但是要实现数据共享且可修改，就要借助于`Mutex<T>`和`Arc<T>`了。 

## `Mutex`和`MutexGuard`智能指针

`Mutex`(互斥体)是用于共享内存的并发原语，表示在任何给定的时间点，只允许唯一一个线程去访问数据，为了访问`Mutex`中的数据，线程必须首先发出信号请求获得`Mutex`的锁，表示想要访问数据。这里的锁是`mutex`中的数据结构，用于追踪当前是谁在访问这个数据。由于是基于锁机制，`Mutex`要求程序员遵循以下原则:
1. 使用数据前，必须要尝试获取锁。倘若获取不到，则无法使用数据；倘若获取到，则可以独占数据。
2. 一旦处理完数据，必须释放锁。倘若不释放锁，则其他人无法再使用数据。

在`Rust`中，`Mutext<T>`类型可以使用`Mutext::new()`构造一个实例，在使用之前需要尝试通过`Mutex`类型的`lock()`方法加锁，需要注意的是：
* `lock()`方法会阻塞当前线程
* `lock()`方法成功之后会返回一个`MutextGuard`类型的智能指针，此智能指针实现的`Deref`让其可以被当作一个对内部数据的可变引用，而此类型实现的`Drop`会在作用域结束之后自动释放锁。

```Rust
use std::sync::Mutex;

fn main(){
    let m=Mutex::new(String::from("hello world"));
    {
        let mut num=m.lock().unwrap();     // 调用 lock() 会阻塞当前线程，成功之后会返回`MutexGuard`类型
        *num=String::from("fuck world");   // 解引用
    }                                      // 一旦`MutexGuard`到了作用域之外，就会自动释放锁
    println!("{:?}", m)
}
```
和其他编程语言一样，在`Rust`中需要注意，使用`Mutex<T>`可能造成死锁。<!--more-->

在本质上，`Mutex`借助于锁的概念，以对`Mutex`对象的不可变引用，实现了对其所包裹的内部数据的可修改性。这十分类似于`RefCell`的功能。不过，`Mutex<T>`还是属于单所有权那一套。要实现多线程场景下的共享可修改，还需要配合`Arc<T>`一起使用。

## `Arc<T>`和`Mutex<T>`的配合使用

`Arc`类型表示 *原子引用计数* (`atomically reference counted`)，正如名字中暗示的那样，`Arc`是`Rc`的 *atomic* 版本，二者有相同的`API`。所谓`atomic`，也是并发原语之一，借助于`Rust`标准库`std::sync::atomic`中，可以支持像其他基本类型那样，在多线程之间安全的传递。

```Rust
use std::thread;
use std::sync::{Mutex, Arc};

fn main() {
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Result: {}", *counter.lock().unwrap());
}
```

这种用`Mutex<T>`可修改+用`Arc<T>`共享实现多线程下都可修改的方式，十分类似于`RefCell<T>`+`Rc<T>`实现的单线程场景下共享。


