---
layout: post
title: 数据结构与算法笔记 最短路径算法——Dijkstra算法
date: 2017-11-1 13:33:25
tags:
- 数据结构与算法
- 图论 
- 最短路径算法
- Dijkstra
categories:
- 大道
- 数据结构与算法
---

最短路径算法分为单源点到任意点的最短路径算法和任意点对之间的最短路径算法。对于简单的无权值的图，求其最短路径等同于按照深度进行遍历，此处不予赘述。求最短路径，就是要找到这样一条路径，该路径之上的边的权值之和最小。第一个顶点称之为源点(`Source`)，最后一个顶点称之为终点(`Destination`)。

## Dijkstra's algorithm

对于指定的单源点(设起始点为`$v_0$`)到任意点的最短路径问题，Dijkstra 给出了按照长度递增的次序产生最短路径的算法，它是一种典型的贪心算法。对于图`$G=(V,E)$`，包含`$n$`个顶点`$i=1,2,...n$`，弧`<i,j>`的权值为`$w(i,j)$`。现在指定始点为`$v_0$`，考虑始点`$v_0$`到任意一顶点`$v_k$`的最短距离。

### 问题规模分解

首先尝试把问题分解为更小规模的问题。当始点`$v_0$`和顶点`$i$`之间不存在直接相连的弧`$<v_0,i>$`，若它们之间存在路径，则该路径必定要经过某个和`$v_0$`直接相连的中间顶点（这里记作`$x$`）；基于同样的原理，如果顶点`$x$`和`$i$`仍然不直接相连，则这条最短路径必定还要经过一个和顶点`x`直接相连的某个顶点：
```math
%% KaTex
\boxed{ v_0 \xrightarrow{w(v_0,x)} x \xrightarrow{w(x,?)} ...... } \xrightarrow{w(?,i)} i
```
也就是说，距`$v_0$`之间的更长的最短路径总是依赖于某个距`$v_0$`更短的最短路径。对于任意指定的终点`$v_k\enspace (k \in \{1,2,3,...,n\}$`，如果`$v_k$`的入度为`$I$`，即有弧直接连到顶点`$k$`上相关的顶点共有`$I$`个，如下图所示，为了方便表述，将这些前驱顶点分别记为`$t_1,t_2,...,t_I$`，相应的前驱顶点`$t_j \enspace(j \in \{1,2,...,I\})$`连接到终点`$k$`的弧的权重表示为`$w(t_j,k)$`：<!--more-->
```
        +----+
        |    |     w(t1,k)
        | t1 +-------------+
        |    |             |
+----+  +----+             |
|    |                     |
| t2 +-----------+         |
|    | w(t2,k)   |       +-v-+
+----+           +------->   |
                 +-------> k |
+----+ w(t3,k)   |       |   |
|    +-----------+       +-^-+
| t3 |                     |
|    |        +------------+
+----+        |    w(tI,k)
          +---++
 ......   |    |
          | tI |
          |    |
          +----+
```
如果能算出始点`$v_0$`到前驱点`$t_j \enspace (j \in \{1,2,...,I\})$`的所有最短路径(分别表示为`$D[t_j] \enspace(t_j \in \{1,2,3,...,n\}) $`)，那么`$v_0$`到点`$k$`的最短距离必定是`$D[t_j]+w(t_j,k)$`最小的那条路径。换言之，始点`$v_0$`到终点`$v_k$`的最短路径为`$\displaystyle\min_{t_j}\{D[t_j]+w(t_j,k)\}$`，其中`$t_j$`是终点`$k$`的前驱顶点，`$j=1,2,3,...,I$`。这就把问题分解成了规模更小的`$I$`个问题，这`$I$`个问题不再包含终点`$k$`，所以问题规模更小。

如果同时有办法知道顶点`$k$`的前驱顶点都有哪些，我们就可以采用递归算法轻松求解出最短路径。但是图的常规存储结构，不管是邻接矩阵，还是邻接链表，都只记录了与顶点相关的后续节点，并没有存储前驱节点。所以并不能直接采取从后往前推的策略，而是要根据图的存储结构特点，选取从前往后的推算方式。


### Dijkstra's 算法的基本原理

上面的分解思路指出：每一步分解，问题都变成了只经过某些点集中的点的最短路径问题，把最短路径问题分解到最后，将只包含初始始点`$v_0$`自身。尽管由于缺乏获取前驱节点的方式，无法采用直接递归的方法解决问题，但是问题规模分解的思路启发我们，可以逐步构建一个集合`$S$`，每次加入一个顶点`$j$`到集合`$S$`，然后挨个计算经过、或者不经过、但是最多只能经过`$S$`中的顶点时，到各终点的最短路径。随着新顶点不断加入到集合`$S$`，最终`$V-S=\emptyset$`时，就推算出了始点`$v_0$`到各终点的所有最短路径。

现在要考虑的问题是：按照何种顺序，从集合`$V-S$`中挑选出一个顶点`$j$`然后加入到集合`$S$`中？

