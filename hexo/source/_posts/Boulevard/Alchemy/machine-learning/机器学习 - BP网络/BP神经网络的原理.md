---
layout: post
title: 机器学习 BP神经网络原理
date: 2018-06-12 10:04:35
tags:
- 炼丹
- 机器学习
- 神经网络
- 反向传播算法
categories:
- 大道
- 炼丹
- 机器学习
---


在[关于梯度下降法的机器学习笔记中](/blog/2018/06/12/Boulevard/Alchemy/machine-learning/%E6%9C%BA%E5%99%A8%E5%AD%A6%E4%B9%A0%20-%20%20%E6%80%A7%E8%83%BD%E4%BC%98%E5%8C%96%E7%AE%97%E6%B3%95/%E6%A2%AF%E5%BA%A6%E4%B8%8B%E9%99%8D%E6%B3%95/)，我们给出了一个通用的理论，也即每次沿着梯度的反方向进行迭代搜素最小值。

## 使用最速下降法进行BP网络求解

考虑有一个多层神经网络，我们可以迭代调节各层的权重`$w^{m}_{i,j}$`，来令性能函数`$F$`取得更小的值。这里采用最速下降法，为了计算其梯度，不妨先考察其通用形式：`$\frac {\partial F}{ \partial w^{m}_{i,j}}$`。又由于`$n^{m}_{i}$`和`$w^{m}_{i,j}$`存在函数关系:

```math
%% KaTex
n^{m}_{i}=\displaystyle\sum_{j}{ w^{m}_{i,j}a^{m-1}_{j}}+ b^{m}_{i}
```
根据链式法则，有：
```math
%% KaTex
\frac {\partial F}{ \partial w^{m}_{i,j}} = \underbrace{\frac{\partial F}{\partial n^{m}_{i} }} _{\text{记作} s^{m}_{i}} \cdot \frac{\partial n^{m}_{i}}{\partial w^{m}_{i,j}} = s^{m}_{i} \cdot a^{m-1}_{j}
```
其中，`$s^{m}_{i}$`表达了性能函数`$F$`对第`$m$`层的第`$i$`个的元素发生变化的敏感程度。

显然，根据最速下降法，迭代式为：
```math
%% KaTex
w^{m}_{i,j}(k+1) = w^{m}_{i,j}(k) - \alpha s^{m}_{i} a^{m}_{j}

b^{m}_{i}(k+1) = b^{m}_{i}(k) - \alpha s^{m}_{i} 
```
将`$s^{m}_{i}$`向量化表示(含义为性能函数`$F$`对第`$m$`层净输入`$\bold n^{m}$`的变化敏感程度)，则有：<!--more-->
```math
%% KaTex
\bold s^{m} =\begin{bmatrix} s^{m}_{1} \\ s^{m}_{2} \\ s^{m}_{3} \\ ... \end{bmatrix}= \begin{bmatrix} \frac{\partial F}{\partial n^{m}_{1}} \\ \frac{\partial F}{\partial n^{m}_{2}} \\ \frac{\partial F}{\partial n^{m}_{3}} \\ ... \end{bmatrix} =\frac{\partial F}{\partial \bold n^{m}}
```
故迭代式可以写成矩阵形式：
```math
%% KaTex
W^{m}(k+1) = W^{m}(k) - \alpha \bold s^{m} (\bold a^{m-1})^{T}
\bold b^{m}(k+1) =\bold b^{m}(k) - \alpha \bold s^{m}
```

## 敏感性求解与反向传播

