---
layout: post
title: PHPCMS分析6-后台二次开发与安装包设计
date: 2015-04-15 02:29:08
tags:
- PHPCMS
- 源码分析

categories:
- 风语
- PHP
- PHPCMS
---



PHPCMS采用了MVC分层架构，对于一个模块前台功能，只需要访问：
```PHP
http://localhost/phpcms/index.php?m=mymodule&c=my_controller&a=init
```
既可以实现加载。但是，如《PHPCMS分析2-Amin原理分析》所述，PHPCMS的设计者认为，用户对后台的管理操作都应该通过PHPCMS提供的admin模块进行。所以，当我们为一个模块开发了后台控制器my_admin，并直接在浏览器中访问如下URL：
```PHP
http://localhost/phpcms/index.php?m=mymodule&c=my_admin&a=init
```
会因pc_hash校验失败而被拒绝访问。

{% asset_img "pc_hash_failed.png" "pc_has_failed" %}

其机理在于后台控制器继承自admin类，admin的__construct()会调用check_hash方法，当客户端传来的hash失败时就会提示这样的对话框了。

考虑到admin界面的菜单是从menu中加载的、并在用户点击的时候执行的，所以二次开发时，除了需要像前台实现那样提供MVC分层代码，还需要在数据库中的

* 菜单表(menu)里添加相关记录，配置出moduel、controller、action等信息；
* 在管理角色权限表（admin_role_priv）配置相关角色对mca的访问权限。

这样当用户点击后台管理菜单的时候，就会通过JavaScript改变iframe的src属性，从而触发对相关m、c、a的访问。整个过程大致分为三个过程:

* 请求该menu关联url的响应
* 请求当前current_pos
* 还有一个跨域请求被屏蔽了……

{% asset_img "menu_clicked.png" "menu_clicked" %}


所以，开发一个模块的后台管理，大致过程为：

* 新建模块为snptest，
* 控制器snptest，
* init方法为输出 ``this is admin from snptest``

再在menu表中插入一条新的菜单记录

```SQL
insert into menu 
(id,name,parentid,m,c,a,data,listorder,display,project1,project2,project3,project4,project5)
values
(id,snptest_init,29,snptest,snptest,init,'',0,1,1,1,1,1,1)
```



在未配置权限表的情况下，利用root角色，刷新缓存后访问后台即可看到效果为：

{% asset_img "admin_dev_demo.png" "admin_dev_demo" %}

尽管header.tpl.php里的JavaScript脚本会自动为<a>的href属性和<form>元素的action属性添加pc_hash，但是，仍有时候我们需要手动获取pc_hash（比如需要利用Ajax加载数据）,这时候可以考虑两种策略：

1. 在服务端把pc_hash echo到iframe内
2. 直接在客户端利用JavaScript获取pc_hash后操作：

```JavaScript
var pc_hash=parent.window.pc_hash;
```


# PHPCMS二次开发安装包设计

开发好了新的模块，为了方便别人更好的使用，需要提供安装包。所谓安装包，其实只是一些列文件罗列，PHPCMS会自动复制这些文件到相关文件夹下。

* xx/ 
    * modules/ 
        * classes/    #模块类库，通过load_app_class($class,$module,$initialize)加载
        * functions/    #模块函数库，通过load_app_func($func,$module)加载 
        * templates/   #后台模板库，通过 
            * xx_yy.tpl.php    
            * xx_zz.tpl.php
        * index.php    #前台控制器 
        * xx_admin.php    #后台控制器 
        * install/  #安装包 
            * languages/  #语言包，会被复制到系统的语言包中
                * zh-cn/
            * templates/    #前台模板，会被复制到系统的前台模板包中 
                * index.html 
                * list.html 
            * config.inc.php    #基本信息 
            * extention.inc.php    #指明了后台管理菜单 
            * model.php    #指明了该模块都使用了哪些model 
            * xx.sql    #创建数据表SQL
            * module.sql     #向module表中新增加一行关于该模块的信息 
        * uninstall/ 
    * module/ 
        * xx_model.class.php #模型层


