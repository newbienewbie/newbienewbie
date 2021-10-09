---
layout: post
title: WordPress Custom Post Type
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


WordPress自带了5种Post Type：

1. Post
2. Page
3. Attachment
4. Revision
5. Nav Menus

对于一个基本的博客，这些类型足以应付大多数需求。但是当情况复杂后，就需要定制自己的Post Type了。

## Custom Post Type

定制的Post Type可能是任何东西，不仅仅是面向公众的内容碎片。比如，可以定制自己的Post Type来跟踪程序中错误。

WordPress提供的Custom Post Type功能使得WP的Post足以模拟任何实体——“The only limitation is your imagination”。

### 注册定制的Post Type

注册新的Post Type类型可以用以下函数实现：

```PHP

register_post_type($post_type,$args_array);
```

一般都在`init`时进行注册：
```PHP
add_action('init',function(){
    register_post_type(
        'mytesttype',
        array(
            'labels' => array( 'name' => 'MyTester' ), 
            'public' => true, 
        )
    );
});

```

### 定制Post Type参数

函数`register_post_type()`的第二个参数提供了众多定制Post Type的选项：

* `public`    # 前台是否公众可见?默认为false
* `show_ui`   # 是否创建默认UI?默认为`public`定义的值
* `publicy_queryable`    # 前台公共可查？默认为`public`定义的值
* `exclude_from_search`  # 从搜索结果中排除?默认为`public`定义的值
* `show_in_nav_menus`    # nav menu可见?默认为`public`定义的值
* `supports`  # 哪些meta boxes?
    * `title`
    * `editor`
    * `author`
    * `thumbnail`
    * `excerpt`
    * `comments`
    * `trackbacks`
    * `custom-fields`
    * `page-attributes`
    * `revision`
    * `post-formats`
* `labels`         # array，用于各种情况下显示的标签
* `hierarchial`    # 默认为false
* `has_archive`
* `can_export`     # 可导出？默认为true 
* `taxonomies`     # array
* `menu_position`  # 默认在评论菜单之后
* `menu_icon`      # 图标
* `show_in_menu`   # 是否在admin menu中显示
* `show_in_admin_bar`   # 是否在admin bar中显示
* `capability_type`     # 
* `capability`          # an array of custom capabilities ( 改、删、阅、发布)
* `query_var`           # 查询变量
* `rewrite`             # 创建permalink

其中，`labels` 接受一个数组，用于各种情况下，需要显示的标签

* `name`                # 通用名，常为复数
* `singular_name`       # 单数形式 
* `add_new`             # Add New submenu item 
* `add_new_item`        # 列表页新建一个Post
* `edit_item`
* `new_item`
* `view_item`
* `all_items`
* `menu_name`
* `name_admin_bar`
* `search_items`
* `not_found`
* `not_found_in_trash`
* `parent_item_colon`

## Post Type 相关的常用函数

* `get_post_types($args,$output,$operator)`    # 获取指定条件下的Post Types
* `get_post_type($post)`                       # 获取指定post的Post Type
* `post_type_exists($post_type)`               # 是否存在指定类型的Post Type
* `add_post_type_support($post_type,$sups)`    # 增加support
* `remove_post_type_support($post_type,$sups)` # 增加support
* `set_post_type($postid,$post_type)`          # 设置Post Type类型
* `is_post_type_hierarchical('super_duper')`   # 是否是有等级的





