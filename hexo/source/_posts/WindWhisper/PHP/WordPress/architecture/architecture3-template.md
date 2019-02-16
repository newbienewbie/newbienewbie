---
title: WordPress 前台基础架构分析之三：模板
date: 2015-04-10 09:27:08
tags:
- WordPress

categories:
- 风语
- PHP
- WordPress
---


## 加载模板

WP的模板加载是通过wp-includes/template-load.php文件来完成的：

```PHP
<?
//wp-includes/template-loader.php
//...

if ( defined('WP_USE_THEMES') && WP_USE_THEMES ) :
	$template = false;
	if     ( is_404()            && $template = get_404_template()            ) :
	elseif ( is_search()         && $template = get_search_template()         ) :
	elseif ( is_front_page()     && $template = get_front_page_template()     ) :
	elseif ( is_home()           && $template = get_home_template()           ) :
	elseif ( is_post_type_archive() && $template = get_post_type_archive_template() ) :
	elseif ( is_tax()            && $template = get_taxonomy_template()       ) :
	elseif ( is_attachment()     && $template = get_attachment_template()     ) :
		remove_filter('the_content', 'prepend_attachment');
	elseif ( is_single()         && $template = get_single_template()         ) :
	elseif ( is_page()           && $template = get_page_template()           ) :
	elseif ( is_category()       && $template = get_category_template()       ) :
	elseif ( is_tag()            && $template = get_tag_template()            ) :
	elseif ( is_author()         && $template = get_author_template()         ) :
	elseif ( is_date()           && $template = get_date_template()           ) :
	elseif ( is_archive()        && $template = get_archive_template()        ) :
	elseif ( is_comments_popup() && $template = get_comments_popup_template() ) :
	elseif ( is_paged()          && $template = get_paged_template()          ) :
	else :
		$template = get_index_template();
	endif;
	/**
	 * Filter the path of the current template before including it.
	 *
	 * @since 3.0.0
	 *
	 * @param string $template The path of the template to include.
	 */
	if ( $template = apply_filters( 'template_include', $template ) )
		include( $template );
	return;
endif;

```
显然，WordPress是根据请求标志`is_xxx()`(由`WP_Query`全局类对象设置)来判定要加载哪个模板的。

这里出现的`get_xxx_template()`函数都在`wp-includes/template.php`中定义,内部是通过调用`get_query_template()`实现的。例如,
获取`index.php`:

```PHP
function get_index_template() {
	return get_query_template('index');
}
```
和获取`404.php`
```PHP
function get_404_template() {
	return get_query_template('404');
}
```

`get_query_template()`非常简单,核心功能就是

1. 利用`locate_template()`找出优先级别最高的模板的位置：
2. 部署钩子

当模板等级中最优先的模板被找到后，WordPress会对其进行加载并生成响应。


一个来自于WordPress官方的例子：

 如果你的博客位于`http://example.com/blog/` ，有一个访问者点击了这样一个分类页` http://example.com/blog/category/your-cat/`， WordPress会在当前模板主题目录中以这样的过程搜寻模板:

1. 先试图搜寻文件名匹配category’s slug的模板文件. 例如当category slug是“unicorns”的时候，那么WordPress会搜寻名为`category-unicorns.php`的文件
2. 如果`category-unicorns.php`找不见，并且category id是4, WordPress会继续搜寻名为`category-4.php`的文件
3. 如果`category-4.php`仍然找不见, WordPress则会搜寻通用的category template`category.php`
4. 如果`category.php`也不存在, WordPress会搜寻通用的archive template, `archive.php`
5. 如果`archive.php`仍然找不到, WordPress则会退回去搜寻主题主页`index.php`

### 模板类型

WordPress常见的模板类型及代表性的模板包括：

* Archive Page                   #archive.php
    * Author Archive             #author.php
    * Category Archive           #category.php
    * Tag Archive                #tag.php
    * Custom Taxonomy Archive    #taxonomy.php
    * Date Archive               #date.php
    * Custom Post Type Archive   #archive-$posttype.php 
* Singular Page                  #singular.php
    * Single Post                #single.php
        * Attachment Page        #attachment.php
        * Blog Post              #single-post.php
        * Custom Post            #single-{$posttype}.php
    * Static Page                #page.php
* Site Front Page                #front-page.php
* Blog Posts Index Page          #home.php
* Comments Popup Page            #comments-popup.php
* Error 404 Page                 #404.php
* Search Result Page             #search.php

特别的，对于某种Post Type(包括post类型)，其归档页模板的寻找路线是：

1. archive-{$posttype}.php
2. archive.php
3. index.php

其单页面模板的寻找路线是：

1. single-{$posttype}.php
2. single.php
3. singular.php
4. index.php

