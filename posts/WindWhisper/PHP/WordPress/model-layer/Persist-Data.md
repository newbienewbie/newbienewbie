---
layout: post
title: 保存插件的数据到数据库
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---



大多数WordPress插件都需要获取管理员或用户输入的一些信息，并保存在会话中，以便在过滤器函数(filter)、动作函数(action)和模板函数(template)中使用。若需要在下次会话中继续使用这些信息，就必须将它们保存到WordPress数据库中。以下是将插件数据保存到数据库的几种方法：

1. 使用WordPress的"选项"机制。
2. 使用文章元数据（又名自定义域）。
3. 使用自定义分类。
4. 使用其他数据表
5. 创建一个新的，自定义的数据库表。这种方式适合保存那些与个人文章、页面或附件无关的，会随着时间逐渐增长的，并且没有特定名称的数据。关于如何使用，你可以阅读Creating Tables with Plugins以获取更多信息



## WordPress选项机制

WordPress有一个"选项"机制，适合储存少量静态的、具有特定名称的数据(通常是网站所有者在创建插件时设置的一些初始化参数，并且以后很少会进行改动) 。
选项的值可以是字符串、数组，甚至是PHP对象（当然，PHP对象在保存时必须能够被序列化或转换成字符串，检索的时候也必须能够被反序列化）。选项的名称必须是字符串，且必须是唯一的，这样才能够确保它们不会和WoredPress或其它插件产生冲突。

对应数据库中数据表`{$wpdb->prefix}_options`。该表结构类似于：

```
mysql> select * from wp_options limit 25;
+-----------+---------------------------+-----------------------------+----------+
| option_id | option_name               | option_value                | autoload |
+-----------+---------------------------+-----------------------------+----------+
|        11 | comments_notify           | 1                           | yes      |
|        12 | posts_per_rss             | 10                          | yes      |
|        13 | rss_use_excerpt           | 0                           | yes      |
|        14 | mailserver_url            | mail.example.com            | yes      |
|        15 | mailserver_login          | login@example.com           | yes      |
|        16 | mailserver_pass           | password                    | yes      |
|        17 | mailserver_port           | 110                         | yes      |
|        18 | default_category          | 1                           | yes      |
|        19 | default_comment_status    | open                        | yes      |
|        20 | default_ping_status       | open                        | yes      |
|        21 | default_pingback_flag     | 1                           | yes      |
|        22 | posts_per_page            | 10                          | yes      |
|        23 | date_format               | F j, Y                      | yes      |
|        24 | time_format               | g:i a                       | yes      |
|        25 | links_updated_date_format | F j, Y g:i a                | yes      |
+-----------+---------------------------+-----------------------------+----------+
```

选项机制的几个主要函数：

* `add_option($name,$value,$deprecated,$autoload)`
* `get_option($name)`
* `update_option($name,$value)`
* `delete_option()`

通常情况下，最好能够对插件选项的数量进行一下精简。例如，如果有10个不同名称的选项需要保存到数据库中，那么，就可以考虑将这10个数据作为一个数组，并保存到数据库的同一个选项中。 

## 文章元数据

这种方式与第一种方案类似，但是与具体的post相关联，故而适合保存与post相关的数据。

对应数据表`{$wpdb->prefix}_postmeta`,基本的数据结构类似于：

```
mysql> select * from wp_postmeta limit 15 ;
+---------+---------+-----------------------------+-----------------------------+
| meta_id | post_id | meta_key                    | meta_value                  |
+---------+---------+-----------------------------+-----------------------------+
|       1 |       2 | _wp_page_template           | default                     |
|       2 |       5 | _edit_last                  | 1                           |
|       3 |       5 | _edit_lock                  | 1441571672:1                |
|       4 |       7 | _edit_last                  | 1                           |
|       5 |       7 | _edit_lock                  | 1441572102:1                |
|       6 |       8 | _edit_last                  | 1                           |
|       7 |       8 | _edit_lock                  | 1441572197:1                |
|       8 |      10 | _menu_item_type             | custom                      |
|       9 |      10 | _menu_item_menu_item_parent | 0                           |
|      10 |      10 | _menu_item_object_id        | 10                          |
|      11 |      10 | _menu_item_object           | custom                      |
|      12 |      10 | _menu_item_target           |                             |
|      13 |      10 | _menu_item_classes          | a:1:{i:0;s:0:"";}           |
|      14 |      10 | _menu_item_xfn              |                             |
|      15 |      10 | _menu_item_url              | http://localhost/wordpress/ |
+---------+---------+-----------------------------+-----------------------------+

```

