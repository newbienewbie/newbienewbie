---
layout: post
title: crowbar源码阅读笔记(2):变量管理
date: 2017-08-19 20:17:01
tags:
- 编译原理
- 自制编程语言
- crowbar
categories:
- 大道
- 编译原理
- 自制编程语言
---

这是《自制编程语言》一书中的脚本语言`crowbar`的源码阅读笔记(2):变量管理

## 变量管理

在第一篇《crowbar源码阅读笔记(1):基本的数据结构》中提到，变量有两个基本属性：变量名、变量值。变量之间采用链表的形式组织。相应环境(局部、全局)下有各自的一批变量。

### 注册变量

在一个局部环境中注册变量，需要告知该环境对象需要登记的 **标识符** 和 **变量值**，然后`crowbar`会在内存中创建一个变量对象，填好`name`和`value`，然后把它作为环境变量链表的第一个节点 ：
```c
void crb_add_local_variable(LocalEnvironment *env, char *identifier, CRB_Value *value)
{
    /* 分配内存，创建新的变量 */
    Variable    *new_variable;
    new_variable = MEM_malloc(sizeof(Variable));
    new_variable->name = identifier;
    new_variable->value = *value;

    /* 把原链表第一个节点作为新增变量的下一个节点 */
    new_variable->next = env->variable;
    /* 修改环境变量链表：设置新增变量为环境变量链表的第一个节点 */
    env->variable = new_variable;
}
```

注册全局变量也是类似的过程：

<!-- more -->
```c
void CRB_add_global_variable(CRB_Interpreter *inter, char *identifier, CRB_Value *value)
{
    Variable    *new_variable;

    new_variable = crb_execute_malloc(inter, sizeof(Variable));

    /* 设置新增变量的name */
    new_variable->name = crb_execute_malloc(inter, strlen(identifier) + 1);
    strcpy(new_variable->name, identifier);

    /* 把原链表第一个节点作为新增变量的下一个节点 */
    new_variable->next = inter->variable;
    /* 修改环境变量链表：设置新变量为环境变量链表的第一个节点 */
    inter->variable = new_variable;

    /* 设置新增变量的value */
    new_variable->value = *value;
}
```

从上文可以看出，每次想向相应的环境(局部或者全局)新增变量，`crowbar`都会把新增的变量放到变量链表的首位。

### 变量解析

上文说到，`crowbar`以链表的方式组织相应环境中的变量，故变量解析也是直接从头开始遍历`Varible`链表，检查链表相应节点的变量名是否和相应的标识符一致，其实现非常简单：

```c

/* 在局部环境中搜索标识符 */
Variable * crb_search_local_variable(LocalEnvironment *env, char *identifier) {
    Variable    *pos;
    if (env == NULL) return NULL;
    for (pos = env->variable; pos; pos = pos->next) {
        if (!strcmp(pos->name, identifier))
            break;
    }
    if (pos == NULL) { return NULL; } 
    else { return pos; }
}

/* 在全局环境中搜索标识符 */
Variable * crb_search_global_variable(CRB_Interpreter *inter, char *identifier)
{
    Variable    *pos;

    for (pos = inter->variable; pos; pos = pos->next) {
        if (!strcmp(pos->name, identifier))
            return pos;
    }

    return NULL;
}
```
