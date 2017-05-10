---
title: Python 属性搜索链、descriptor 与@property
date: 2017-04-20 09:54:12
tags:
---

## __dict__ 和 __slots__ 魔法属性

* `__dict__`: 一个字段或者映射，用于存储对象属性，默认情况下，`Python`将对象的自定义成员以键值对的形式保存到`__dict__`字典中
* `__slots__`: 如果定义了 `__slots__` ,就不会再用字典来存储实例数据(实际是用一种更紧凑的数据结构，基于数组实现)，这是一种对内存和速度的优化。

在类的内部，实例是用字典来实现的，可以用实例的 `__dict__` 属性访问该字典，这个字典包含的数据对每个实例都是唯一的。

观察一个有意思的案例：
```python
class Rectangle(object):
    def __init__(self,width,height):
        self.__width=width
        self.__height=height
    
    @property
    def width(self):
        return self.__width

    @width.setter
    def width(self,value):
        self.__width=value

    @property
    def height(self):
        return self.__height
    @height.setter
    def height(self,value):
        self.__height=value
    
rect=Rectangle(3,4)

print(rect.__dict__)
print(Rectangle.__dict__)
```

输出类似于：
```python
{'_Rectangle__width': 3, '_Rectangle__height': 4}
```
和
```python
{'__module__': '__main__', 'height': <property object at 0x0000000002E105E8>, 'width': <property object at 0x0000000002E10638>, '__dict__': <attribute '__dict__' of 'Rectangle' objects>, '__weakref__': <attribute '__weakref__' of 'Rectangle' objects>, '__doc__': None, '__init__': <function __init__ at 0x0000000002E126D8>}
```

1. 类的每个实例都有自己的 `__dict__`，
2. 类自身也是一个对象，也有 `__dict__` ，其中存储了attribute、property等

## 属性查找

### 两个魔法方法：

1.  `__getattribute__`:
```Python
obj.__getattribute__(self, name)
```
当访问属性时，此方法会被调用。返回属性值或者引发`AttributeError` 异常。

注意此方法相对于 `__getattr__()` 方法拥有绝对优先权，除非 `__getattribute__()` 内部显式去调用 `__getattr__()` 或者引发 `AttributeError`，否则即使定义了 `__getattr__()` ，也不会去调用。

2.  `__getattr__`:
```Python
obj.__getattr__(self,name)
```
当`obj.__getattribute__(name)`找不到相应属性，才会发生调用。这是一个兜底方法，要么返回 attribute value，要么抛出 `AttributeError`异常。


### 优先级

a.x 的搜索连:

1. `a.__dict__['x']` 
2. `type(a).__dict__['x']`, 
3. 逐级找出 type(a) 的超类(不包括 metaclasses) 的 __dict__['x']

`Python`在查找属性时，会调用特殊方法：`obj.__getattribute__("name")`，该方法执行搜索来查找属性，涉及检查`property`、局部查找 `__dict__` 属性、检查类字典、以及搜索基类。如果查找失败，则会调用类的 `__getattr__` 方法来查找属性，如果还是失败，就会抛出`AttributeError`异常。

```python
def __getattribute__(self, key):
    "Emulate type_getattro() in Objects/typeobject.c"
    v = object.__getattribute__(self, key)
    if hasattr(v, '__get__'):
        return v.__get__(None, self)
    return v
```

搜索属性时候，优先搜索示例自身的 `__dict__`，如果找不到，则在实例所属类的`__dict__`中继续搜索，然后逐级搜索超类的`__dict__`。

如果类中发现了该属性，并且是一个用户定义的函数，则会被转换为一个实例方法对象，其`__self__`属性指向相应的实例.


对于对象而言，b.x 类似于:
```python
type(b).__dict__['x']\
       .__get__(b,type(b))    # 尝试调用 descriptor
``` 

对于类调用，B.x 类似于:
```python
B.__dict__['x']\
    .__get__(None, B)        # 尝试调用 descriptor
``` 

默认优先级别链：
1. `data descriptor` 
2. `instance variables` 
2. `non-data descriptor`, 
3. and assigns lowest priority to __getattr__() if provided.


### 属性设置和删除函数

Attribute 赋值、删除更新的是实例字段，永远不会更新类的字典，如果类中定义了 `__setattr__()`、`__delattr__()`方法 ,则会被调用

1. 属性设置
```
obj.__setattr__(self,name,value)
```

当属性赋值的时候触发调用，通常的实现会调用 `self.__dict__[name]=value`


2. 属性删除

等价于
```
obj.__delattr__(self,name)
```
当执行 `del obj.name`的时候触发调用。这些方法的默认行为是修改或者删除 obj 的局部 `__dict__`值，除非请求的属性是一个 property 或者描述符。

## descriptor

`descriptor`是本质上是一种拥有绑定行为的对象属性，然而其属性访问行为（默认是`get`、`set`、`delete`）被 `__get__()`, `__set__()`, 和 `__delete__()`所重写。如果一个对象定义了这三个方法中的任一一个，它即为一个`descriptor`。

descriptor 协议：
```Python
descr.__get__(self, obj, type=None) --> value

descr.__set__(self, obj, value) --> None

descr.__delete__(self, obj) --> None
```

属性访问的默认行为是`get`, `set`, `delete`。比如, a.x has a lookup chain 

1. 自身`__dict__`: a.__dict__['x'],  
2. 父类`__dict__`: type(a).__dict__['x'], 
3. 逐级查找超类 （不包括`metaclasses`）

然而，如果找到的值是一个定了描述符方法的对象，那么`Python`就会转而调用描述符方法。（只对新式类有效）

`property()` 函数返回一个 `descriptor`。