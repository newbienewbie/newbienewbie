---
title: Rust智能指针4——引用计数型智能指针
date: 2018-02-28 09:25:28
tags:
- Rust
- 智能指针
- 引用计数
- Rc
- Arc
- RefCell
categories:
- 风语
- Rust
- 智能指针
---

智能指针并非什么新概念，`C++`里随处可见。所谓智能指针，其本身是一个数据结构，可以表现得像一个指针(得益于`Deref`)，往往还能自动析构资源(益于`Drop`)。

`Rust`在标准库中提供了很多种智能指针。这篇笔记要说的都是引用计数型指针，比如
1. `Rc<T>`(及`std::rc::Weak<T>`) : 引用计数型智能指针，适用于单线程场景的共享。
2. `Arc<T>`(及`std::sync::Weak<T>`) ：原子的引用计数型智能指针，适用于多线程场景的共享。
3. `RefCell<T>`等。

## `std::rc::Rc<T>`及`std::rc::Weak<T>`

所谓`Rc`，意指`Reference Count`，也即“引用计数”。还记得 [所有权规则](http://www.itminus.com/blog/2017/12/29/WindWhisper/Rust/%E6%89%80%E6%9C%89%E6%9D%83%E7%B3%BB%E7%BB%9F/%E6%89%80%E6%9C%89%E6%9D%83%E7%B3%BB%E7%BB%9F1%E2%80%94%E2%80%94%E4%B8%96%E7%95%8C%E8%A7%82/) 吗？

> 1. `Rust`中每个值都有一个相应的变量，称之为`owner`。
> 2. 一个值在一个时刻只能有一个`owner`。
> 3. 一旦到了作用域(`scope`)之外，与`owner`相应的值就会被丢弃(`drop`)。

为了不`Move`所有权，我们又引入了`Copy`或者`Borrow`的概念。但是不管怎么说，`Rust`里是强调“单所有权”的，也即资源只能从属于单个`owner`。单所有权有效的保证了内存安全，不过也带来了很大的不方便。拷贝意味着更大的性能消耗和无法改变原对象；而即便是引用和可变引用，用起来也有很多不便之处，比如遭人烦的生命周期检查问题。 <!--more-->

### `Rc<T>`

`std::rc::Rc<T>`，采用了引用计数的方式，让`Rust`在形式上拥有了“多所有权”的能力。`Rc::clone()`并不会对数据做深拷贝，每当我们调用`Rc::clone()`函数，对相关数据的内部引用计数都会`+=1`，然后返回另一个对象供再使用。一旦这个返回对象`scope`结束，就会触发引用计数`-=1`。当内部的引用计数降到0，相关数据就会被清理。

* `Rc::new(T)` :创建一个 `Rc<T>`智能指针
* `Rc::clone(&rc): ` 根据`Rc<T>`类型实例`rc`克隆出一个对象，会增加实例`rc`的引用计数，

`Rust Book` 中有[一段代码](https://doc.rust-lang.org/book/second-edition/ch15-04-rc.html#using-rct-to-share-data)说明`Rc<T>`的“多所有权”作用，我们在此之上加了两句输出：
```Rust
use List::{Cons, Nil};
use std::rc::Rc;

#[derive(Debug)]
enum List {
    Cons(i32, Rc<List>),
    Nil,
}
fn main() {
    let a = Rc::new(Cons(5, Rc::new(Cons(10, Rc::new(Nil)))));
    let b = Cons(3, Rc::clone(&a));
    let c = Cons(4, Rc::clone(&a));

    if let Cons(v,ref x) = b {
        println!("{:?} {:?}",v,x);
    }
    if let Cons(v,ref x) = c {
        println!("{:?} {:?}",v,x);
    }
}
```
事实上，如果不用`Rc<T>`也可以做到共享数据，那就是多个不可变引用`&T`机制：
```Rust
#[derive(Debug)]
enum List<'a> {
    Cons(i32, &'a List<'a>),
    Nil,
}

fn main() {
    let a = Cons(5, &Nil);
    let b = Cons(3, &a);
    let c = Cons(4, &a);
    
    if let Cons(v,ref x) = b {
        println!("{:?} {:?}",v,x);
    }
    if let Cons(v,ref x)= c {
        println!("{:?} {:?}",v,x);
    }
}
```
以上两端代码都会输出：
```
3 Cons(5, Cons(10, Nil))
4 Cons(5, Cons(10, Nil))
```
不过，`&T`用起来蛋疼的地方在于要和生命周期检查作斗争，比如这里我们手工标注了`lifetime`，有时候对于复杂的数据结构，要光靠引用和`lifetime`，是非常吃力的。例如某个数据结构中有引用一个嵌套的对象，为了避免悬空引用，就必须让编译器确认，所引用的那个嵌套对象的`lifetime`绝对不会比外层数据结构的`lifetime`短。

#### `Rc<T>`局限性

1. 尽管`Rc<T>`通过不可变引用，可以让我们在多处共享同一个数据，但是这种共享并不可变，
2. 由循环引用问题，比如A引用B，B引用A，结果谁都无法计数归零。解决这个问题可以使用`Weak<T>`
3. `Rc<T>`只能用于单线程场景。要在多线程场景下使用，还需要`Rc<T>`的线程安全版本`Arc<T>`。

### `std::rc::Weak<T>`

`std::rc::Weak`是`Rc`的弱引用版本，`Weak<T>`并不会增加计数，所以通常可用于解决循环引用问题：
1. 可访问，但不拥有，故不会增加引用计数
2. 可由`Rc<T>::downgrade(&T)`获取一个`Weak<T>`
3. `Weak<T>`类型可以使用`upgrade()`方法转换为`Option<Rc<T>>`类型，如果资源已经释放，则返回值为`Option::None`

一个示例：
```Rust
fn main() {
    let a = Rc::new(Cons(5, Rc::new(Cons(10, Rc::new(Nil)))));
    println!("count={}",Rc::strong_count(&a));                    // count=1
    let b = Cons(3, Rc::clone(&a));                                  
    let c =Rc::downgrade(&a);                                        
    println!("count={}",Rc::strong_count(&a));                    // count=2
    {                                                             
        let d = Cons(4,Rc::clone(&a));                            
        println!("count={}",Rc::strong_count(&a));                // count=3
    }     // d 作用域结束
    if let Some(e) =c.upgrade(){
        println!("弱引用升级成功，count={}",Rc::strong_count(&e)); // count=3
    }     // e 作用域结束
    println!("count={}",Rc::strong_count(&a));                    // count=2
}
```

## `std::sync::Arc<T>`及`std::sync::Weak<T>`

`Rc`只适用于单线程的主要原因之一就是增减操作不是原子的。要在多线程场景下使用，就需要使用特殊的方式，确保引用计数的增减操作是原子的。

### `std::sync::Arc<T>`

`std::sync::Arc`是原子引用计数，可视作`Rc`的多线程版本。

1. `Arc`可跨线程传递，用于跨线程共享一个对象；
2. 用`Arc`包裹起来的类型对象，对可变性没有要求；
3. 一旦最后一个拥有者消失，则资源会被自动回收，这个生命周期是在编译期就确定下来的
4. `Arc`可以视作一个引用，它不影响包裹对象的方法调用形式
5. `Arc`对于多线程的共享状态几乎是必须的（减少复制，提高性能）。

使用示例：
```Rust
use std::sync::Arc;
use std::thread;

fn main() {
    let numbers: Vec<_> = (0..100u32).collect();
    let shared_numbers = Arc::new(numbers);

    for _ in 0..10 {
        let child_numbers = shared_numbers.clone();

        thread::spawn(move || {
            let local_numbers = &child_numbers[..];
            // ...
        });
    }
}
```
### `std::sync::Weak<T>`

与`std::rc::Rc`类似，`std::sync::Arc`也有一个对应的弱引用类型`std::sync::Weak`，可视作`std::rc::Weak`的多线程的版本。用法类似，不做赘述。

## `RefCell<T>`

根据`Rust`的设计，`Rc`及`Arc`具备了共享性，他们就不能具备修改性。为了解决`修改性`问题，这需要使用`RefCell<T>`这个类型：
> Using `RefCell<T>` to be able to mutate an inner value while the outer value is considered immutable

`RefCell<T>`类型提供了`borrow()`和`borrow_mut()` 两个安全的方法。 
1. `borrow()` 方法返回智能指针类型`Ref` 
2. `borrow_mut()`方法返回智能指针类型`RefMut` 

由于`Ref`和`RefMut`这两个类型都实现了`Deref `，所以我们可以当作普通引用那样使用之。`RefCell<T>`对象会追踪当前有多少`Ref`和`RefMut`智能指针是有效的。 每次我们调用`borrow()`, `RefCell<T>`就会增加不可变借用计数，而当一个`Ref`值的作用域结束, 不可变借用的计数就会减1。

就像之前编译期借用规则中说的那样，`RefCell<T>`也只允许我们在任一个时间点上，可以有多个不可变借用，或者唯一一个可变借用。如果我们试图违反这个规则，`Rust`并不会像使用普通引用那样在编译期就报错，而是会在运行时`panic!`。

#### 局限性

根据上文所述，`RefCell`也是采用了简单的引用计数，所以`Rust`规定，它只适用于单线程场景。

## `Rc<T>`和`RefCell<T>`配合使用

`Rc<T>`在形式上给了我们“多所有者”的能力(不可变的访问)，`RefCell<T>`给我们以改变不可变对象内部数据的能力，把这二者结合起来——简单的说，就是让`Rc<T>`包含一个`RefCell<T>`——就能拥有一个类型，其值可以有多个所有者，而且我们还能改变它！

以下这个例子来自 [《The Rust Programming Language》](https://doc.rust-lang.org/book/second-edition/ch15-05-interior-mutability.html#having-multiple-owners-of-mutable-data-by-combining-rct-and-refcellt)
```Rust
use List::{Cons, Nil};
use std::rc::Rc;
use std::cell::RefCell;

#[derive(Debug)]
enum List {
    Cons(Rc<RefCell<i32>>, Rc<List>),
    Nil,
}

fn main() {
    let value = Rc::new(RefCell::new(5));

    let a = Rc::new(Cons(Rc::clone(&value), Rc::new(Nil)));

    let b = Cons(Rc::new(RefCell::new(6)), Rc::clone(&a));
    let c = Cons(Rc::new(RefCell::new(10)), Rc::clone(&a));

    *value.borrow_mut() += 10;

    println!("a after = {:?}", a);
    println!("b after = {:?}", b);
    println!("c after = {:?}", c);
}
```

## `Arc<T>`和`Mutex`配合使用

`Arc<T>`给了我们跨线程共享数据的能力，`Mutex`给了我们锁和修改的能力，把二者结合起来，就能跨进程修改同一个变量！
```Rust
use std::sync::Arc;
use std::sync::Mutex;
use std::thread;

fn main() {
    let global = Arc::new(Mutex::new(0));

    let clone1 = global.clone();
    let h1= thread::spawn(move|| {
        for _ in 0..100{
            let mut value = clone1.lock().unwrap();
            *value += 1;
            println!("from thread1 : current={}",value);
            thread::sleep(std::time::Duration::from_secs(1));
        }
    });

    let clone2 = global.clone();
    let h2= thread::spawn(move|| {
        for _ in 0..100{
            let mut value = clone2.lock().unwrap();
            *value -= 1;
            println!("from thread2 : current={}",&value);
            thread::sleep(std::time::Duration::from_secs(1));
        }
    });

    h1.join().ok();
    h2.join().ok();
    println!("at last value= {:?}", global);
}
```

## 小结

1. 引用计数型指针`Rc<T>`和`RefCell`可以用于单线程版本，虽然各自都有不足，但是结合起来就可以实现单线程下多所有者、内部可变的访问能力(也要满足同一时刻下要么有任意个只读引用、要么只有一个可变引用)。
2. `Weak`是`Rc`的弱引用版本，由于不增加引用计数，可以用于处理循环引用的情况。
3. 在并发情况下，`Arc<T>`提供了和`Rc<T>`类似的能力，是`Rc<T>`的线程安全版本。和`Mutex`连用，可以实现多进程下同时修改同一个变量。