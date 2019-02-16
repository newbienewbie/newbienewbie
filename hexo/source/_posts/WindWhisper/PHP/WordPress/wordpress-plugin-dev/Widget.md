
---
title: WordPress Widget 
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


## Widget

WordPress2.8之后提供了`WP_Widget`类(位于文件`wp-includes/widgets.php`中)，用以简化小部件的管理。

```PHP

class WP_Widget extends WP_Widget{

	public function __construct( $id_base, $name, $widget_options = array(), $control_options = array() ) {

    }

    function form($instance) {
        // widget form in admin dashboard
    }

    function update($new_instance, $old_instance) {
        // save widget options
    }

    function widget($args, $instance) {
        // display the widget
    }
}

```



## Widget的实例化

Widget的注册是通过函数

```PHP
register_widget('MyWidgetClassName');
```

此函数实际只是简单利用调用全局对象`$wp_widget_factory`来进行的;

```PHP
// wp-includes/widgets.php

function register_widget($widget_class) {
	global $wp_widget_factory;

	$wp_widget_factory->register($widget_class);
}
```

`WP_Widget_Factory`类是一个非常简单的类，内部维护了已注册的widegets数组。


```PHP
// wp-includes/widgets.php

class WP_Widget_Factory {

	public $widgets = array();

    //...

    public function register( $widget_class ) {
        $this->widgets[$widget_class] = new $widget_class();
    }

	public function unregister( $widget_class ) {
		unset( $this->widgets[ $widget_class ] );
	}

    //...
}
```


## 钩子

可以通过WordPress的`widget_init`事件布置widget的注册代码。

```PHP
add_action('widget_init',function(){
    register_widget('MyWidgetClassName');
})
```
