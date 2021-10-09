---
layout: post
title: 也说Python对象、函数参数的传递方式与闭包
date: 2015-04-10 09:27:08
tags:
- Python
- 闭包

categories:
- 风语
- Python
---


关于Python里闭包概念，查了很多中文网站，发现很多人的理解有失偏颇，比如《Python参考手册》第四版 ，比如http://blog.csdn.net/marty_fu/article/details/7679297。——他们认为子函数对与外围变量同名的变量修改不能影响外围。鉴于我不认同他们的观点，自己从头理了下对象的概念。本文第3.1部分，那里将对网上和一些教材的观点进行勘误。

``凡下所述，悉皆胡扯，人生百味，聊以自娱耳。``

## 对象可变之禅

起这个小标题可能多少有故弄玄需之嫌，然而Levy(1984)黑客准则第一条就明确提出
> Access to Computers - and anything which might teach you something about the way the world works – should be unlimited and total

程序的运作和这个世界的运作方式是统一的。 

### 变，或者不变

在父母长辈看来，对象就是另一半；在Pythoner看来，万物皆对象，对象或止或动，必居二者其一。

在许多编程语言里，比如Python，比如C#，人们把对象不可变叫immutable，例如int类对象、string类对象、etc；可变叫mutable，例如list对象、自定义的Class对象、etc。对象是否是mutable，很重要——To be,or not ,that is a question。

