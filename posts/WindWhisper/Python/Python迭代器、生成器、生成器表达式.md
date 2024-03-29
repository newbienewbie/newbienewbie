---
layout: post
title: Python 迭代器、生成器、生成器表达式
date: 2015-04-10 09:27:08
tags:
- Python
- 原理分析
- 生成器

categories:
- 风语
- Python
---



# 从iter()和next()两个内置函数说起

迭代过程的本质是循环，为了回归本质，考虑一个最简单的C语言for循环

```C
for(int i=0;i<10；i++){
    printf(“%d\n”,i);
}
```


这个循环过程是通过循环变量控制的：
* 首先i=0，执行循环语句；
* 然后i=1，执行循环语句；
* …
* 然后i=9，执行循环语句；
* 然后i=10，终止循环。

可以发现，在这个循环过程中，循环过程控制变量i有个初值，然后每一次循环之后这个循环控制变量都要变化到另一个值以控制下一次循环。
循环过程控制变量的概念可以类比到迭代器上，迭代器就是迭代过程控制器。和循环控制过程一样，要实现迭代控制，迭代器必须也有个初值，然后在每一个迭代过程都要能按一定规律变化到另一个值。因此，一个对象要成为迭代器，必须拥有两个能力：

* 能给定自己的初始状态
* 能把迭代器对象从当前状态变化到后续状态

Python3.x提供了2个内置函数来实现这一控制。

* iter()：利用一个可迭代对象生成迭代器，即iter(iterable)==> iterator ，此内置函数会调用iterable.__iter__()方法。
* next()：把一个迭代器从当前状态变化到后续状态，即next(iterator[, default])==>the next item from the iterator. 可以调用iterator.__next__()方法 。（注意，原Python2.7里iterator .next()的调用方式在3.x里已经被移除）

这里有两个关键的概念是iterable和iterator。

# iterable和iterator

此部分翻译自官网文档，并加入一些自己的理解

> iterable：可迭代对象。一种能够一次返回其一个member的object（”An object capable of returning its members one at a time”）。这句话读起来很拗口，不准确的说，iterable代表了序列、集合和其他类似集合的对象，他们是可以迭代的，他们是一系列item的整体。 iterables例子包括所有的sequence types（比如list，str, and tuple）和一些如dict、file以及一些你定义了__iter__()或__getitem__()方法的Class的非序列类型 。iterable能被用于for循环和其他需要一个sequence的场景。可以用iter(iterable)返回一个iterator。当使用iterables，通常没必要自己亲自调用iter()或者处理iterator 对象。for语句会帮我们自动创建未命名的临时变量来容纳loop持续期间的iterator。

> iterator：迭代器。一种代表了一系列数据的对象（An object representing a stream of data）. 在这一系列数据的对象中，会重复调用iterator's的__next__()方法，并返回成功了的items。当没有合适数据的时候会引发StopIteration 异常 。所有迭代器都要求实现一个能返回自身iterator对象的__iter__() 方法 ，所以每一个iterator都是一个iterable，并且能被用在很多能接受iterables地方。值得注意的是，每次将container object传递给iter()，或者在for-loop里调用，都会产生一个崭新的iterator。

不准确的说，对于Python
* 如果一个对象，拥有__iter__()方法（可以给定自己初始状态），则其为iterable。
* 如果一个对象，拥有__iter__()和__next__()方法（可以给定自己的初始状态+可以从一个状态变化到另一个后续状态），则其为迭代器。

``注意：不要以为Python的序列类型（如list,tuple,str）是迭代器，实际上它们只是可迭代对象``。如果你直接对调用next(list)就会发现系统提示你list object is not an iterator。对于一个list对象a_list，可以通过iter(a_list)生成一个迭代对象，也可以通过生成器表达式或者生产器函数得到一个迭代器。参见生成器

那么为什么要区分一个可迭代对象和迭代器对象呢？其理由和Java中的iterable、iterator一样。
简单的说，
* iterable更多的是代表了一个包含若干items的整体，这类整体是可以进行迭代(遍历)的；
* 而iterator则更多表达了一个拥有当前状态的iterable对象，这个iterator对象会经过next()对其自身的状态进行变更。
比如，一个列表对象(iterable)是包含若干items的sequence，但是列表对象(iterable)并不应该标记当前状态是哪一个item——这个工作应该交给一个与iterable相关的迭代器对象（iterator）来处理（通过iter(iterable)得到）。


