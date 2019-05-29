---
title: 机器学习 KNN算法
date: 2019-05-29 19:20:01
tags:
- 炼丹
- 机器学习
- 分类技术
- KNN
- FSharp
categories:
- 大道
- 炼丹
- 机器学习
---


## `KNN`算法的基本思想

考虑一个平面上有数百个样点，这些样点分属于`A`类、`B`类和`C`类。已知各个点的类别与其坐标存在某种密切的关联，特定类别的点会在某个区域富集。现有一个新的点，已知该点周边最近的`$K$`个点中，几乎都属于`A`类，问该点最有可能是哪个类？

常识告诉我们，该点很可能也属于`A`类。这便是`KNN`的基本思想——最邻近的`$K$`个点中，如果其中大部分点都属于某个类别，那么该点就很可能也属于该类。


## `KNN`算法的实现

`KNN`算法非常简单：

1. 计算该点与所有样点之间的距离(这里采用**欧几里得距离**)
2. 找出最近的`k`个样品
3. 统计这`k`个样品的类别


对于点`$\bold x^{(p)}$` 和点`$\bold x^{(q)}$`之间的**欧几里得距离**，其实就是各个**分量之差的平方和**。令:

`$\bold x^{(p)}=(x^{(p)}_1,x^{(p)}_2,x^{(p)}_3,...,x^{(p)}_n)$`，
`$\bold x^{(q)}=(x^{(q)}_1,x^{(q)}_2,x^{(q)}_3,...,x^{(q)}_n)$`,

则**欧几里得距离**可以表示为：
```math
%% KaTex
\text{Distance} =\displaystyle \sum_{t=1}^{n} (x^{(p)}_t - x^{(q)}_t)^{2}
```

用代码表示则是：
```fsharp
/// Euclidean distance function
let distance (values1: float list) (values2: float list) = 
    List.sumBy 
        (fun it -> Math.Pow( float( (fst it) - (snd it)), 2.0)) 
        (List.zip values1 values2)
```
根据前面描述的算法，可以给出`KNN`的算法完整实现如下(由于最近在学习`F#`，所以这里使用`F#`)：<!-- more -->
```fsharp
/// Sample Entry
type Entry = { Label: string; Value: float list }

/// KNN algo
let KNN (k: int) (entries: Entry list) (entry: Entry)  = 
    entries 
    |> List.map (fun x ->  (x.Label, distance (x.Value) (entry.Value) ) )
    |> List.sortBy snd
    |> List.take k
    |> List.countBy fst
```

### 测试

考虑有一个`wdbc.data`文件，第一列是人员编号，第二列是当前分类，后面各列是相应的特性分量，则可以通过以下函数加载成一个`List<Entry>`:
```csharp
/// 加载数据集文件，生成 Entry List
let loadValues (fileName: string) : Entry list =
    File.ReadAllLines fileName
    |> Array.skip 1
    |> Array.map (fun line ->
        let items = line.Split(",")
        {
            Label = items.[1];
            Value = items
                |> Array.skip 2
                |> Array.map float 
                |> Array.toList
        }
    )
    |> Array.toList
```


测试代码：

```fsharp
[<EntryPoint>]
let main argv =
    let dir = Directory.GetCurrentDirectory()
    let path = Path.Combine(dir,"wdbc.data" )
    let entries = loadValues path
    let result = KNN 5 (entries|> List.take 50 ) (entries|> List.skip 50 |> List.head)

    printf "%A\r\n" result

    0 // return an integer exit code
```