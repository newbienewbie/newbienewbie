---
layout: post
title: WordPress Template Layer 1
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---



如基础架构中所述，WP的模板加载是通过wp-includes/template-load.php文件来完成的,根据模板等级结构，优先选择级别较低的模板。

在WordPress中，任意一个没有找到对应的模板文件的请求都会被index.php模板处理。

## 模板文件碎片

为了最大限度上复用模板，WordPress提供了以下默认的模板文件碎片

* header.php    #`get_header()`
* sidebar.php   #`get_sidebar()`
* footer.php    #`get_footer()`
* comments.php   #`comments_template()`,`wp_list_comments()`
* search.php


## 模板函数和钩子


以下三个钩子包装函数应该在每一套主题中设置：

* `wp_head()`         #在header.php模板的</head>关闭之前布置钩子
* `wp_footer()`       #在footer.php模板的</body>关闭之前布置钩子
* `comment_form()`    #在comments.php模板的</form>关闭之前布置钩子


### template tags的原理及其依赖

所谓templte tags，其实就是一些为模板编写的简单PHP函数，定义于

* `wp-includes/`
    * `template.php`、
    * `category-template.php`
    * `post-template.php`
    * `general-template.php`
    * ...

等之类的文件中。这些template tags为定制模板提供了极大的方便：

* `bloginfo()`    #常用于header、footer中，提供基本信息,如字符集、样式文件路径、模板URL等等

由于查询、渲染是个多步过程，一些template tags的使用是有条件的。例如，可以在Loop中使用的template tags:

* `the_title()`
* `the_permalink()`
* `the_author()`
* `the_author_post_link()`
* `the_date()`
* `the_time()`
* `the_excerpt()`
* `the_content()`
* `the_category()`
* `the_tags()`

这些template tags 依赖于`the_post()`函数在Loop的顶部执行后生成的$post对象，因此这些template tags不可在Loop外使用。

如果想使用类似的功能，可以一个定制的Loop，还可以使用以$postid为参数的get系列 template tag

* `get_the_title($postid)`
* `get_the_permalink($postid)`
* `get_the_category($postid)`
* `get_the_tags($postid)`
* `get_post($postid)`

`get_post()`返回$post对象,该对象的属性：
 
* `post_exerpt`
* `post_content`


## 引入JavaScript和CSS

直接在模板中硬编码引入JavaScript容易造成冗余及依赖问题，WordPress提供了以下两个函数确保JavaScript按合适的顺序加载。

* `wp_enqueue_script()`
* `wp_print_scripts()`


可以在 functions.php 中创建一个函数来负责处理主题中的所有JavaScript脚本

```PHP

function theme_javascript(){
    wp_enqueque_script(
        'jquery-corners',
        'http://example.com/jquery-corners.js',
        array('jquery')
    );
}


function theme_print_scripts(){

    $js=<<<EndOfString
    <script type='text/javascript'>
        jQuery.noConflict();
        jQuery(document).ready(function(){
            //...
        });
    </script>

}


add_action('wp_head','theme_print_scripts');
add_action('wp_enqueue_script','theme_javascript');

```