# Python for...in...的本质

Python的for...in...循环语法和bash shell的for...in...语法有一定程度的类似。一个简单的Python for语句如下：
```Python
a_list = ['a', 'b', 'mpilgrim', 'z', 'example']
for i in a_list:
    print(i)
```

其过程可以理解为迭代之初，Python自动调用了iter(a_list)生成一个iterator对象，不妨暂时称之为iterInstance（实际上这是个未命名的变量），过程可以描述为：iterInstance=iter(a_list),然后在循环过程中一路next(iterInstance)，直至抛出StopIteration。
这两个内置函数iter()、 next()是和迭代器内部的__iter__()和__next__()两个方法是对应的。

这一点和PHP的`foreach($iter as $k=>$v)` 不同，PHP中，foreach操作的是iterator，而Python中for in 操作的则是iterable。

# 自定义的Python iterator类

根据Python官网PEP-0234，一个Class想要变成一个迭代器，应该实现两个方法：
一是__next__()方法（原文是next()方法，但是在最新的Python3.x此方法被移除了，统一表示为__next__()方法，还增加了个和iter()对应的内置函数next()），__next__()方法要么返回本次迭代过程的the next value ,要么引发一个StopIteration表示本次迭代终止。
二是实现一个__iter__() 方法，会返回自身这个迭代器。
以下代码引自《深入 Python 3》第七章：
```Python
class Fib:
    def __init__(self, max):
        self.max = max

    def __iter__(self):
        self.a = 0
        self.b = 1
        return self

    def __next__(self):
        fib = self.a
        if fib > self.max:
            raise StopIteration
        self.a, self.b = self.b, self.a + self.b
        return fib
for n in Fib(1000):
    print(n,)
```

for循环过程为:
+ Fib(1000)调用__init__()生成一个fib对象（即一个Instance of Fib）,对应的fib.max=1000，
+ 然后调用iter(fib)通过fib.__iter__()得到了一个fibIterator，也即为上述for循环里的n，不过为了清楚表示这是个Fib类的迭代器，不妨暂时称之为fibIterator，于是对应的fibIterator.a=0，fibIterator.b=1。
+ fibIterator循环体执行（此处即为由print打印）后，后台调用next(fibIterator),通过fibIterator.__next__()得到下一个fibIterator。

# 生成器（Genenrator）与生成器表达式

使用iterable或者iterator对象，有时候会遇到的问题是，一次性产生一系列元素会有些不划算。比方说，有一个很大的a_list对象，我们需要对其每一个元素都以f(x)的映射关系生成中间变量temp_list对象，后面再对，一个思路是列表解析：
```Python
temp_list=[f(i) for i in a_list ]
```
但是这样比较耗费内存，生成器可以解决这一问题。

仅从字面意义上说，生成器Generator就是指能生成多个对象的对象。生成器是迭代器的一个派生类。在函数内部，通过使用yield使函数挂起（suspend），并生成（yield）了相应对象，当下一次运行的该函数的时候，该函数会从原来挂起的地方继续运行。

我们可以通过在函数内部使用一系列yield来使函数对象表现出迭代器的性质。yield提供了非常便利的迭代方式。
我们也可以用生成器表达式来生成迭代器。
例如：
```Python
 for i in a_list:
        yield f(i)
```
  或者：
```Python
（f(i) for i in a_list）
```
都可以从a_list映射出一个新的迭代器

注意！``生成器表达式的值是迭代器（iterator）！生成器表达式的值具有一次性使用的特点！``换言之，如果这个生成器表达式的值已经在之前遍历结束，再次遍历的时候迭代器并不会自动重新开始！如果需要多次使用，务必重新产生一个生成器！

```Python
>>> a_dict={'a':1,'b':2,'c':3,'d':4,'e':5}
>>> x_gen=((a,b) for a,b in a_dict.items())
>>> for item in x_gen:
...      print(item)
... 
('b', 2)
('c', 3)
('a', 1)
('d', 4)
('e', 5)
>>> for item in x_gen:    #这里x_gen在上一步已经遍历结束了！继续遍历的什么结果都没有！
...       print(item)
... 
>>> 
```

 
 
