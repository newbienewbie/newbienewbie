---
title: Python函数装饰器原理分析
date: 2015-04-10 09:27:08
tags:
- Python
- 装饰器
- 原理分析
- AOP

categories:
- 风语
- Python
---


函数装饰其实类比为游戏里装备强化的概念。比如将一个具有附加火性伤害的宝石，镶嵌到了一个主武器上，那么武器就能在原有功能的基础之上附带有火伤效果。具体到Python函数装饰就是，一个装饰器函数dec，装饰到了一个函数foo上，就能让foo具有dec功效，可以形象得说成是dec装饰到了foo上。

## 基本原理

### 从扩展功能说起

先抛开游戏程序的概念不谈，假如我们有一个函数foo()
```Python
def foo():
     print("calling foo():\thave fun with Brz")
```

出于某种原因，有一天我希望在函数原有功能之上追加一点工作量——在函数执行之前和之后实现一些和 foo 函数完全可以分离的工作，我们当然不想直接改动已经写好的 foo ,所以自然而然想去定义一个新函数，在这个函数内部调用 foo 函数：

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
这种做法，对于一些小程序当然没有问题，但是对于稍微大的项目或者涉及到接口的时候情况就明显不同了：假如用户（可以是其他程序员，也可以是自己）使用了 foo() ，就得把之前所有的 foo() 全部改成 foo_appended(foo) ; 随着要附加的事情（权限检查、其他检查、日志记录、触发某个接口等）越来越多，最后的函数名可能是 foo_f1_f2_f3_f4_f5_appended 这种，这很显然是个很蠢的做法。
更关键的，这样一点都不 [AOP](http://www.itminus.com/tags/AOP/) ！一个有追求的人绝不会容忍这种代码！

### 装饰器实现

理论基础是`Python一切皆对象，包括函数`。所以可以对函数进行普通对象一样的操作：接收作为参数、传递为返回值、赋值（引用新对象）。
为了方便起见，我们不妨把目标函数称之为"目标函数",在不改动目标函数内部实现的情况下，想在目标函数原有工作前后追加工作量(甚至完全替换掉目标函数的工作)，这需要一个偷梁换柱的方法来实现：

+ 定义一个新函数，此函数会接受函数对象作为输入参数，以确保能执行其功能
+ 在新函数内定义一个和目标函数参数列表一致的包装函数，同时添加欲追加的工作量,甚至修改目标函数。
+ 新函数返回值设置为包装函数
+ 把目标函数对象传递给新函数去执行，返回值(包装函数)赋值到目标函数名上。
+ 用户以目标函数之名调用包装函数。


```Python
def foo(): #目标函数
     print("while calling :\thave fun with Brz")

def foo_appended(func): #定义一个新函数（装饰函数），装饰函数接受一个函数对象作为参数
     def wrap(): #包装函数
         print("before calling :\tmiss Brz") 
         func() #执行目标函数
         print("after calling :\tsay good bye to Brz")
     return wrap #返回包装函数

foo = foo_appended(foo) # foo不再指向原始的目标函数，而是指向包装函数

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

### 核心思想

Python装饰器能扩展原函数，核心在于动态生成了一个包装函数，该包装函数负责扩展目标函数(甚至完全替换掉目标函数的所有工作)。最后把该包装函数当目标函数一样使用。

对诸如`PHP`、`JavaScript`这类动态语言，甚至对于`C`/`C++`，由于函数指针的存在，可以很容易写出类似的装饰器。
那么，对于`Java`,如何实现？装饰器模式、代理模式便是解决方案。思路是类似的，当然也是生成一个包装对象（代理），通过包装对象（代理）来扩展原始对象！


## 语法糖

为了把装饰函数和被装饰函数的脉络在代码形式上表现的更清晰、简介，我们可以使用函数装饰符`@`这个语法糖 

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

可以把第2步、第3步合并为一步，但是根本要旨是要返回一个函数对象（对目标函数进行包装，不妨称之为包装函数）。

这个包装函数会做三件事

1. 接受参数：能兼容目标函数参数列表
2. 执行目标函数
3. 执行附加功能


## 装饰器的应用

装饰器的应用非常多，比如：
* `Python`本身内置了和面向对象相关的装饰器：类属性`@property`、类静态方法`@staticmethod`、类方法`@classmethod`装饰器。
* 在`Django`中随处可见诸如`@require_login`检查登陆之类的功能。

不管咋说，它始终都是用来做``功能解耦、代码分离``的。在 Java Spring 中，我们也经常需要做类似的事情，比如为某些组件添加权限检查、日机功能，一个好的思路就是采用 [AOP](http://www.itminus.com/tags/AOP/) ,就是为相应组件建立切面(`Aspect`)，然后针对相应的连接点(`JointPoint`)进行增强(`Advice`)。

回到本文开头提到的游戏装备强化的概念上来，假如现在我们想为某款游戏开发一个辅助工具——装备模拟器，要模拟宝石强化后附伤效果。

首先定义一个伤害数据类型:
```Python

class Damage:
    '''
    damage data structure
    '''

    def __init__(self):
        self._damage={ 'fire':0, 'ice':0, 'poison':0, 'wind':0 }

    def add(self,key,value):
        self._damage[key]=self._damage[key]+value
    
    def minus(self,key,value):
        self._damage[key]=self._damage[key]-value
        if(self._damage[key]<0):
            self._damage[key]=0

    def __getattr__(self,key):
        return self._damage[key]

```

现有一个白板武器伤害计算公式(根据武器等级计算)，返回`Damage`对象。其中某个实现可能是长这样：
```Python
def weapon_damage(weapon_level):
    '''
    calculate the damage according to weapon_level
    '''

    damage=Damage()
    damage.add('fire',weapon_level*2.1)
    damage.add('poison',weapon_level*1.7)
    return damage 
```

许多游戏都有武器强化系统，经过某种宝石镶嵌，会为之添加附伤效果。为了扩展 `weapon_damage` 的功能，使得可以计算经过宝石镶嵌后的武器伤害，我们需要为之编写装饰器：
```Python
def perled_damage(weapon_damage,perl_level): 
    '''
    decorator:return a new weapon_damage function
    '''
    def wrap_weapon_damage(weapon_level):
        damage=weapon_damage(weapon_level)
        damage.add('fire',perl_level*0.5)
        damage.add('ice',perl_level*1.0)
        return damage 
    return wrap_weapon_damage
```


然后把这个装饰函数装饰到原有的武器伤害函数`weapon_damage`上，即可得到扩展后的伤害计算函数:
```Python

weapon_damage=perled_damage(weapon_damage,10)

damage=weapon_damage(2)
print damage.__dict__
```

输出：
```
{'_damage': {'fire': 9.2, 'wind': 0, 'poison': 3.4, 'ice': 10.0}}
```

当然，为了灵活起见，我们完全可以把装饰、调用在一个语句里完成：

```Python
damage=perled_damage(weapon_damage,10)(2)
print damage.__dict__
```

这样即可得到一个通用的方法，变量只有`weapon_level`、`weapon_damage`！也即是拿到这两个数据就能计算出相应的伤害！

## 其他语言

为了理解真正理解装饰器的核心原理，可以写下其它语言的实现：

### PHP版

```PHP

//执行某功能的函数
$have_fun_with_brz=function (){
    echo "have fun with brz\r\n";
};

//装饰器
$dec=function ($func) {
    $wrap=function ()use ($func) {
        echo "before calling\r\n";
        $func();
        echo "after calling\r\n ";
    };
    return $wrap;
};

//装饰
$have_fun_with_brz=$dec($have_fun_with_brz);

//调用经过装饰的目标函数
$have_fun_with_brz();
```


输出为：
```
before calling
have fun with brz
after calling
```

 
### JavaScript版

```JavaScript

// 某功能
function haveFunWithBrz(){
  console.log("have fun with brz\r\n");
}

// 装饰器
var dec=function (func) {
    return function (){
         console.log("before calling\r\n");
        func();
         console.log("after calling\r\n ");
    };
};

// 装饰
haveFunWithBrz=dec(haveFunWithBrz);

// 调用
haveFunWithBrz();
```

输出为:

```
before calling
have fun with brz
after calling
```