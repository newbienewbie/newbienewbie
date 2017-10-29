---
title: 数据库笔记 存在量词、全称量词与SQL转换
date: 2017-10-29 08:38:27
tags:
- 数据库
- 数据库理论 
- 关系代数
- 存在量词
- 全称量词
- SQL
categories:
- 大道
- 数据库
- 数据库理论 
---

## 存在量词

在集合关系中，我们经常使用存在量词(`$\exists$`)和全称量词(`$\forall$`)来表达意图。但是`SQL`中仅仅提供了存在量词关键字支持。本笔记记录如何把存在量词和全称量词转换为`SQL`表述。

### SQL 的 exists 

`SQL`提供了一个存在量词`exists`，其基本语法为:
```sql
where exists R
```
表示当且仅当关系`$R$`非空时（即`R`至少有一个元组时），结果为`true`。`exists`关键字可以等价转换为集合关系的存在量词`$\exists$`。还可以配合`not`关键字取反：

<!--more-->
```sql
where not exists R
```
意思是，`$R$`关系中无元组时，结果为`true`。

## 全称量词与否定之否定

`SQL`并没有提供全称量词之类的关键词或者语法。为了表达这样的全称量词意图，我们需要使用否定之否定：“若对于任意一个`$x$`，都有公式`$P$`为真”，等价于“必然不存在`$x$`使得`$P$`不成立”。用形式语言(关系演算)可以表达为：
```math
%% KaTex
(\forall x) (P) \iff \lnot((\exists x) (\lnot P)) 
```
这个等价关系的一个重要意义是把 *全称量词* 转化为了 *存在量词* 。我们可以借助于这个性质实现在`SQL`中表述全称量词。

举个典型例子，假设有学生关系`$S=(SNo,SName,Dept)$`，课程关系`$C=(CNo,CName,Credit)$`，及二者的选课匹配关系`$SC=(SNo,CNo,Grade)$`。如何求每一个学生都选了的课程集合？

也就是说，要找到这样一个课程子集`$C(c)$`，其中的元组课程`$c$`满足：对于学生集合里的每一个学生，都可以找到至少一条或者多条的选课记录。为了清晰，我们改用形式语言描述：
1. “对于任意学生集合里的每一个学生，都...” => `$\color{green}\forall s \in S$`
2. “至少可以找到一条或者多条选课记录” =>`$\color{orange}(\exists sc \in SC) (sc[SNo]=s[SNo] \land sc[CNo]=c[CNo]) $`

为了表达这样的全称意图，我们借助否定之否定，显然有:
```math
%% KaTex
\color{#c9c}( \forall s \in S)   \color{orange}\Big( (\exists sc \in SC )(sc[SNo]=s[SNo] \land sc[CNo]=c[CNo] ) \Big)
\iff
\color{white}\lnot \Big( \color{#c9c} ( \exists s \in S ) \color{white}( \lnot \color{orange} \Big( (\exists sc \in SC) (sc[SNo]=s[SNo] \land sc[CNo]=c[CNo])  \Big) \color{white} ) \Big)
```

根据上式，很容易写出对应的`SQL`表述:
```sql
select CNo from C
where not exists 
    (select * from S 
        where not exists ( select * from SC where SNo=S.SNo and CNo=C.CNo )
    )
```