---
layout: post
title: Rust并发编程1——消息传递
date: 2018-03-10 08:07:45
tags:
- Rust
- 并发编程
- mpsc
categories:
- 风语
- Rust
- 并发编程
---
传统的并发编程在共享数据时，往往选择的是共享且可变的多所有权的方式。如今，`message passing` 是一种越来越流行的应对安全并发的手法，在这种机制下，线程或者`actor`通过发送包含数据的消息来通讯。`Rust`提供了`channel`的机制来实现消息传递，在绝大多数编程语言里，一旦发送端利用`channel`将数据发出，就再也不能使用该数据，这十分类似于`Rust`中所有权的世界观设定，因而采用这种方式的并发编程，可以确保并发的安全可控。

### 通道与消息传递

`std::sync::mpsc`模块提供了`channel()`方法，可以生成一对`transmitter`和`receiver`，前者是消息的发送端，提供了`send()`方法，返回一个`Result<T,E>`对象。后者是消息的接收端，提供`recv()`、`try_recv()`方法，用以接收消息，以`recv()`方法为例：
1. `recv()`方法会阻塞当前线程，直到收到消息为止。
2. 当收到消息，`recv()`方法便会返回一个`Result<T,E>`类型
3. 一旦发送端和接收端的通道(`channel`)关闭，`recv()`方法便会返回一个`error`，以通知以后不会再有新的值被发送。

举一个例子，子线程每隔一秒产生一个数，主线程负责对子线程生成的数进行处理。
```Rust
use std::thread;
use std::sync::mpsc;

fn main() {
    let (tx,rx)=mpsc::channel();

    let _handle= thread::spawn(move||{
        for x in 0 .. 100 {
            tx.send(x).unwrap();
            println!("sub thread send a : {}",x);
            thread::sleep(std::time::Duration::from_secs(1));
        }
    });

    while let Ok(received)=rx.recv(){
        println!("main thread received a : {}",received);
    }
    println!("done");
}
```

### 迭代器模式

这种不停地循环调用`rx.recv()`直至通道关闭，十分类似于迭代器模式。为此，`Rust`提供了`recv.iter()`方法，返回一个迭代器`std::sync::mpsc::Iter`结构体，每次迭代取值，都会调用`rx.recv().ok()`：
<!--more-->
```Rust
pub struct Iter<'a, T: 'a> {
    rx: &'a Receiver<T>
}

impl<'a, T> Iterator for Iter<'a, T> {
    type Item = T;

    fn next(&mut self) -> Option<T> { self.rx.recv().ok() }
}
```
所以，之前的接收消息的`while`循环代码还可以用迭代器的形式改写：
```Rust
rx.iter().for_each(|received|{
    println!("main thread received a : {}",received);
})
```

### 多生产者

既然 `mpsc` 表示 *multiple producer, single consumer* ，那么提供多生产者和单一消费者之间的通信能力是肯定的，对于一对`(transmitter,receiver)`，我们可以对`transmitter`进行克隆，这样，就可以朝同一个`receiver`发送消息了：
```Rust
fn main() {
    let (tx1,rx)=mpsc::channel();
    let tx2=mpsc::Sender::clone(&tx1);

    let _h1= thread::spawn(move||{
        for x in 0 .. 100 {
            tx1.send(x).unwrap();
            println!("sub thread1 send a : {}",x);
            thread::sleep(Duration::from_secs(1));
        }
    });
    let _h2= thread::spawn(move||{
        for x in 0 .. 100 {
            println!("sub thread2 send a : {}",x);
            tx2.send(x).unwrap();
            thread::sleep(Duration::from_millis(50));
        }
    });
    rx.iter().for_each(|received|{
        println!("main thread received a : {}",received);
    })
    println!("done");
}
```

## `Send` Trait 

正如本文开头所说，在线程之间发送消息，一旦消息发出，所有权也发生了转移。`Send`指示了实现该`trait`的类型的所有权可以在线程之间传递。`Rust`的大部分类型都是`Send`，但是，还有一些例外, 包括`Rc<T>`，这是因为 如果克隆了`Rc<T>`然后试图传递克隆体的所有权到其他线程，两个线程都能同时更新引用计数，也正是这个原因，`Rc<T>`只能用于单线程情境。
```rust
// 错误的代码
let counter = Rc::clone(&counter);
let handle = thread::spawn(move || {
    let mut num = counter.lock().unwrap();
    *num += 1;
});
```
任何完全由`Send`类型组合成的类型，都会自动被标记为`Send`。除了原始指针，几乎所有的原始类型都是`Send`。

## `Sync` Trait

如果说`Send`强调了单所有权，那么`Sync`则在一定意义上有多所有权的意味：如果一个类型是`Sync`，那么从多个线程引用该类型也是安全的。换言之，如果类型`&T`是`Send`，那么类型`T`就是`Sync`，这种情况下，引用可以安全的发至其他线程。

与`Send`的情况类似，原始类型是`Sync `，完全由`Sync`类型组合成的类型也是`Sync`；`Rc<T>`、`RefCell<T>` 并非`Sync`，它们只适用于单线程场景。

## 小结 

手工实现`Send`、`Sync`是不安全的(`unsafe`)，不过这并不是什么大事。因为由实现`Send`和`Sync`了的类型组成的类型必定是`Send`和`Sync`，所以很多时候，我们没必要亲自动手实现`traits`。甚至于，作为一个`marker traits`，他们都没有方法供我们实现。如果需要在多线程下使用引用计数，我们可以使用`Arc`实现。借助于`Rust`的类型系统、借用检查器、消息传递通道、智能指针，不用再战战兢兢担心数据竞争！
