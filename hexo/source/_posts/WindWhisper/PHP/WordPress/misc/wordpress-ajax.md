---
title: WordPress Ajax机理分析
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


## 后台Ajax源码分析

WordPress Ajax功能的后台相关核心文件为`wp-admin/admin-ajax.php`。

文件`wp-admin/admin-ajax.php`首先会加载一些基础文件：

* `wp-load.php`文件、
* `wp-admin/includes/admin.php`文件
* `wp-admin/includes/ajax-actions.php`文件

其次`wp-admin/admin-ajax.php`进入钩子注册阶段：

* 预定义一系列核心`actions`名称用于Ajax操作，如`fetch-list`,`delete-post`,`add-meta`,`dashboard-widgets`,etc.如果客户端传递来的`action`参数（get或者post传递）在预定义的actions之中，则将客户端传来的`action`参数中的`-`转换为`_`后，冠以`wp_ajax_`前缀添加到action钩子中。
* 预定义并注册心跳包钩子`wp_ajax_nopriv_heartbeat`
* 除了这些内置的`action`之外，还可以自定义其他`action`。当然，自定义的`action`钩子通常在其他地方注册过了(此处不应再次注册)。

核心代码为:

```PHP
// wp-admin/admin-ajax.php 文件
###@:注册核心ajax钩子
if ( ! empty( $_GET['action'] ) && in_array( $_GET['action'], $core_actions_get ) )
    add_action( 'wp_ajax_' . $_GET['action'], 'wp_ajax_' . str_replace( '-', '_', $_GET['action'] ), 1 );

if ( ! empty( $_POST['action'] ) && in_array( $_POST['action'], $core_actions_post ) )
    add_action( 'wp_ajax_' . $_POST['action'], 'wp_ajax_' . str_replace( '-', '_', $_POST['action'] ), 1 );

### 注册心跳包
add_action( 'wp_ajax_nopriv_heartbeat', 'wp_ajax_nopriv_heartbeat', 1 );

```

最后进入触发钩子阶段，如果当前用户处于未登陆状态，触发钩子`wp_ajax_nopriv_`,反之，则触发`wp_ajax_`钩子。

```PHP

// wp-admin/admin-ajax.php 文件

###@:调用钩子
if ( is_user_logged_in() ) {
    do_action( 'wp_ajax_' . $_REQUEST['action'] );
} else {
    do_action( 'wp_ajax_nopriv_' . $_REQUEST['action'] );
}
die('0');

```

## 注册自定义的Ajax钩子

从以上的`wp-admin/admin-ajax.php`源码分析可以得知,WordPress的Ajax响应动作是通过钩子实现的，显然用于Ajax响应的callable对象必须提前册成钩子才能被触发。对于内置的核心Ajax动作或者心跳包，WordPress已经替我们写好了相关代码，但是对于自定义的Ajax响应，还需我们自己注册钩子。引自[wordPress.org](http://codex.wordpress.org/AJAX_in_Plugins)的一个例子:

```PHP

add_action( 'wp_ajax_my_action', 'my_action_callback' );
function my_action_callback() {
    global $wpdb; // this is how you get access to the database
    $whatever = intval( $_POST['whatever'] );
    $whatever += 10;
    echo $whatever;
    wp_die(); // this is required to terminate immediately and return a proper response
}

```


## 前台调用接口

注册好钩子之后，即可在前端对`wp-admin/admin-ajax.php`发起Ajax请求了。引自[wordPress.org](http://codex.wordpress.org/AJAX_in_Plugins)的一个例子:

```JavaScript

jQuery(document).ready(function($) {
    var data = {
        'action': 'my_action',
        'whatever': ajax_object.we_value      // We pass php values differently!
    };
    // We can also pass the url value separately from ajaxurl for front end AJAX implementations
    jQuery.post(ajax_object.ajax_url, data, function(response) {
        alert('Got this from the server: ' + response);
    });
});

```



