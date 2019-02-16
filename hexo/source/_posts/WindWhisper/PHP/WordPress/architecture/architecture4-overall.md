---
title: WordPress 前台基础架构分析之四：总览
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


## 核心函数基本构成

WordPress核心文件包含了绝大部分WordPress流行函数，均位于`wp-includes/`文件夹下。

* functions.php     # main API
* options.php       # Options API
* plugin.php        # Plugin API
* User.php          # User API
* Post.php          # Post API
* Taxnonmy.php      # Taxnonmy API
* formatting.php    # Formatting Functions
* pluggable.php     # 可覆盖的API
* ..，

这些众多的文件定义了众多API，常见的有：

* Plugin API
* Widgets API
* Shortcode API 
* HTTP API          # 发送HTTP请求
* Settings API 
* Options API 
* Dashboard Widgets API
* Rewrite API

## 再看Loop时的全局变量

前文已经说到，WordPress的博客功能其实就是再做三件事:

1. 加载必要的文件
2. 根据条件查询数据库，然后保存到全局对象或者全局对象中。
3. 根据查询后的结果，选择加载合适的模板。

Loop时设置的关键的全局变量有：

* Post Dtata : `$post`
* Author Data : `$autordata` 
* User Data : `$current_user`
* Environment Data: 环境变量
    * 客户端：`$is_IE`,`$is_iphone`,`$is_mobile`,...
    * 服务端： `$is_apache`,`$is_IIS`

WordPress定义的Template Tag 会根据全局变量的不同，给出相应的值（或者默认值）。

因此，应该优先调用Template Tag而非使用全局对象或者变量。