在一般的面向对象的语言里，比如C++，对象必须经过实例化才会存在,实例化的过程是从类型的精神抽象到具体对象的过程，这一过程会分配一段内存来表示对象。
在Python中万物皆对象，类也是对象。问题是，类创建对象，类也是对象，类由什么创建——答案是类由元类创建。关于这一点，具体请参见stackoverflow上e-satis对一篇[《What is a metaclass in Python?》的提问的回复](http://stackoverflow.com/questions/100003/what-is-a-metaclass-in-python)。

不管怎么说，对象依托内存而存在。对于一个对象，一旦被分配了一段内存，即代表其生命周期开始，这段内存的内容在对象生存期间不可变化的即是immuable对象，反之，则称之为mutable。

### 对象本无名

对象标识符——或者叫对象的称谓，可以简单当成是程序员为了表示晦涩难记的内存地址的精神创造——在Python的世界里，对象名表示用来指代对象，仅此而已，对象名是彻彻底地的人为的附加到对象上的东西。

一个对象本身并没有名字，只是后来这个世界有了OOP程序员，对象这才有了名字；即使你要称呼他，你也可以按你的意愿叫她女朋友，叫honey，darling，或者妖魔仙佛、洪水猛兽，叫什么的权利在你——但是，这只是你附加给这个对象的，并不影响对象自身。

对象原本并没有名字——注意措辞“原本”两个字，因为现在我们会强加给对象一个名字——理解这点很重要。

名字只是代号，正如同有人有姓名、乳名、昵称、绰号，这些不同的代号可能是同一个人；另一种情况是，尽管我们提倡在给对象命名的啥时候尽量做到“望文生义”，但是没人能阻止我们起个不太合适的名字——正如同如花和秋香从字面意义上来说都是很美的名字，但是，唐伯虎在没见过这两个人的时候是无法仅凭名字就分别出谁是美女的，因为对象名和对象的固有属性无关。

### mutable对象——名字只是代号

#### 同一段内存，同一个对象
假定如花的真正闺名叫aList，而秋香则叫bList：



```Python
#同一段内存，便是同一个对象
aList=[1,2,3,4,5] #首先我们有一个list对象[1,2,3,4,5]，嗯，就叫它aList
bList=aList # 然后我再给他起个名字，叫bList
bList.append(6) #在bList追加一个6
print("aList is :",aList)
print("id of aList is :",id(aList))
print("id of bList is :",id(bList))
```
输出结果类似于：
```Python
aList is : [1, 2, 3, 4, 5, 6]
id of aList is : 3068653132
id of bList is : 3068653132
```

很好理解，bList，aList都是我们对于[1,2,3,4,5]这一同一个列表对象的称呼，我们改变bList和改变aList效果是一样的。对于mutable对象名a，赋值给另一个对象名b，则意味这让b指代a所指代的对象——两个名称对应于同一个对象id。
ps：如果你Class了一Beauty类，qiuXiang和ruHua都是Beauty类对象，并在执行上面类似的操作，会得到类似的结果，因为Class出来的类型也是mutable。

#### 一元操作符、二元操作符、以及属性方法对对象地址的影响
上面是以list类对象的append()方法进行分析的，调用前后，mutable对象的地址未发生变化。于是，我以前想当然认为mutable对象在诸如aList=aList+bList也不会发生变化，但是经过一次偶然的测试发现，事实真不是这样。

```Python
#测试不同的修改方式对对象地址造成的影响
cList=["1","2"] #cList是个list对象，下面会用不同的修改方式对其进行测试
dList=["Attention!"] #用于追加到cList后面的list对象
eList=["ATTENTION!"] #用于追加到cList后面的list对象
fStr="Yeah"#用于追加到cList后面的list对象
print("cList is : ",cList,"，id is ",id(cList)) #修改之前的cList信息
cList=cList+dList
print("cList is : ",cList,"，id is ",id(cList)) #以二元操作修改后的cList信息
cList+=eList
print("cList is : ",cList,"，id is ",id(cList)) #以一元操作修改后的cList信息
cList.append(fStr)
print("cList is : ",cList,"，id is ",id(cList)) #以对象方法修改后的cList信息
```

输出结果类似于
```Python
cList is : ['1', '2'] ，id is 3068251724
cList is : ['1', '2', 'Attention!'] ，id is 3068248844
cList is : ['1', '2', 'Attention!', 'ATTENTION!'] ，id is 3068248844
cList is : ['1', '2', 'Attention!', 'ATTENTION!', 'Yeah'] ，id is 3068248844
````
结果分析：一个list，用二元操作符修改，虽然修改前后都叫同一个名字，但是返回的地址变了；用一元操作符是在原地址上进行，返回地址不变，还是同一对象；以append()方法返回的list还是原对象。


### imutable对象——去年今日此门中，人面桃花相印红：
immutable对象最大的特点就是不变。但是我刚接触这个的时候很疑惑，因为我发现：

``一个叫a_int的int变量确实可以赋值为1，再赋值为2，而且没有语法错误提示！``

当时是在C#里被这个问题困惑住的，然后自己实践后分析结果就恍然大悟 。
在Python里，不妨分析这一个例子：

```Python
aInt=1#首先我们有一个int对象，嗯，就叫它aInt
bInt=aInt # 然后我再给他起个名字，叫bInt
print("before modified:")
print("\taInt is :",aInt,"id of aInt is :",id(aInt))
print("\tbInt is :",bInt,"id of bInt is :",id(bInt))
bInt=4#修改bInt
print("after modified:")
print("\taInt is :",aInt,"id of aInt is :",id(aInt))
print("\tbInt is :",bInt,"id of bInt is :",id(bInt))
```

输出类似于：
```Python
before modified:
aInt is : 1 id of aInt is : 137396000
bInt is : 1 id of bInt is : 137396000
after modified:
aInt is : 1 id of aInt is : 137396000
bInt is : 4 id of bInt is : 137396048
```

这一过程中，我首先让bInt=aInt,然后我改变试图bInt指代的对象的值为4，但是bInt指代的是个immutable对象，怎么办？为了最大限度满足我的需求，系统就生成了一个新的int对象，值为4，然后用bInt指代了这个新生成的值为4的int对象。和修改值之前的bInt相比，二者虽然都叫做bInt，但是已经不是指代的同一个对象了（可以看到，二者的id发生了变化）。

同样的环境，同样的名字，只是对象已经不是以前的对象了——去年今日此门中，人面桃花相映红。

这个过程用充满哲学意味的话可以表述为``现在的你已然不是昨天的你``.《金刚经》通篇都充斥这种思想。

ps：大约是受奶茶5月新出的专辑《亲爱的路人》影响吧，这几句话现在说起来多少有些感慨。多年前，写了一个偈子：佛即非佛，我亦非我，不见真相，不见真我。只言片语，权作掩耳。

## 值传递，还是引用传递

函数参数传递方式对于C/C++者来说，容不得半点模糊。Python里，这也是个重要的问题。不过经过本文第一部分Python里对象可变之禅的分析，函数参数传递方式非常容易理解。这里仅仅以一小段测试代码简单分析下。
```Python
def ChangeValue(aInt,bList):
    #测试改变参数
    aInt+=1
    bList.append("Someone remains in yr heart forever")

aInt=1
bList=["someone comes","someone goes"]

print("before calling")
print("\taInt is : ",aInt)
print("\tbList is : ",bList)

ChangeValue(aInt,bList)
print("after calling")
print("\taInt is : ",aInt)
print("\tbList is : ",bList)
```

输出类似为：
```Python
before calling
	aInt is :  1
	bList is :  ['someone comes', 'someone goes']
after calling
	aInt is :  1
	bList is :  ['someone comes', 'someone goes', 'Someone remains in yr heart forever']
```
* 对于aInt,由于是不可变变量，在ChangeValue函数内部，会重新生成一个新的aInt；外围变量未收到影响
* 对于bList，由于是可变变量，在ChangeVaule函数内部，改变以bList名字命名的对象

但是，其中奥妙仅此而已嘛？


## 函数对外围变量的影响

### 局部变量对外围变量的影响

上面是通过参数传递给函数的，要是函数直接调用外部变量会有什么后果？很多人说函数对外围同名函数操作没有直接影响，这中理解是不完全正确的。

在函数内部，如果一个对象先以先左值出现，且没有用“.”指定，则系统会试图优先把它解释为在函数内部的局部变量，以相应的语句对其初始化。显然，正常情况下，局部变量不会影响外围变量。

但千万不要以为非左值出现的对象就是右值，就不能改变原对象。因为左值、右值都是针对赋值而言的。要修改一个对象，除了赋值，还可以利用某些非赋值表达式。有两个典型反例就是，
+ 一个对象或许可以通过一元操作符修改自身，
+ 一个对象可以通过调用相关方法修改自身。（参见本文1.2.1的第二部分）

对于一个局部变量，即使有与其同名的外围变量，这二者也毫无关系。不要因为存在了外围同名变量的初值而忽视局部变量的初始化。

总而言之，``笼统的说子函数的变量变化不影响外围变量是不负责任的。``

假定某个子函数的某一个变量，在函数之外，还存在一个同名的外围变量:

+ 如果它是immutable,不管它是不是以左值出现，都能肯定它和外围变量指代的并不是同一个对象；
+ 而如果这是个mutable变量，则这二者可能是或者可能不是是同一对象——这取决于这个子函数之中，是否有这样一种情况：这个对象以某种方式，修改一个新对象到原来对象名上。
网上一些技术贴的作者认为：  
``如果子函数里那些和外围变量同名的变量的发生变化，结果并不会改变外围变量``
其实这句话是有失偏颇的。测试代码与分析见下：

```Python

def ParentFoo():
''''测试子函数对父函数的局部变量的影响父函数有两个对象， aInt：int类对象；aList：list类对象。'''
    aInt=1234567
    aList=["a","b","c","d"]
    print("the ParentFoo Before Calling SubFoo : ")
    print("\taInt is ",aInt,",id is ",id(aInt))
    print("\taList is ",aList,"，id is ",id(aList))

    def SubFoo():
'    ''子函数，用于测试子函数里局部变量修改对外围变量的影响 '''
        print("Calling SubFoo : ")#提示子函数已经开始调用

        #Step1：测试对父函数里的aInt的影响
        print("\tStep1:测试子函数对aInt的影响")
        #下面建立一个局部变量aInt，同时初始化
        #如果没有这一步，则后面aInt不能以左值出现!!
        aInt=1234567#这个局部变量和外围变量同名并不会造成任何影响
        print("\t\taInt is ",aInt,",id is ",id(aInt))
        aInt+=1
        print("\t\taInt is ",aInt,",id is ",id(aInt))

        #Step2：测试对父函数里的aList的影响
        print("\tStep2:测试子函数对aInt的影响")
        #很多人——很多中文网站贴出来的技术贴的作者认为：
        # 如果子函数里那些和外围变量同名的变量的发生变化，结果并不会改变外围变量
        #其实这句话是有失偏颇的。
        #反例：以非左值出现，同时调用其能修改自身的方法
        #这种修改外围变量的操作方式很隐蔽！很变态！很危险！
        aList.append("e") #子函数在没有以参数传递的情况下偷偷改变了外围变量！
        print("\t\taList is ",aList,"，id is ",id(aList))
        bList=aList #建立一个局部变量——但实际上此时这两个变量指代的是同一个对象
        print("\t\tbList is ",bList,"，id is ",id(bList))
        bList=bList+["Attention!"] #注意id(bList)变化了!
        print("\t\tbList is ",bList,"，id is ",id(bList))

    SubFoo() #调用子函数
    #子函数调用结束后打印父函数里相关对象的信息
    print("the ParentFoo After Calling SubtFoo : ")
    print("\taInt is ",aInt,",id is ",id(aInt))
    print("\taList is ",aList,"，id is ",id(aList))

ParentFoo() #调用父函数
```


输出类似于：
```Python
the ParentFoo Before Calling SubFoo :
aInt is 1234567 ,id is 3069037696
aList is ['a', 'b', 'c', 'd'] ，id is 3068358220
Calling SubFoo :
Step1:测试子函数对aInt的影响
aInt is 1234567 ,id is 3068098400
aInt is 1234568 ,id is 3068054080
Step2:测试子函数对aInt的影响
aList is ['a', 'b', 'c', 'd', 'e'] ，id is 3068358220
bList is ['a', 'b', 'c', 'd', 'e'] ，id is 3068358220
bList is ['a', 'b', 'c', 'd', 'e', 'Attention!'] ，id is 3068363564
the ParentFoo After Calling SubtFoo :
aInt is 1234567 ,id is 3069037696
aList is ['a', 'b', 'c', 'd', 'e'] ，id is 3068358220
```

### 闭包

关于闭包，cnbolgs的Vamei老兄的说法很透彻了，我就不狗尾续貂了，但是出于知识完备、日后备忘和便于查找的原因，把关键部分粘贴到这里。本部分定义和例子引自http://www.cnblogs.com/vamei/archive/2012/12/15/2772451.html,略有删改。
一个函数和它的外围变量合在一起，就构成了一个闭包(closure)。在Python中，所谓的闭包是一个包含有外围变量取值的函数对象。外围变量取值被保存在函数对象的__closure__属性中。
例如：

```Python
def line_conf():
    b = 15
    defline(x):
        return2*x+b
    return line # return a function object

b = 5
my_line = line_conf()
print(my_line.__closure__)
print(my_line.__closure__[0].cell_contents)
```

输出类似于：

```Python
(<cell at 0xb6df2764: int object at 0x8308000>,)
15
```

一个实际例子：
```Python
def line_conf(a, b):
    defline(x):
        return a*x + b	#原文误作return ax+b
    return line

line1 = line_conf(1, 1)
line2 = line_conf(4, 5)
print(line1(5), line2(5))
```

输出结果类似于：
```Python
6 25
```



如果没有闭包，我们需要每次创建直线函数的时候同时说明a,b,x。实际上，利用闭包，我们创建了泛函。这个函数的一些方面已经确定(比如必须是直线形式)，但另一些方面(比如a和b）参数待定。随后，我们根据line_conf传递来的参数，通过闭包的形式，将最终函数确定下来。

(snplou注：更一般的，如果有一类性质相似的动作，其中每一个动作都需要共N个参数，我们可以考虑建立一个泛函——动作配置函数用以表示和生成这一类动作，不妨暂时称之为ActConfig，首先我们需要从动作需要的N个参数里选取K个作为动作配置函数的参数，记作ActConfig(p1,p2,...,pK),而把剩下的N-K个参数放到动作配置函数的子函数Act的参数里，记作Act(pK_1,pK_2,...,pN_K)，并子函数Act()里规定对这N 个参量的操作行为，而父函数则返回子函数，这样每次指定p1,p2,...,pK后，都会生成一个新的Act(pK_1,pK_2,...,pN)函数。实际执行某一个具体动作的时候，只需调用Act(pK_1,pK_2,...,pN)即可)

闭包有效的减少了函数所需定义的参数数目。这对于并行运算来说有重要的意义。在并行运算的环境下，我们可以让每台电脑负责一个函数，然后将一台电脑的输出和下一台电脑的输入串联起来。最终，我们像流水线一样工作，从串联的电脑集群一端输入数据，从另一端输出数据。这样的情境最适合只有一个参数输入的函数。闭包就可以实现这一目的。
另外，闭包还能延迟计算。

## 结论

当你希望修改外围变量，在3.x里，最好显式的用nonlocal声明。尽量不要用本文测试代码里涉及的方法。
而如果你不希望修改外围变量：
尽量不要给子函数直接传递mutable对象参数；
也尽量不要在子函数里直接操作与外围变量同名的mutble对象——即使有，尤其需要注意某些一元操作符和某些特殊的能返回原地址对象的方法，因为这非常可能会在你不注意之中修改外围变量。

