---
title: Python函数装饰器原理分析
date: 2015-04-10 09:27:08
tags:
- Python
- 装饰器
- 原理分析

categories:
- 风语
- Python
---


函数装饰其实类比为游戏里装备强化的概念。比如将一个具有附加火性伤害的宝石，镶嵌到了一个主武器上，那么武器就能在原有功能的基础之上附带有火伤效果。具体到Python函数装饰就是，一个装饰器函数dec，装饰到了一个函数foo上，就能让foo具有dec功效，可以形象得说成是dec装饰到了foo上。

先抛开游戏程序的概念不谈，假如我们有一个函数foo()
```Python
def foo():
     print("calling foo():\thave fun with Brz")
```
出于某种原因，有一天我希望在函数原有功能之上追加一点工作量——在函数执行之前和之后实现一些和foo函数完全可以分离的工作，我们当然不想直接改动已经写好的foo(),所以自然而然想去定义一个新函数，在这个函数内部调用原函数：
```Python
def foo_appended(func):
     print("before calling:\tmiss Brz")
     func()
     print("after calling:\tsay good bye")
     foo_appended(foo)
```
输出为：
```
before calling:    miss Brz
calling foo():    have fun with Brz
after calling:    say good bye
```
这种做法，对于一些小程序当然没有问题，但是对于稍微大的项目或者涉及到接口的时候情况就明显不同了：假如用户（可以是其他程序员，也可以是自己）使用了旧函数foo() ，就得把之前所有的foo()全部改成foo_appended(foo)，这是个很糟糕的事情。
更关键的，这样一点都不符合`AOP`！

在不改动原foo()内部实现代码的情况下，既要不改动原函数foo()的名称，又想在foo()原有工作前后追加工作量，这需要一个偷梁换柱的方法来实现：

+ 定义一个新函数，此函数会接受函数对象作为输入参数，以确保能执行其功能
+ 在新函数内定义一个和旧函数参数列表一致的包装函数，同时添加欲追加的工作量,甚至修改旧函数。
+ 新函数返回值设置为包装函数
+ 把旧函数对象传递给新函数去执行，返回值(包装函数)赋值到旧函数名上。
+ 用户以旧函数之名调用包装函数。

```Python
def foo(): #原有函数
     print("while calling :\thave fun with Brz")

def foo_appended(func): #定义一个新函数（装饰函数），装饰函数接受一个函数对象作为参数
     def wrap(): #包装出一个与所接受的函数对象的参数列表相一致的函数
         print("before calling :\tmiss Brz") 
         func() #执行所接受的函数对象的函数操作
         print("after calling :\tsay good bye to Brz")
     return wrap #返回包装类
foo = foo_appended(foo) #先执行foo_apended(foo)，再把返回的包装函数这个函数对象赋值给foo

#用户调用其熟悉的foo()
foo()
```
输出结果为：
```Python
before calling :    miss Brz
while calling :    have fun with Brz
after calling :    say good bye to Brz
```
这就是函数装饰的基本原理与实现。

为了把装饰函数和被装饰函数的脉络在代码形式上表现的更清晰、简介，我们可以使用函数装饰符@
```Python
def dec_foo(func):
     def wrap(p):
        #do something
         pass #func and sth
     return wrap
@dec_foo
def foo(p):
    #do something
     pass
```

阅读别人的代码，更多的是看到
```Python
@dec
def foo(para):
     pass 
```
的形式，从这个形式，我们可以得出结论，

``dec接收一个func参数，内部会一个参数列表和原foo函数的参数列表保持兼容的包装函数。原foo经过装饰后（重新赋值后），就有了装饰器函数的功能。``

总结来说，装饰器函数只做三件事：

1. 接收一个函数作为参数，

2. 然后嵌套一个包装函数（包装函数的参数列表与原来的函数参数列表兼容），

3. 再返回嵌套函数对象。

这个包装函数会做三件事

1. 接受参数：能兼容原函数参数列表

2. 执行原函数

3. 执行附加功能

related:
类属性@property、类静态方法@staticmethod、类方法classmethod@装饰器。这三个是和面向对象相关的。






 
