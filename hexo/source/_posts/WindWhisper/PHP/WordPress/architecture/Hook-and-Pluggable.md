---
title: WordPress钩子和Pluggable
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


钩子和Pluggable是WordPress插件机制的基础。

## Action和Filter

与Symfony/EventDispather组件、GuzzleHttp 的事件分发机制类似，WordPress提供了一种过程式的钩子实现。当特定事件发生时，WordPress就会根据当前事件对所关联的函数进行调用。

布置钩子的常用函数：

* `do_action`
* `do_action_ref_array`
* `apply_filters`
* `apply_filters_ref_array`

类似这些钩子，可以接受不定数量的参数 ，如：

```PHP
do_action('save_post',$post_id,$post);

do_action( $hook_name, $arg_1, $arg_2, $arg_3,... );
```

因此，在将函数钩到事件时，需要用第四个参数来说明钩取的函数接受的参数数量:

```PHP
add_action ( 'hook_name', 'your_function_name', [priority], [accepted_args_num=1] );
add_filter ( 'hook_name', 'your_function_name', [priority], [accepted_args_num=1] );
```

还可以将事件对应的函数移除：

```PHP
remove_action('action_hook_name','action_function_name');
remove_filter('filter_hook_name','filter_function_name');
```

## Pluggable 函数

除了钩子（actions 和 filters）,另外一个修改WordPress行为的方法是覆盖Pluggable的函数。

在`wp-includes/pluggable.php`文件中，预定义了一小部分函数。此文件会在加载完插件后加载:

```PHP
// wp-settings.php

//...

register_theme_directory( get_theme_root() ); // Register the default theme directory root

// Load active plugins.
foreach ( wp_get_active_and_valid_plugins() as $plugin ) {
	wp_register_plugin_realpath( $plugin );
	include_once( $plugin );
}
unset( $plugin );

// Load pluggable functions.
require( ABSPATH . WPINC . '/pluggable.php' );
require( ABSPATH . WPINC . '/pluggable-deprecated.php' );

//...

```

此`pluggable.php`文件中定义的函数，都采用类似以下的形式，以保证只有当所有的插件都被加载后仍未定义的函数，这部分预定义的函数才会被定义。

```PHP
// wp-includes/pluggable.php

if ( !function_exists('wp_get_current_user') ) :
    function wp_get_current_user() {
        global $current_user;
        get_currentuserinfo();
        return $current_user;
    }
endif;

```
尽管如此，Pluggable functions are no longer being added to WordPress core. All new functions instead use filters on their output to allow for similar overriding of their functionality. 