在WordPress中，任意一个最终没有找到对应的模板文件的请求都会被`index.php`模板处理。

### Template Hierarchy与钩子

#### 模板重定向

在文件`wp-includes/template-loader.php`的开头，WordPress布置了一个重定向action钩子：

```PHP
// wp-includes/template-loader.php

if ( defined('WP_USE_THEMES') && WP_USE_THEMES ) 
    do_action( 'template_redirect' );
//...

// 查找要加载哪个模板
// ...

```

这个钩子给了我们彻底抛弃使用WordPress默认模板等级的权利，只需要添加钩子使用自己的模板选择逻辑，然后exit就行。

#### 模板等级中的钩子

WordPress模板系统能让你对默认的Template Hierarchy进行filter,这意味着我们能在等级中的某一个点进行插入和改变一些东西。

相关的filter钩子布置于函数`get_query_template()`中，filter钩子名的形式为`{$type}_template`:

```PHP
/**
 * Retrieve path to a template
 *
 * @param string $type Filename without extension.
 * @param array $templates An optional list of template candidates
 * @return string Full path to template file.
 */
function get_query_template( $type, $templates = array() ) {
	$type = preg_replace( '|[^a-z0-9-]+|', '', $type );

	if ( empty( $templates ) )
		$templates = array("{$type}.php");

	$template = locate_template( $templates );
	/**
	 * Filter the path of the queried template by type.
	 *
	 * The dynamic portion of the hook name, `$type`, refers to the filename
	 * -- minus the extension -- of the file to load. This hook also applies
	 * to various types of files loaded as part of the Template Hierarchy.
	 *
	 * @since 1.5.0
	 *
	 * @param string $template Path to the template. See {@see locate_template()}.
	 */
	return apply_filters( "{$type}_template", $template );
}
```
WordPress在按照默认的模板等级查找到相关模板后，又触发了与该模板类型相关的钩子事件，这就给了我们一个改变默认模板优先级的机会。

完整的filter清单如下：

* `index_template`
* `404_template`
* `archive_template`
* `author_template`
* `category_template`
* `tag_template`
* `taxonomy_template`
* `date_template`
* `home_template`
* `front_page_template`
* `page_template`
* `paged_template`
* `search_template`
* `single_template`
* `text_template`,`plain_template`,`text_plain_template`,
* `attach_template`
* `comments_template`

当需要对默认的Template Hierarchy进行修改的时候，就可以使用这些过滤器。
比如，想对默认的评论模板进行替换，就可以将自己的模板函数查找器添加filter钩子`comments_template`。
又比如，相对默认的某种PostType类型的单页模板进行修改，就可以将自己的模板函数查找器添加倒filter钩子`single_template`。

来自WordPress官方例子如下：

对于默认的Author Hierarchy：

1. `author-{nicename}.php`
2. `author-{id}.php`
3. `author.php`

为了在`author.php`之前增加一个被优先使用的模板`author-{role}.php`

```PHP
function author_role_template( $templates='' ) {
 
    $author = get_queried_object();
    $role=$author->roles[0];
 
    if(!is_array($templates) && !empty($templates)) {
        $templates=locate_template(array("author-$role.php",$templates),false);
    }elseif(empty($templates)) {
        $templates=locate_template("author-$role.php",false);
    }else {
        $new_template=locate_template(array("author-$role.php"));
        if(!empty($new_template)) array_unshift($templates,$new_template);
    }
    return $templates;
}
 
add_filter( 'author_template', 'author_role_template' );
```

#### 模板加载前的filter钩子

最后，在模板找到之后和加载之前的时刻，WordPress还布置了一个名为`template_include`的钩子：

```PHP
// wp-includes/template-loader.php

if ( $template = apply_filters( 'template_include', $template ) )
    include( $template );
return;
```

此filter钩子可以帮助我们加载最终合适的模板。对于Custom Post Type的各类模板加载非常有用。

例如，著名插件Woocommerce中，为了保证插件对所有模板适用，把相关的自定义模板都放到了自己插件的子目录下，同时添加钩子函数引入自己的模板加载器：

```PHP

class WC_Template_Loader {

    //...

    public static function init() {
        add_filter( 'template_include', array( __CLASS__, 'template_loader' ) );
        add_filter( 'comments_template', array( __CLASS__, 'comments_template_loader' ) );
    }


	public static function template_loader( $template ) {
        //...
		return $template;
	}



	public static function comments_template_loader( $template ) {
        //...
		return $template;
	}

    //...

}

```

这是一种十分健壮的做法。


## 总结

WordPress的前台博客功能其实思路非常简单，即

1. 加载必要文件
2. 执行查询并设置全局变量
3. 加载相关模板

加载相关模板特别需要理解的是$post-type的归档页和单页的模板加载优先级。




