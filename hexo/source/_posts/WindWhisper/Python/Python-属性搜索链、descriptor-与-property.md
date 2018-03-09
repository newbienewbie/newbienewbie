---
title: Python 属性搜索链、descriptor 与@property
date: 2017-04-20 09:54:12
tags:
- Python
- 属性搜索链
- descriptor
- property
categories:
- 风语
- Python
---

## `__dict__` 魔法属性

在类的内部，实例是用字典来实现的，可以用实例的 `__dict__` 属性访问该字典，这个字典包含的数据对每个实例都是唯一的。

`__dict__`表示一个对象的内部字段或者映射，用于存储对象属性，默认情况下，`Python`将对象的自定义成员以键值对的形式保存到`__dict__`字典中。

```python
class MyClass(object):
    greetings = "hello,world"

mc=MyClass()
mc.greetings="Fuck,world"
```
这里`MyClass`这个类对象有一个`__dict__`字典，内部存储了属性`greetings`及其值`hello,world`，现在其实例对象`mc`也有一个`__dict__`字典，内部存储了`greetings="Fuck,world"`。

在任何时候，向对象上添加属性，都会改变到`__dict__`属性上，而任何时候对`__dict__`的修改，也会同步反应到属性中。

默认情况下，
```python
obj.keyname=value
```
等价于：
```python
obj.__setattr__(keyname,value)
```
这两个方法都会修改`__dict__`。但是如果对象是一个property或者一个描述符，属性的设置和删除将由相关联的函数执行。

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

属性查找的关键是两个魔法方法。

### `__getattribute__`:
```Python
obj.__getattribute__(self, name)
```
当访问属性时，此方法会被调用。返回属性值或者引发`AttributeError` 异常。

注意此方法相对于 `__getattr__()` 方法拥有绝对优先权，除非 `__getattribute__()` 内部显式去调用 `__getattr__()` 或者引发 `AttributeError`，否则即使定义了 `__getattr__()` ，也不会去调用。默认情况下，`__getattribute__()`，会优先调用`data descriptor`，然后是实例字典，然后是`non-data descriptor`，这留待后文详述。

### `__getattr__`:
```Python
obj.__getattr__(self,name)
```
当`obj.__getattribute__(name)`找不到相应属性，才会发生调用。这是一个兜底方法，要么返回 attribute value，要么抛出 `AttributeError`异常。

### 查找顺序

 在`Python`中查找属性时，`Python`将调用特殊方法`obj.__getattribute__(keyname)`，先搜索相关属性；如果搜索失败，`Python`将试图调用类的`__getattr__()`方法（如果已经定义）；如果还是失败，就抛出`AttributeError`。


## 属性设置和删除函数

`Python`中，属性的查找通常要回溯到实例的类、超类，这种回溯有利于对象属性的共享；但是属性的赋值、删除更新的是实例字段，永远不会更新类的字典。

在属性进行赋值、删除时候，如果类中定义了`__setattr__()`、`__delattr__()`方法 ，则会被调用。

1. 属性设置
```python
obj.__setattr__(self,name,value)
```
当属性赋值的时候触发调用，通常的实现会调用 `self.__dict__[name]=value`

2. 属性删除

等价于
```python
obj.__delattr__(self,name)
```
当执行 `del obj.name`的时候触发调用。这些方法的默认行为是修改或者删除 obj 的局部 `__dict__`值，除非请求的属性是一个 property 或者描述符。

## descriptor

