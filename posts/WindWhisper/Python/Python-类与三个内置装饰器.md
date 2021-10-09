---
layout: post
title: Python 类与三个内置装饰器
date: 2017-03-12 17:12:50
tags:
- Python
- 装饰器
- 原理分析
- AOP

categories:
- 风语
- Python
---

在[Python函数装饰器原理分析](http://www.itminus.com/2015/04/10/WindWhisper/Python/Python函数装饰器原理分析/)中说到，Python有几个内置装饰器：

* 类属性`@property`
* 静态方法`@staticmethod`
* 类方法`@classmethod` 

可以用来包装属性、静态方法、和类方法。

首先要说明，本文中所有的类都使用的新式类，即使使用了Python2.7.x版本，某些特性在“old-style”类中也不适用。要使用新式类，有两种方法： 

1. 在`module`顶部添加语句：`__metaclass__ = type` 
2. 定义的类要是内置`object`对象的子类。

## `staticmethod`和`classmethod`

静态方法和类方法都是不需要具体实例就可以运行的。区别在于`classmethod`的第一个参数是`cls`，这是个对“类”的引用。可以通过`cls`对类的属性进行获取。

在没有装饰器的情况下，我们可以使用原始的`staticmethod()`和`classmethod()`函数来定义静态方法和类方法：
```Python
class MyClass:
    
    a=3

    def my_static_method():
        print('This is a static method')
    my_static_method = staticmethod(my_static_method)

    def my_class_method(cls,sth):
        print('This is a class method of', cls.a,sth)
    my_class_method = classmethod(my_class_method)
```

有了装饰器语法糖，以上代码可以改写为：
```Python
class MyClass:

    a=3

    @staticmethod
    def my_static_method():
        print('This is a static method')

    @classmethod
    def my_class_method(cls,sth):
        print('This is a class method of', cls.a,sth)
```

## property 

假设现在有个矩形，可以设置其宽、高。

* 如果需要面积，我们可以使用类似于`area()`的方法来计算。
* 如果需要周长，我们可以使用类似于`perimeter()`的方法来计算。

现在问题来了，类的用户获取宽度的时候用的是`rect.width`，获取面积的时候却要使用`rect.area()`，多了一个冒号！对于这种简单的情况用户似乎还可以分辨，问题是对于一些复杂的类如何保持一致呢？

`Java`中的惯用方法是定义私有的`width`、`height`，然后定义公有方法`getWidth()`、`getHeight()`、`getArea()`、`getPerimeter()`。`C#`的惯用方法是采用：

```CSharp
class Rectangle {
    public double Width { get; set; }
    public double Height { get; set; }
    public double Area {
        get{ return Width*Height; }
    }
    public double Perimeter {
        get{ return (Width+Height)*2; }
    }
}
```

对于`Python`这种动态语言来说，上`Java`那一套是不符合价值观的，可以用`perperty()`加以包装：
```Python
class Rectangle(object):
    def __init__ (self,width,height):
        self.__width = width
        self.__height = height

    def get_width(self):
        return self.__width
    def set_width(self, size):
        self.__width= size
    width=property(get_width,set_width)
    
    def get_height(self):
        return self.__height
    def set_height(self,size):
        self.__height=size
    height=property(get_height,set_height)

    def area(self):
        return self.width*self.height
    area=property(area)
    

    def perimeter(self):
        return (self.width+self.height)*2
    perimeter=property(perimeter)
```

这样，就使用了`property()`函数包装出了`width`、`height`、`area`、`perimeter`三个特性:
```Python
rect=Rectangle(3,4)
rect.width=5
rect.height=6
print(rect.width)
print(rect.height)
print(rect.area)
print(rect.perimeter)
```

有了装饰器语法，以上代码可以简化为：
```Python
class Rectangle(object):
    def __init__ (self,width,height):
        self.__width = width
        self.__height = height

    @property
    def width(self):
        return self.__width
    
    @width.setter
    def width(self, size):
        self.__width= size
    
    @property
    def height(self):
        return self.__height
    
    @height.setter
    def height(self,size):
        self.__height=size

    @property
    def area(self):
        return self.width*self.height
    
    @property
    def perimeter(self):
        return (self.width+self.height)*2
```

## Property 魔法 

利用`@property`装饰一个方法函数，看起来非常完美。但是有一个问题，经过`property()`函数返回的还是一个函数，为什么`Python`可以直接通过`rect.width`这种普通属性语法拿到宽度值呢？

这其实是`Python`的魔法：`property`返回了一种特殊的属性，访问时会计算它的值！如果没有`property`，则会以简单属性的方式去访问。

事实上，`Python`类实例方法的调用也是很意思的，对于这样一个类：
```Python
class Foo(object):
    def bar(self,x):
        return x
```

实例方法的调用某种程度上可以认为是这样：
```Python
foo=Foo()
bar=foo.bar    # 这里返回的方法不是原始的bar函数，是绑定方法对象
bar(x)
```

首先获取 Foo 类的 bar 的绑定方法（`bound method`）对象，它类似于`partial`方法，已经绑定了`self`参数，显然，这个绑定方法并原始的函数对象 bar。绑定方法对象是由在后台执行的特性函数静默创建的！

`@staticmethod` `@classmethod` 定义静态方法和类方法时，实际上就指定了使用不同的特性函数，以不同的方式处理对这些方法的访问。`staticmethod`表明按原样返回方法函数，不会进行任何包装。
