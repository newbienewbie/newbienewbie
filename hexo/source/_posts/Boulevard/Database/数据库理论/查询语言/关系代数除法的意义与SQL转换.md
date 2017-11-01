---
title: 数据库笔记 关系代数除法运算的意义与SQL转换
date: 2017-10-29 15:26:07
tags:
- 数据库
- 数据库理论 
- 关系代数
- 除法
- SQL
categories:
- 大道
- 数据库
- 数据库理论 
---

## 关系代数除法运算定义

给定关系`$R=\{X,Y\}$`，`$S=\{Y,Z\}$`，公共属性（集）为`Y`。显然关系`$S$`上`$Y$`属性的域为`$\pi_y(S)$`。记`$x=t^n[X]$`，`$Y_x$`为`$x$`在`$R$`上的象集，则`$R \div S$`的关系演算形式定义为：
```math
%% KaTex
R \div S= \{ t^n[X] \,\mid\, t^n \in R \,\land\, \pi_y(S) \subseteq Y_x \}
```
除法运算最终的结果的属性集为`$X$`，与`$Z$`无关。除法运算的求解过程如下：
1. 在关系`$S$`上求公共属性集`Y`的域为`$\pi_{Y}(S)$`(准确的说并非是域，因为是非去重结果，下同)
2. 在关系`$R$`上求`$X$`的域，记为`$M$`
3. 对每一个的 `$x \in M $` ，都在`$R$`中进行相应的选择运算、并投影到公共属性`$Y$`上，得到的集合为`$Y_x=\pi_{Y}(\sigma_{X=x}(R))$`，如果满足`$\pi_{Y}(S) \subseteq Y_x$` ，则`$x$`是除法运算最终结果集的一个元组。

第3步的表意还是还是有一点没说清楚，什么叫满足`$\pi_{Y}(S) \subseteq Y_x$`？根据集合定义，我们可以换个等价说法：如果满足`$(\forall s \in \sigma_{Y}(S)) (s \in Y_x)$`，则`$x$`是除法运算最终结果集的一个元组。

除法运算实际上是在做笛卡儿积的逆运算。举个例子：设有关系`$R=(A,B,C,D)$`和关系`$S=(C,D)$`。<!--more-->其中，`$R$`共有7行，每行记录为：

| 行号 | A | B | C | D |
| --- | ---  | --- | --- | --- |
| 1 | a | b | c | d |
| 2 | a | b | e | f |
| 3 | a | b | g | h |
| 4 | b | d | e | f |
| 5 | b | d | d | l |
| 6 | c | k | c | d |
| 7 | c | k | e | f |

而 `$S$`共两行记录：

| 行号 | C | D |
| --- | --- | --- |
| 1 | c | d |
| 2 | e | f |

则关系`$R$`和`$S$`公共属性集为`$(C,D)$`，`$X$`是属性集`$(A,B)$`。求取`$R \div S$`的基本过程为：
1. 对公共属性集`$(C,D)$`，在关系`$S$`上的域为`$\pi_{CD}(S)=\{\{c,d\},\{e,f\}\}$`
2. 对`$X$`属性集`$(A,B)$`，在关系`$R$`上的域为`$ M=\{ \{a,b\},\{b,d\},\{c,k\} \}$`
3. 对任意的 `$x \in M $` ，在`$R$`中进行选择运算，并投影到公共属性上，比如对`$x=\{a,b\}$`，得到集合`$Y_x=\pi_{CD}(\sigma_{AB=\{a,b\}}(R))$`=`$\{ \{c,d\},\{e,f\},\{g,h\} \}$`，显然有`$\pi_{CD}(S) \subseteq Y_x$` ，则说明`$\{a,b\}$`是除法运算最终结果集的一个元组。

最后得到的结果集为`$R \div S=\{ \{a,b\}, \{c,k\} \}$`。

## 除法运算的意义

除法运算实际上是在某种程度上做笛卡儿积的逆运算。尽管运算过程稍显啰嗦，但是在笛卡尔积逆向问题求解上，可以很清晰的表达我们的意图。
举个典型例子，有学生关系`$S=(SNo,SName,Dept)$`，课程关系`$C=(CNo,CName,Credit)$`，及二者的选课匹配关系`$SC=(SNo,CNo,Grade)$`。如何求至少选修了课程`$A_i \enspace n=1,2,...,n$`的学生编号？

我们当然可以通过自乘法来解决这个问题，但是思路并不直观。我们很容易知道有关系`$SC$`是关系`$S$`和`$C$`的匹配关系，根据要求，约束为`$A_i$`的课程子集形式描述为`$C'=\{c | C(c) \land ( c[CName]=A_1 \lor c[CName]=A_2 \lor ... \lor C[CName]=A_n) \}$`，所以查找满足这个课程子集的学生集可以借助于`$SC \div C$`来描述：
```math
%% KaTex
I=\pi_{SNo,CNo}(SC) \div \pi_{CNo} (\sigma_{CName=A_1 \,\lor\, CName=A_2 \,\lor\, ... \,\lor\, CName=A_i ... \,\lor\, CName=A_n}(C))
```

## 除法与等价的SQL转换

现在的问题是，能否找到一个方法，将除法运算`$R(X,Y) \div S(Y)$` 转换为`SQL`表达式？

根据前文形式描述，除法运算要求有:`$(\forall s \in \sigma_{Y}(S)) (s \in Y_x)$`。具体到上述学生选课问题，目标结果还可以描述为，要找到这样一个学生子集，其学生元组`$s$`满足：对`$C'$`中的每一个`$c$`，都有该学生`$s$`的选课记录。用形式语言表述为：
```math
%% KaTex
(\forall c \in C') ((\exists sc \in SC) ( sc[SNo]=s[SNo] \land sc[CNo]=c[CNo] ))
```
根据否定之否定，等价于：
```math
%% KaTex
\lnot( (\exists c \in C')(\lnot ((\exists sc \in SC) (sc[SNo]=s[SNo] \land sc[CNo]=c[CNo] )) ) )
```
所以，可以据此写出相应的`SQL`语句为：
```sql
select s
from S
where 
    not exists (
        select c from CC
        where 
            not exists (
                select sc from SC 
                where sc.SNo = s.SNo and sc.CNo = c.CNo
            )
    )
```
其中，`CC`表示子集`C'`。写成`SQL`为：
```sql
select c from C where c.CName='A1' or c.CName='A2' or ... or C.CName='An'
```