涉及到的一些基本的CRUD函数为：

* `add_post_meta()`
* `get_post_meta()`
* `update_post_meta()`
* `delete_post_meta()`

实际上，WordPress2.9之后，引入了`register_post_type`来创建新的Post Type。配合对元数据的操作函数，可以极大程度上模拟各种实体功能，从而避免创建新的的数据表。

```PHP
//...某插件提供的Post Type注册方法片段

register_post_type(
    self::POST_TYPE,
    array(
        'labels' => array(
            'name' => __(sprintf('%ss', ucwords(str_replace("_", " ", self::POST_TYPE)))),
            'singular_name' => __(ucwords(str_replace("_", " ", self::POST_TYPE)))
        ),
        'public' => true,
        'has_archive' => true,
        'description' => __("This is a sample post type meant only to illustrate a preferred structure of plugin development"),
        'supports' => array(
            'title', 'editor', 'excerpt', 
        ),
    )
);
```
一旦使用了自定义的Post Type来作为Entity，就可以使用WordPress自带的CRUD函数来操作：

* `wp_insert_post()` #Create a new post (C).
* `get_post()`       #Retrieve a post (R).
* `wp_update_post()` #Update an existing post (U).
* `wp_delete_post()` #Delete a post (D).

当然，搭配到WordPress的钩子上，就更强大了。例如：

* `save_post`             # 当保存文章时被触发的钩子事件
* `save_post_{post_type}` # WP3.7新增钩子,无须校验`is_post_type($post_type)`


## Custom Taxonomy

WordPress默认内置了4种Taxonomies:

1. Category      #往往是写文章之前就预定义好的
2. Tag           #往往拥有多个tag，可在写文章时即时生成
3. Link Category #往往只在内部使用，可用来categorize links
4. Post Formats  #meta信息，可以用来定制文章的呈现形式。

除此之外，WordPress还允许创建自己的taxonomies。

这种方式适合保存那些需要分门别类存放的数据，如用户信息、评论内容以及用户可编辑的数据等，特别适合于当你想要根据某个类型去查看相关的文章和数据的情况。


## 使用WordPress内置的其他数据表

WordPress为内置数据表提供了许多便利函数，比如Users数据表:

```
* `wp_create_user()`#Create a new user (C).
* `get_userdata()`  #Retrieve a user’s data (R).
* `wp_update_user()`#Update an existing user (U).
* `wp_delete_user()`#Delete a user (D).
```


## 建立额外的数据表

除了使用现有的数据库模式之外，还可以添加自己的数据表。如著名的插件WooCommerce就添加了定制的数据表：

```
+-------------------------------------------------+
| Tables_in_wordpress                             |
+-------------------------------------------------+
| wp_woocommerce_api_keys                         |
| wp_woocommerce_attribute_taxonomies             |
| wp_woocommerce_downloadable_product_permissions |
| wp_woocommerce_order_itemmeta                   |
| wp_woocommerce_order_items                      |
| wp_woocommerce_tax_rate_locations               |
| wp_woocommerce_tax_rates                        |
| wp_woocommerce_termmeta                         |
+-------------------------------------------------+

```

### create schema

### update schema

### 日常操作

可借助于WPDB类全局类对象$wpdb提供的方法完成。

```PHP
$wpdb->insert(
    $table_name,
    array(
        'time'=>current_time('mysql'),
        'name'=>$welcome_name,
        'text'=>$welcome_text
    )
);
```







