---
layout: post
title: LDAP、AD、和目录服务
date: 2016-12-22 22:05:25
tags:
- LDAP
- AD
categories:
- 大道
- 数据库
- LDAP
---

`LDAP` 全称为: `Lightweight Directory Access Protocol`，正如名字描述的那样，这是一套关于目录访问的协议。

## Directory Service 

一个 `Directory Service`基本上要包括这些：

* `directory` 本质上`条目树`（ `a tree of entries`）
* 每个`entry`都有一个`唯一名字`（`Distinguished Name`，`DN`）
* `entry`是一个`属性集合`（`a set of attributes`），可以类比于`table`和`column`的关系
* 一个`attribute`是一个`key-value`对

一个可视化表示：
```
# Directory Service 的表示

                o=org
              /       \
         ou=users     ou=groups
        /      |         |     \
    cn=wang  cn=lee    cn=dep1  cn=dep2
    /
keyid=foo
```

比如我们要访问记录 `cn=wang`，其`DN`为：
```
dn: cn=wang, ou=users, o=org
```
注意，最右边的  `o=org` 是 这个`Directory Service`的`root`。 

## LDAP 和 AD

* `LDAP` 就是和 `Directory Tree` 进行交互的协议，比如`search`、`add`、`update`、`delete`。可以把`LDAP`视作`NoSQL/document store`。
* `Active Directory`是一个 Windows 环境下的数据库系统，提供`authentication`, `directory`, `policy`和其他服务。

简单的说，`AD`是一个`directory services`数据库, and `LDAP` 是其中一种可以用于与之对话的协议。

