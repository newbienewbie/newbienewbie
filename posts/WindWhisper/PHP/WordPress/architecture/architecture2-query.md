---
layout: post
title: WordPress 前台基础架构分析之二：查询篇
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


## WordPress查询过程

WordPress查询过程也即`wp()`函数的调用过程, 该函数定义于`wp-includes/functions.php`文件中:

```PHP
//wp-includes/functions.php

function wp( $query_vars = '' ) {
	global $wp, $wp_query, $wp_the_query;
	$wp->main( $query_vars );

	if ( !isset($wp_the_query) )
		$wp_the_query = $wp_query;
}
```

这里涉及到三个全局类对象，`$wp`,`$wp_query`,`$wp_the_query`，均定义于`wp-settings.php`中，其中:

1. `$wp`则是的`WP`类(文件`wp-includes/class-wp.php`)的实例,表示当前请求的WordPress博客环境信息
2. `$wp_the_query`和`wp_query`为`WP_Query`类(文件`wp-includes/class-wp.php`)实例，用于查询(其实是后者是对前者的引用)


### `WP`类

`$wp`有如下关键的属性和方法

* 属性 
    * `$query_vars`和`$query_string`: 如m,p,posts,w,cat,s,exact,page,more,orderby,tag等等
    * `$request` : Permalink或者request URI
    * `$matched_rule` 和`$matched_query` : 重写匹配到的请求
* 方法
    * `main($query_vars='')`: 设置所有的变量到该环境类对象,该方法实际上只是调用这些方法
        * `init();`                       #初始化
        * `parse_request($query_args);`   #解析请求
        * `send_headers();`               #发送响应头
        * `query_posts();`                #执行查询
        * `handle_404();`                 #处理404
        * `register_globals();`           #注册全局变量

最值得关注的是这个`$wp->query_posts()`方法,其实调用的是在文件`settings.php`中定义的全局对象`$wp_the_query`进行调用

```PHP
public function query_posts() {
    global $wp_the_query;
    $this->build_query_string();
    $wp_the_query->query($this->query_vars);    #调用WP_Query类对象的查询方法
}
```

### WP_Query

#### WP_Query的作用

除了直接使用$wpdb调用相关的模型层方法，WordPress针对自身的数据库schema和常用功能设计了`WP_Query`类,该类位于WPINC/query.php文件中。

该类的构造器接受一个`query_string`的查询字符串或者对应的数组作为参数,返回一个`WP_Query`类对象,如：

```PHP
$posts=new WP_Query(array(
    'showposts'=>10,
    'offset'=>0,
    'category'=>0,
    'orderby'=>'post_date',
    'order'=>'desc',
    'include'=>'',
    'exclude'=>'',
    'meta_key'=>'',
    'meta_value'=>'',
    'post_type'=>'post',
    'suppress_filters'=>true,
    'post_status'=>'publish'
));
```

当这个`$wp_query`对象执行查询后,一系列相应的属性会被重新设置。根据这些属性值，Loop过程会加载不同的模板。

比如，如果`$wp_query->is_search()`属性值被设置为真，WordPress会使用`search.php`模板(如果有的话)。

### WP_Query的属性和方法

该类提供了一系列初始的属性和方法：

* 属性
    * `$query`    #保存了`wp_parse_args($queryString)`的返回值;
    * `$query_vars`    #`$query`的关联数组
    * `$queried_object`    #保存了请求的category,author,post 或page的信息
    * `$queried_object_id`
    * `posts`           #`get_posts()`返回值，表示请求的posts
    * `post_count`      #`get_posts()`返回的`posts`的数量
    * `current_post`    #用于迭代，将要被显示的post的index
    * `post`            #用于迭代，当前被显示的post
    * `is_xxx`   #query flags 属性
* 方法
    * `init()`   #初始化并设置默认值
    * `parse_query()` #解析query string或者相应数组,并设置query type booleans
    * `parse_query_vars()`    #这个函数只是重新调用`parse_query()`
    * `get_posts()`   #从数据库中获取请求的posts，并生成`$posts`和`$post_count`
    * `query()`       #调用`parse_query()`和`get_posts()`
    * `rewind_posts()` #rewind 
    * `have_posts()`   #是否有posts
    * `next_post()`    #在`$posts`中迭代倒下一个位置，递增`$current_post`，设置`$post`
    * `the_post()`     #迭代到下一个位置，并且设置全局$global变量
    * `get_queried_object()` 
    * `get_queried_object_id()`
    * `get()`
    * `set()`
    * `is_xxx()`

值得注意的是，`query()`方法是这里的核心方法，它负责两大业务:

1. 是解析查询参数(并设置相应的属性值)
2. 是根据解析参数值进行数据库查询(并设置相应属性)

实际上只是调用:

1. `parse_query()`
2. `get_posts()`

当执行完查询之后，常用的可用属性包括：
* `order`
* `orderby`    #`author`|`date`|`title`|`modified`|`menu_order`|`parent`|`ID`|`rand`|`meta_value`| `none`
* `cat`,`tag`
* `category_name`
* `categroy__and`,`tag__and`    #数组
* `category__in`,`tag__in`    #数组
* `category__not_in`
* `tag_slug__and`
* `tag_slug__in`
* `showposts`
* `p`
* `name`
* `page_id`
* `pagename`
* `post__in`
* `post__not_in`
* `post__type`
* `post_status`
* `author`
* `author_name`
* `hour`
* `minute`
* `second`
* `day`
* `monthnum`
* `year`
* `w`
* `paged`
* `offset`
* `meta_key`
* `meta_compare`




