---
layout: post
title: WordPress 前台基础架构分析之一:基本流程 
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


## 基本流程代码分析

WordPress并没有统一的入口，比如

* `wp-login.php`    #用于登录
* `wp-admin/index.php`    #用于后台管理
* `index.php`    #前台博客功能入口

这里要分析的是WordPress的前台功能基础架构。


## 前台入口的基本逻辑


前台入口文件`index.php`非常简单，所做的只是转而去加载WordPress博客头`wp-blog-header.php`文件。

```PHP
//index.php

/** Loads the WordPress Environment and Template */
require( dirname( __FILE__ ) . '/wp-blog-header.php' );
```

而这`wp-blog-header.php`文件所做的事儿则是WordPress博客功能的核心：

```PHP

if ( !isset($wp_did_header) ) {
	$wp_did_header = true;


	#加载所有的必需文件
	require_once( dirname(__FILE__) . '/wp-load.php' );


	#执行WordPress的查询过程，设置相应全局变量
	wp();


	#利用模板加载器加载相应的模板
	require_once( ABSPATH . WPINC . '/template-loader.php' );
}
```

综上所述，WordPress博客功能便是做这三件事:

1. 加载必要的基础文件
2. 执行查询并设置一些列全局变量，
3. 加载特定的模板模板输出响应。