`descriptor`(描述符)是本质上是一种拥有绑定行为的对象属性——其属性访问行为（`get`、`set`、`delete`）被 `__get__()`, `__set__()`, 和 `__delete__()`所重写。如果一个对象定义了这三个方法中的任意一个，它即称为一个`descriptor`。而所谓`descriptor`协议，其实就是以下三个方法(不一定要全部实现，有任意一个都行）：
```Python
descr.__get__(self, obj, type=None) --> value

descr.__set__(self, obj, value) --> None

descr.__delete__(self, obj) --> None
```

我们知道，默认情况下属性访问会从对象的字典进行 `get`、`set`、`delete`操作，例如，`a.x`会先搜索`a.__dict__['x']`，然后搜索`type(a)__dict__['x']`，然后继续再在`type(a)`的基类上找，如此不停寻找（不会找到`metaclass`）。然而，如果所搜索的值定义了`descriptor`方法之一，那么`Python`就会转而调用描述符方法.

举一个简单的例子:
```python
class MyDescriptor(object):

    def __init__(self, init_val=None ):
        self.val = init_val

    def __get__(self, obj, objtype):
        return self.val

    def __set__(self, obj, val):
        self.val = val


class MyClass(object):
    x = MyDescriptor(10)

print(MyClass.__dict__['x'])
print(MyClass.__dict__['x'].__set__)
print(MyClass.__dict__['x'].__get__)
```

描述符可以分为两种：如果一个描述符只定义了`__get__()`，称之为`non-data descriptor`，如果一个描述符同时定义了`__get__()`、`__set__()`，则称之为`data descriptor`。
1. 如果一个实例的 *字典* 中，有一项和 *描述符对象* 有同样的名字，且该描述符是`non-data descriptor`，则该实例的 *字典* 优先
2. 如果一个实例的 *字典* 中，有一个项和 *描述符对象* 有同样名字，且该描述符是`data descriptor`，则该 *描述符对象* 优先

关于`data descriptor`和`non-data descriptor`的很重要一点区别在于，由于`data descriptor`优先级更高，属性访问操作和实例的`__dict__`并不关联；而`non-data descriptor`则不然，其优先级比实例的字典`__dict__`更低，故属性访问实际上是在操作`__dict__`属性。举个例子：
```python
class NonDataDescriptor(object):
    def __init__(self,key,value):
        self.key=key
        self.value=value

    def __get__(self,obj,objtype):
        return self.value
    
class DataDescriptor(object):
    def __init__(self,key,value):
        self.key=key
        self.value=value

    def __get__(self,obj,objtype):
        return self.value
    
    def __set__(self,obj,value):
        self.value="### "+value

class MyClass(object):
    greeting1=NonDataDescriptor("greeting1","### Hello,world")
    greeting2=DataDescriptor("greeting2","### Hello,world")

mc=MyClass()
print(mc.greeting1)         # 这里，会输出 '### Hello,world'
mc.greeting1="Fuck,world"   # 这里，其实是在设置mc.__dict__属性
mc.greeting2="Fuck,world"   # 这里，并不会去操作mc.__dict__属性
print(mc.__dict__)          # 这里，输出的是 {'greeting1': 'Fuck,world'}
```

### 描述符`__get__()`方法的调用优先级

属性查找的默认优先级别链为：
1. `data descriptor`优先级最高
2. `instance variables` 优先级次之
2. `non-data descriptor` 优先级再次之
3. `__getattr__()` 优先级最低

具体调用细节还得区分`obj`是类和普通对象。
对于对象的`data descriptor`属性访问，根据`object.__getattribute__(self,name)`方法，会将`b.d`的调用转换为了`type(b).__dict__['d'].__get__(b,type(b))`，注意，这里先去类的`__dict__`找，然后再调用所找到的描述符的`__get__()`方法。
对于类的`data descriptor`，根据`type.__getattribute()__`方法，会将`B.d`转换为了`B.__dict__['d'].__get___(None,B)`，根据[`Python`官方文档](https://docs.python.org/3/howto/descriptor.html)，基本上等同于：
```python
def __getattribute__(self, key):
    "Emulate type_getattro() in Objects/typeobject.c"
    v = object.__getattribute__(self, key)
    if hasattr(v, '__get__'):
        return v.__get__(None, self)
    return v
```
不管怎么说，`descriptor`的`__get__()`方法是用`__getattribute__()`方法调用的。如果覆盖`__getattribute__()`方法，则默认的描述符方法调用行为也会被改写。

### 描述符`__set__()`方法和`__setattr__()`的调用优先级

实例的属性查找通常需要回溯到超类，而实例属性的设置、删除比然只会操作自身的`__dict__`字典，不会影响到父类。与这种不对称性相类似的还有`__setattr__()`方法和`__getattr__()`相对于`descriptor`的优先级不对称性！`__getattr__()`相对于`descriptor`有最低的优先级；而相对于`__set__()`，`__setattr__()`的优先级却更高！

举个例子:
```python
class DataDescriptor(object):
    def __init__(self,key,value):
        self.key=key
        self.value=value

    def __get__(self,obj,objtype):
        return self.value
    
    def __set__(self,obj,value):
        print("### __set__() called : "+ self.key + " = " +value)
        self.value="### "+value

class MyClass(object):
    greeting2=DataDescriptor("greeting2","### Hello,world")

    def __getattr__(self,name):
        return object.__getattr__(self,name)

    def __setattr__(self,name,value):
        print("@@@ __setattr__() called : "+ name +" = " + value)
        self.__dict__[name]="@@@ "+value

mc=MyClass()
mc.greeting2="Fuck,world"   # 这里，并不会去操作mc.__dict__属性
print(mc.greeting2)         # 这里，会输出什么？ 是`### Hello,world` !!
print(mc.__dict__)          # 这里，输出的是 {'greeting1': '@@@ Fuck,world'}
```
输出的结果是:
```
@@@ __setattr__() called : greeting2 = Fuck,world
### Hello,world
{'greeting2': '@@@ Fuck,world'}
```
这里有两个需要注意的地方：
1. 对MyClass的实例`mc`调用`mc.__setattr__()`方法，并没有触发`data descriptor`调用。从而改写了对象实例的`__dict__`
2. 对实例`mc`调用`mc.greeting2`，尽管实例的`__dict__`中存储了`greeting2`，但是由于`data descriptor`优先级更高，所以返回的仍然是描述符初始化的`### Hello,world`。

### 描述符与对象方法调用机制

类字典中将方法作为函数来存储，所有的方法都是定义了`__get__()`的`non-data descriptor`。方法被实例以`obj.func()`的形式调用，其实可以分成两步：首先会进行属性查找，由于是个`descriptor`，这一步会利用`__get__()`返回绑定了`self`的函数；然后再对函数对象进行调用。最终从形式上看，`obj.f(*args)`的调用等同于`f(obj, *args)`。

```python
class Function(object):
    . . .
    def __get__(self, obj, objtype=None):
        "Simulate func_descr_get() in Objects/funcobject.c"
        if obj is None:
            return self
        return types.MethodType(self, obj)
```

类似的，对于`classmethod`(类方法)，也会进行绑定，不过绑定对象变成了类。而对于`staticmethod`(静态方法)，则无需绑定，直接返回原函数。

|Transformation  |Called from an Object      | Called from a Class |
|----------------|---------------------------|---------------------|
| `function`     |  `f(obj, *args)`          | `f(*args)`          |
| `classmethod`  |`f(type(obj), *args)`      | `f(klass, *args)`   |
| `staticmethod` | `f(*args)`                | `f(*args)`          |


```python
class StaticMethod(object):
    "Emulate PyStaticMethod_Type() in Objects/funcobject.c"

    def __init__(self, f):
        self.f = f

    def __get__(self, obj, objtype=None):
        return self.f
```