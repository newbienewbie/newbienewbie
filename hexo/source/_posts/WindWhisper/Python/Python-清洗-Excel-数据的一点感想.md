---
title: Python 清洗 Excel 数据的一点感想
date: 2017-08-03 20:03:11
tags:
- Python
- Excel
- 清洗数据

categories:
- 风语
- Python
---


这两年我是不大碰`Python`的，原因是我觉得搞网站、写爬虫、干自动化任务，用`Node.Js`编写速度更快、运行效率更高。但是最近在成都集中办公，作为数据组，主要工作就是要清洗数据，需要大量处理`Excel`，由于不太喜欢`VB`那啰嗦的语法，用`JScript`操作`Excel`又非常不得劲，于是不得不捡起`Python`：无他，简单，会得人多，库也就多。这两年`Python`在数据处理领域占据了绝对优势。

吐槽一句，这么多年来，`Python`一直以优雅自居。但是缩进语法并非表面上那样优雅，起码面对多行匿名函数的时候，始终优雅不起来。

## 工具

* `IPython`是个非常有意思的工具，但是貌似不提供`VIM`的键盘模式，于是照例在`VSCode`中安装`Jupyter`插件，从而兼得编译器和`IPython`。
* 使用`xlwings`操作`Excel`

## Python 操作 Excel 的一个例子

需求：有一个`Excel`表，其中某个`Sheet`的结构为：

* 井号
* 分层单位
* 层位
* ...

同一个井，不同的分层单位又不通的分层方案。总记录行数约为11万，其中有大量数据的层位数据有误，但是对于同一个分层单位对同一个井的分层方案，有目前以下规律：
1. 由于`T3h1`跟下层是整合关系，故其下伏层必定是应该`T3a4`或者`T3a`。
2. 如果`T3h1`之后是`T3a4`地层，且再之下的下伏层是`T3a`组内的，必定只能是`T3a3`，也就是说不能是`T3a1`或`T3a2`。
3. 类似的，`T3a3`下伏层出现的`T3a`组的地层，只能是`T3a2`；`T3a2`下伏层出现的`T3a`组的地层，只能是`T3a1`。
4. 任何一个层位`T3a${i}`（i=1,2,3）,都可以缺失掉，然后直接跳到其他组的层位.

起初我觉得要修改的数据量不大，直接在`Excel`中手工修改，后来才发现严重低估了这个工作量，大约耗费了我20分钟，我才意识到要修改的记录量可能要到数万，于是采用编程解决。

编程有两种思路：一、通过相关接口直接操作`Excel`表；二、读取`Excel`内容到内存或者数据库，然后修改后存回。由于其他字段有许多`Excel`样式，故直接采用思路一。


### 使用`Python`编写脚本

尽管层位出现的各类情况很多，但是经过思考就可以发现，只要按照分层单位、深度排序，层位`T3a${i}`只能出现在`T3h1`的后四个记录里。所以基本思路是找到层位字段值是`T3h1`的记录，然后向下搜寻四个，如果是`T3a`组的层段，则根据情况修改为对应的层位记录即可。

起手式必然是应该打开`Excel`，读入数据：

```Python
import xlwings as xw


book= xw.Book(r"./地质研究_07地层分层信息 合表 201708.03.01-P2.xlsx")
sht=book.sheets["合表"]
```

顺带封装下获取相应列字段的函数：
```Python
def getWell(rowNumber):
    return sht.range("B"+str(rowNumber)).value

def getLayerDept(rowNumber):
    return sht.range("E"+str(rowNumber)).value

def getLayer(rowNumber):
    return sht.range("G"+str(rowNumber)).value


```


然后是对修改后续某偏移行的层位的帮助方法：
```Python
def modifyNext(well,layer_dept,currentRowNumber,offset=1,layer="T2a4"):

    # 偏移行的井名
    _well= getWell(currentRowNumber+offset)
    # 偏移行的分层单位
    _layer_dept=getLayerDept(currentRowNumber+offset)
    # 偏移行的层位
    _layer=getLayer(currentRowNumber+offset)

    # 如果偏移行的井名或分层单位和给定的井位及分层单位不匹配，则什么也不做
    if(not well==_well or not layer_dept==_layer_dept):
        return

    if(_layer.startswith("T2a")):
        sht.range("G"+str(currentRowNumber+offset)).value=layer
        sht.range("G"+str(currentRowNumber+offset)).color=(254,226,239)
```

然后就是迭代搜查修改的主程序了：
```Python
arr=sht.range("G1").expand('down').value
for (idx,value) in enumerate(arr) :
    if(value=="T3h1"):
        currentRowNumber=idx+1
        # 检查下一行
        if(arr[currentRowNumber+1]=="T2a"):
            pass
        elif( arr[currentRowNumber+1]=="T2a4" and arr[currentRowNumber+2]=="T2a3"):
            pass
        else:
            print("!发现可疑错误：G",idx,"尝试修正后续4个层位...")
            xw.Range("G"+str(currentRowNumber)).color=(0,255,0)
            well=getWell(currentRowNumber)
            layer_dept=getLayerDept(currentRowNumber)
            modifyNext(well,layer_dept,currentRowNumber,1,"T2a4")
            modifyNext(well,layer_dept,currentRowNumber,2,"T2a3")
            modifyNext(well,layer_dept,currentRowNumber,3,"T2a2")
            modifyNext(well,layer_dept,currentRowNumber,4,"T2a1")

print("done")
```

## 一句话总结

库多真好。