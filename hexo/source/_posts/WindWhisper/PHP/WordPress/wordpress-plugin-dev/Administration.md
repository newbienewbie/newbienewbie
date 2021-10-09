---
layout: post
title: WordPress Plugin Administration Screens
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---



## 菜单页面函数概要

与后台管理菜单相关的函数如下：

通用菜单页面管理函数
* Menu Pages
    * `add_menu_page()`       # Add a top level menu page 
    * `remove_menu_page()`    # Remove a top level menu page
    * `add_object_page()`     # Add a top level menu page at the 'object' level
    * `add_utility_page()`    # Add a top level menu page at the 'utility' level
* SubMenu Pages
    * `add_submenu_page()`    # Add a submenu page. 
    * `remove_submenu_page()` # Remove a submenu page

其中，
`add_object_page`  :在object级别增加一个顶级菜单。新菜单会出现在Posts, Media, Links, Pages 和Comments组中。
`add_utility_page` :在utility级别增加一个顶级菜单。新菜单会出现在Appearance, Plugins, Users, Tools 和Settings组中。 


原型为： 
```PHP
//三个增加顶级菜单的函数
add_menu_page   ( $page_title, $menu_title, $capability, $menu_slug, $function, $icon_url, $position );
add_object_page ( $page_title, $menu_title, $capability, $menu_slug, $function, $icon_url ); 
add_utility_page( $page_title, $menu_title, $capability, $menu_slug, $function, $icon_url );

//移除菜单的函数
remove_menu_page( $menu_slug )
```

除了增加顶级菜单，还增加/移除子菜单：

```PHP
//增加子菜单管理页面
add_submenu_page( $parent_slug, $page_title, $menu_title, $capability, $menu_slug, $function );
//移除子菜单管理页面
remove_submenu_page( $menu_slug, $submenu_slug );
```

为简化调用，除了直接调用`add_submenu_page()`外，WordPress还提供了以下函数：

* `add_dashboad_page()`   # Add submenu page to the `Dashboard` menu
* `add_posts_page()`      # Add submenu page to the `Comments` menu
* `add_media_page()`      # Add submenu page to the `Comments` menu
* `add_comments_page()`   # Add submenu page to the `Comments` menu
* `add_theme_page()`      # Add submenu page to the `Appearance` menu 
* `add_plugins_page()`    # Add submenu page to the `Plugins` menu 
* `add_users_page()`      # Add submenu page to the `Users` or `Profile` menu 
* `add_management_page()` # Add submenu page to the `Tools` menu
* `add_options_page()`    # Add submenu page to the `Settings` menu. 


这些函数可以方便地在相应内置的顶级菜单下添加子菜单页面。如`add_options_page()`原型为：

```PHP
add_options_page( $page_title, $menu_title, $capability, $menu_slug, $function); 
```
可以在设置菜单下添加相应的子菜单页面。

## 钩子

根据WordPress官方文档的描述，要创建一个菜单页面，必须要做三件事：

1. 创建一个用于创建menu的函数。
2. 创建当这个菜单被点击时的输出(类似菜单被点击时的回调函数)。
3. 把这个menu创建函数注册到动作型钩子`admin_menu`上。

对于PHP5.3以上的版本，使用匿名函数可以更清除的表示菜单页面的概念：

```PHP

add_action( 'admin_menu', 'my_plugin_menu' );

function my_plugin_menu() {

    //在Options下添加子菜单
    add_options_page( 
        'My Plugin Options',     // page title
        'My Plugin',             // menu title
        'manage_options',        // capability
        'my-unique-identifier',  // menu slug
        function(){              // 当菜单被点击后,调用此函数，输出内容将作为管理界面的右部子界面
            if ( !current_user_can( 'manage_options' ) )  {
                wp_die( __( 'You do not have sufficient permissions to access this page.' ) );
            }
            echo '<div class="wrap">';
            echo '<p>Here is where the form would go if I actually had options.</p>';
            echo '</div>';
        }
    );
    
    //...

}

```