如果按照距离`$v_0$`远近的顺序选择顶点，则可以证明：对于任意的终点`$k$`，下一条最短路径，要么是弧`$<v_0,k>$`，要么就是中间只经过`$S$`中的顶点而最后到达终点`$k$`的路径。因为一旦此路径之上有点在`$S$`之外，说明存在一条终点不在`$S$`，然而长度却比此路径更短的路径；但是我们是按照长度从小到大的顺序递推，所以是不可能产生这样的情况的。

所以采用按照距离始点`$v_0$`由近及远的顺序递推，可以保证一个很重要的约束条件：只经过、或者不经过、但是最多只能经过集合`$S$`中的顶点。根据之前的问题规模分解分析，这种情况下，每次加入新的顶点`$j$`到`$S$`，对于任意终点`$k\in (V-S)$`，如果存在弧`$<j,k>$`，中间只经过、或者不经过、但是最多只能经过`$S$`中的顶点，距始点`$v_0$`的最短路径可能就是`$D[j]+weight(j,k)$`。这是因为始点`$v_0$`到`$v_k$`之间的路径可能就是相应的最短路径`$(v_0,...,v_j,v_k)$`，故始点到终点`$k$`的最短距离可能为`$D[k]=D[j]+weight(j,k)$`。这里之所以说“可能”，原因在于图并不像树那样从顶点到某个节点有且仅有唯一的一条路径：从`$v_0$`到达顶点`$k$`的路径可能有多条（并不一定经过`$<j,k>$`）。所以需要判断条件`$D[k]>D[j]+weight(j,k)$`，如果为真，则说明现在找到的路径更短。

由于我们是按从近到远的顺序依次递推，下一时刻递推时，从`$V-S$`中选中距离`$v_0$`最短路径`$D[j]$`必然满足：
```math
%% KaTex
D[j]=\displaystyle\min_{i}\{ D[i] \enspace\mid\enspace i\in (V-S) \}
```
并且有`$D[i]$`要么是弧`$<v_0,v_i>$`的权值`$weight(v_0,v_i)$`，要么是`$S$`中某个顶点`$v_j$`的`$D[k]$`与弧`$<v_j,v_k>$`的权重之和。所以数组`$D[i]$`初始状态可以设置如下：
1. 若顶点`$i$`与始点`$v_0$`直接相连，则显然二者的边可能是最短路径，故有`$D[i]=w(i,v_0)$`
2. 若顶点`$i$`与始点`$v_0$`不直接相连，则暂时设置为`$D[i]=\infty$`，留待进一步处理。

通过这样从近到远依次递推，就可以求出指定源点到其他各个顶点的最短路径。

为了简化问题，在上述求解过程中，我们只记录了到某个点的最短路径长度大小，并未记录实际的路径经过哪些节点。实际上我们还可以增加一个数组`$P[]$`，其中`$P[k]$`用来记录顶点`$k$`作为最短路径终点时的前驱节点。当每次更新`$D[k]=D[j]+w(j,k)$`时，都顺带更新`$P[k]=j$`即可。当算法结束时候，对于任意一个顶点`$k$`，相应的最短路径只要取前驱节点`$P[k]$`压入栈中，再依次取前驱节点压入栈中，直至始点，然后依次弹出即可得到最短路径。


## 示例

### 示例一

举个例子，求下图从顶点0到任意一点的最短路径:
```
                      32
        +-----------------------------+
        |                             |
      +-+-+            +---+        +-v--
      |   |     11     |   |   15   |   |
+-----+ 0 +------------> 1 +--------> 6 <----+
|     |   |            |   |        |   |    |
|     +-+-+            +-+-+        +---+    | 4
|       |       +---+    |       9         +-+-+
|       |  8    |   |    +----------------->   |
|       +------>+ 2 |                      | 5 |
|               |   +---------------------->   |
|               +-+-+            15        +-^-+
|40               |5                         | 2
|               +-v-+                      +-+-+
|               |   |          6           |   |
|               | 3 +----------------------> 4 |
|               |   |                      |   |
|               +---+                      +-^-+
|                                            |
+--------------------------------------------+

```
1. 在初始时刻`$S=\{0\}$`，`$V-S=\{1,2,3,4,5,6\}$`，`$D=[\boxed{0},11,8,\infty,\infty,\infty,32]$`。为了方便，这里在`$D$`中相应元素上加方框，表示相应位置的顶点`$ \in S$`。
2. 现在从`$V-S$`顶点里面挑出顶点`$2$`(对应的`$D[2]=8$`值最小)，此时`$S=\{0\} \cup \{2\}=\{0,2\}$`，相应的就有`$V-S=\{1,3,4,5,6\}$`。从顶点`$0$`出发，后来又经过点`$2$`，之后可能到达的点有`$\{3,5\}$`：所以经过以下两步之后，得到`$D=\{\boxed{0},11,\boxed{8},\xcancel{\infty}\,13,\infty,\xcancel{\infty}\,23,32 \}$`
    * 路径(0...3)长度可能为`$D[3]=D[2]+weight(2,3)=8+5=13$`，由于比目前的`$\infty$`更小，于是更新之。
    * 路径(0...5)长度可能为`$D[5]=D[2]+weight(2,5)=8+15=23$`，由于比目前的`$\infty$`更小，于是更新之。