事实上，第`$m$`层的净输入`$\bold n^{m}$`经过本层的激活函数`$f^{m}$`作用后形成实际输出`$\bold a^{m}$`，又成为了下一层(`$m+1$`层)输入：
```math
%% KaTex
\bold n^{m+1} = W^{m+1}\bold a^{m}
```
这意味着，`$\bold n^{m+1}$`与`$\bold n^{m}$`之间也有某种函数关系，所以，根据矩链式法则，又有：
```math
%% KaTex
\bold s^{m}= \frac{\partial F}{\partial \bold n^{m}} = (\frac{\partial \bold n^{m+1}}{\partial \bold n^{m}})^{T} \underbrace{\frac{\partial F}{\partial \bold n^{m+1}}}_{\text{=} \bold s^{m+1} } =(\frac{\partial \bold n^{m+1}}{\partial \bold n^{m}})^{T}  \bold s^{m+1}
```
上式表达了一种递推关系，即第`$m$`的敏感程度可以由`$m+1$`层的敏感程度递推而来；而其中的`$\frac{\partial \bold n^{m+1}}{\partial \bold n^{m}}$`其实是一个雅可比矩阵，为了求解该矩阵，考察其标量形式：
```math
%% KaTex
\frac {\partial n^{m+1}_{r} }{ \partial n^{m}_{s} } =\frac{\partial}{\partial n^{m}_{s} } \Big( \displaystyle\sum_{k}{w^{m+1}_{r,k}\cdot a^{m}_{k}} +b^{m+1}_{r} \Big) = w^{m+1}_{r,s} \cdot \frac{\partial a^{m}_{s}}{\partial n^{m}_{s}}=w^{m+1}_{r,s} \cdot \frac{\partial f^{m}(n^{m}_{s})}{\partial n^{m}_{s}}
```
这个结论非常符合直觉——其实就是利用了复合函数求导的链式法则:
```math
%% KaTex
\text{后层某净输入对某前层净输入的偏导}=\text{相关权重}\times\text{前层激活函数对净输入的偏导}
```
归纳成矩阵形式，即有：
```math
%% KaTex
\frac {\partial \bold n^{m+1} }{ \partial \bold n^{m} } =  W^{m+1} \; \text{diag}( \frac{\partial f^{m}(n^{m}_{1})}{\partial n^{m}_{1}},\frac{\partial f^{m}(n^{m}_{2})}{\partial n^{m}_{2}},\frac{\partial f^{m}(n^{m}_{3})}{\partial n^{m}_{3}}, ... ) 
```
代入表达式`$\bold s^{m}=  (\frac{\partial \bold n^{m+1}}{\partial \bold n^{m}})^{T}  \bold s^{m+1} $`，即有：
```math
%% KaTex
\bold s^{m} = \text{diag}( \frac{\partial f^{m}(n^{m}_{1})}{\partial n^{m}_{1}},\frac{\partial f^{m}(n^{m}_{2})}{\partial n^{m}_{2}},\frac{\partial f^{m}(n^{m}_{3})}{\partial n^{m}_{3}}, ... ) \; (W^{m+1})^{T} \; \bold s^{m+1} 
```
这意味着，我们可以根据最后一层的敏感性`$\bold s^{L}$`逐层倒推出前面每一层的敏感性`$\bold s^{m}$`！这也是“反向传播”名字的由来。

### 最后一层的敏感性求解

如果取`$F = \bold e^{T} \bold e$` ，其中`$\bold e$`表示目标值与实际值的差值，即`$\bold e= (\bold t - \bold a)$`

```math
%% KaTex
s^{L}_{i} = \frac {\partial } {\partial n^{L}_{i}} (\bold t - \bold a)^{T}(\bold t - \bold a) =\frac {\partial } {\partial n^{L}_{i}} \displaystyle\sum_{j}{(t_j - a_j})^{2} 
\;\;\;\;= - 2 \cdot \underbrace{ (t_i - a_i) }_{ \text{记作} e_i}\cdot \frac{\partial a^{L}_{i}}{\partial n^{L}_{i}}
\;\;\;\;= - 2 \cdot e_i \cdot \frac{\partial f^{L}(n^{L}_{i})}{\partial n^{L}_{i}}
```
写成矩阵形式，也即：
```math
%% KaTex
\bold s^{L} =  -2\cdot \text{diag}( \frac {\partial f^{L}(n^{L}_{1})}{\partial n^{L}_{1}} , \frac {\partial f^{L}(n^{L}_{2})}{\partial n^{L}_{2}} ,  \frac {\partial f^{L}(n^{L}_{3})}{\partial n^{L}_{3}} ,  ... ) \bold e
```

## BP神经网络的算法框架

对于训练集中每组输入`$\bold x$`，都进行以下三步计算：
第一步，通过神经网络将输入转换为输出，
```math
%% KaTex
\bold a^{0} = \bold x

\bold a^{m+1} = f^{m+1}(\bold w^{m+1} \bold a^{m} + \bold b^{m+1} )

\bold a = a^{L} 
```
第二步，通过反向传播逐层计算敏感性
```math
%% KaTex
\bold s^{L} =  -2\cdot \text{diag}( \frac {\partial f^{L}(n^{L}_{1})}{\partial n^{L}_{1}} , \frac {\partial f^{L}(n^{L}_{2})}{\partial n^{L}_{2}} ,  \frac {\partial f^{L}(n^{L}_{3})}{\partial n^{L}_{3}} ,  ... ) \bold e

\bold s^{m} = \text{diag}( \frac{\partial f^{m}(n^{m}_{1})}{\partial n^{m}_{1}},\frac{\partial f^{m}(n^{m}_{2})}{\partial n^{m}_{2}},\frac{\partial f^{m}(n^{m}_{3})}{\partial n^{m}_{3}}, ... ) \; (W^{m+1})^{T} \; \bold s^{m+1} 
```
第三步，使用敏感性更新权重和偏置：
```math
%% KaTex
W^{m}(k+1) = W^{m}(k) - \alpha \bold s^{m} (\bold a^{m-1})^{T}
\bold b^{m}(k+1) =\bold b^{m}(k) - \alpha \bold s^{m}
```
当训练到一定程度，就会完成神经网络的训练。

## 多层神经网络的能力

事实上，研究表明，两层网络在隐层中使用`S`形传输函数，在输出中采用线性传输函数，只要在隐层中有足够的单元，就几乎可以以任意精度逼近任意函数。
