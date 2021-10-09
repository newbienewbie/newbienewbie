---
layout: post
title: PHPCMS分析1-基础架构分析
date: 2015-04-10 09:27:08
tags:
- PHPCMS
- 源码分析

categories:
- 风语
- PHP
- PHPCMS
---


PHPCMS整体设计思路，还是遵循基本的MVC模式。

## 路由功能与控制器的分离

PHPCMS访问index.php文件时，会加载phpcms/base.php文件，
该base.php文件定义了一堆常量、和一个pc_base类。此pc_base类提供一系列静态方法，这些静态方法的功能大多都是用于加载与index.php同级目录下的phpcms/下的各个相关文件(load_config除外)，如：
```PHP
//加载系统类 位于phpcms/libs/classes/下
pc_base::load_sys_class("类名","模块名",$initialize);
//加载系统函数 位于phpcms/libs/functions/下 
pc_base::load_sys_func('函数名');

//加载模块下的类 位于phpcms/modules/模块/classes/下
pc_base::load_app_class("类名","模块名",$initialize);
//加载模块下的函数 位于phpcms/modules/模块/functions/下 
pc_base::load_app_func();

//加载数据模型 位于phpcms/model/下 
$db=pc_base::load_model("文件名_无后缀");

//加载配置 位于caches/下
$v=pc_base::load_config($filename,$key);
```
在index.php加载完base.php后，又执行了pc_base::creat_app()函数。此函数定义为：
```PHP
public static function creat_app() {
    return self::load_sys_class('application');
}

```
此方法只是简单加载系统类application。
从功能上说，application类起到了一个路由功能，其构造函数__construct()会调用init()方法，根据传入的相关URL参数去调用对应的module下相关controller的特定action方法。

module、controller、action对应参数m、c、和a。如果不提供action参数，则会默认调用控制器的init()方法。

例如url为``index.php?m=product&c=index&a=lists``会调用product模块下的index类中的lists方法。

## 数据模型加载

在控制器中利用语句
```PHP
$md=pc_base::load_model('your_model');
```
可以加载相关模型类，系统的模型类在libs/classes/model.class.php中定义，各模块下模型定义在model/文件下，并继承自系统的model类。


## 视图层模板加载
对于控制器模板，基本思路还是利用
```PHP
include $your_template_file_name;
```
但是PHPCMS根据前后台的不同，在自身文件结构目录上自定义两个求得路径的函数

* template($module,$file) 获取指定module前台模板
* admin_tpl($file,$module) 获取指定module下的后台模板（默认是获取当前module的后台模板）

如后台模板经常会在顶部调用：
```PHP
include $this->admin_tpl('header', 'admin');
```
以此来加载admin/templates/header.tpl.php文件