3. 现在从`$V-S$`顶点里面挑出顶点`1`(对应的`$D[1]=11$`值最小)，此时`$S=\{0,2\} \cup \{1\}=\{0,2,1\}$`，相应的就有`$V-S=\{3,4,5,6\}$`，所以从顶点`$0$`出发，后来又经过点1，之后可能到达的点为`$\{5,6\}$`。所以经过以下两步更新之后，得到`$D=\{\boxed{0},\boxed{11},\boxed{8},13,\infty,\xcancel{23}\,20,\xcancel{32}\,26 \}$`：
    * 路径(0...5)长度可能为`$D[5]=D[1]+weight(1,5)=11+9=20$`，由于比目前的`$D[5]=23$`更小，于是更新之，从而产生新的最短路径`$0...1 \rightarrow 5$`，而不是之前的`$0... 2 \rightarrow 5$`；
    * 路径(0...6)长度可能为`$D[6]=D[1]+weight(1,6)=11+15=26$`，由于比目前的`$D[6]=32$`更小，于是更新之，从而产生新的最短路径`$0...1 \rightarrow 6$`，而不是之前的`$0 \rightarrow 6$`。
4. 如此不断重复，选中顶点`$3$`(对应的`$D[3]=13$`)，得到新的`$D=\{\boxed{0},\boxed{11},\boxed{8},\boxed{13},\xcancel{\infty}\,19,20,26 \}$`
5. 选中顶点`$4$`(对应`$D[4]={19}$`)，则顶点`5`最短路径长度可能为`$D[5]=D[4]+weight(4,5)=19+2=21$`，比目前的`$D[5]=20$`更大，于是并不更新，得到`$D=\{\boxed{0},\boxed{11},\boxed{8},\boxed{13},\boxed{19},20,24 \}$`。
6. 选中顶点`$5$`(对应的`$D[5]=20$`)，得到顶点`6`最短路径可能为`$D[6]=D[5]+weight(5,6)=20+4=24$`，于是并不更新，得到`$D=\{\boxed{0},\boxed{11},\boxed{8},\boxed{13},\boxed{19},\boxed{20},24 \}$`。
7. 选择顶点`$6$`(对应的`$D[6]=24$`)，无更新。
8. 最终`$V-S=\emptyset$`，得到的`$D=\{\boxed{0},\boxed{11},\boxed{8},\boxed{13},\boxed{19},\boxed{20},\boxed{24} \}$`。

### 示例二


求下图的顶点0到各点的最短路径：
```
                    +---+
         100        |   |
  +-----------------> 2 <------+
  |                 |   |      |
  |                 +-^-+      |
+-+-+       +---+ 60  |        |
|   |  30   |   +-----+        |
| 0 +-------> 3 |              |
|   |       |   +-----+        |
+---+       +---+ 20  |        |
  |    10             |        |
  +----------+        |        |
             |        |     10 |
+---+      +-v-+    +-v-+      |
|   | 5    |   | 50 |   |      |
| 1 +------> 5 +----> 4 |------+
|   |      |   |    |   |
+---+      +---+    +---+
```

各过程分别为：
1. `$D=[\boxed{0}, \infty, 100, 30, \infty, 10]$`
2. `$D=[\boxed{0}, \infty, 100, 30, \xcancel{\infty}\,60, \boxed{10}]$`
3. `$D=[\boxed{0}, \infty, \xcancel{100}\,90, \boxed{30}, \xcancel{60}\,50, \boxed{10}]$`
4. `$D=[\boxed{0}, \infty, \xcancel{90}\,60, \boxed{30}, \boxed{50}, \boxed{10}]$`
5. `$D=[\boxed{0}, \infty, \boxed{60}, \boxed{30}, \boxed{50}, \boxed{10}]$`



## 算法实现

尽管用文字说明其思想非常繁琐，但是算法的核心部分却非常简单，省略初始化部分，可以用代码表示为：
```java
/**
  * @param {Vertex} source 表示指定的源点
  */
void dijkstra(Vertex source){

    // S[] ：标记是否已经加入，初始均为false，相应顶点加入集合S后设置为true
    // D[] : 最短路径长度数组，根据source和相应节点之间的权重做初始化
    // P[] : 最短路径前驱节点数组
    // 初始化S、D、P
    // ... 初始化代码省略

    while(true){
        // 找到当前已知的距离始点最短距离的顶点，也就是未访问过的、且D[]值最小的。
        Vertex v= findMinDistanceVertexOfUnknown(D,S);
        if(v == NULL){ break; }
        S[v.id]=true;    // 加入顶点v到集合S中

        // 由于加入了顶点v到集合S，那么通过v可以到达的那些顶点(也就是v的邻接点)的最短距离可能需要更新
        for(w:Vertex in v.getAdjacentVertexes()){
            if(S[w.id]){ continue; }
            if(D[v.id]+Graph.getWeight(v.id,w.id) < D[w.id]){
                D[w.id]=D[v.id]+G.getWeight(v.id,w.id);
                P[w.id]=v.id;
            }
        }
    }
}
```
