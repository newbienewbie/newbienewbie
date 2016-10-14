---
title: Symfony 模板系统
date: 2015-04-10 09:27:08
tags:
- Symfony

categories:
- 风语
- PHP
- Symfony
---


Template的逻辑命名和Controller的类似，模板的逻辑名称遵循这样的约定：

`BundleName:ControllerName:TemplateName`

一般会被映射会这样的物理地址：

1. `app/Resources/{BundleName}/views/ControllerName/TemplateName`
2. `{path/to/BundleName/}Resources/views/ControllerName/TemplateName`

当第1个地址找不到对应的模板时，会继续查找第2个位置的模板。

## Template Services 

Symfony模板系统的核心是模板引擎(服务)，

从控制器渲染模板：
```PHP
return $this->render('article/index.html.twig');
```
与直接使用服务是等价的：
```PHP
use Symfony\Component\HttpFoundation\Response;
$engine=$this->container->get('templating');
$content=$engine->render('article/index.html.twig');
$return $response=new Response($content);
```

Symfony的模板引擎可以在`app/config/config.yml`中配置：

```YAML
framework: 
    #...
    templating: { engines: ['twig']}
```

## Twig模板

Twig模板的语法和Django模板语法非常相似。Twig提供了三种语法：

1. says sth
```Twig
{{ ... }}
```

2. does sth
```Twig
// does sth
{% ... %}
```

3. comment sth
```Twig

{# ... #}
```



### Twig链接：

```HTML
<a href="{{ path(routeName,context) }} " > home </a>
<img src="{{ assets(images/logo.png) }}"/>
<link href="{{ assets(css/blog.css) }}" rel='stylesheet' type='text/css' />
```


### Twig filters:

```PHP
{{ title|upper }}

```

### Twig模板嵌入

为了代码复用，Twig提供了include:
```PHP
{% include() %}
```

### Twig模板继承与重载:

```PHP
{% extends 'baseTemplateName' %}

{% block XX  %}
    {{ parent() }}
    {# overwrite here #}
{% endblock  %}
```

一种常用的模板继承是三层方案。
1. 为整个网站创建基础模板`app/Resources/views/base.html.twig`
2. 为某一类特定功能创建模板`spec/layout.html.twig`(继承自第1层模板)
3. 为每一个单独的页面创建模板 (继承自第2层模板)






### Twig模板嵌入其他控制器

此外，还可以嵌入其他控制器的渲染结果
```PHP
{{ render(Controller("LogicalContrllerName",context)) }}
```
配合hinclude.js，还可以实现异步加载：
```PHP
{{ render_hinclude(controller('...')) }}
{{ render_hinclude(url('...')) }}
```

### Twig Template转义
 
twig系统自带转义，如需原始输出，可以利用raw 过滤函数

```PHP
{{ article|raw  }}
```
PHP模板，可以使用
```PHP
<?php echo $view->escape($name)?>
```
进行转义。


### Twig Macro

[Twig Macro](http://twig.sensiolabs.org/doc/templates.html)是非常强大的HTML代码复用手段，它的功能非常类似于C语言的宏：

```Twig
{% macro input(name, value = "", type = "text", size = 20) %}
    <input type="{{ type }}" name="{{ name }}" value="{{ value|e }}" size="{{ size }}" />
{% endmacro %}
```

Twig Macro可以在其他单独的文件中定义，然后导入到当前的模板文件中：

```Twig
{# 导入整个宏定义文件 #}
{% import "forms.html" as forms %}
{{ forms.input('username') }}

{# 从宏文件中导入某个单独的Macro #}
{% from 'forms.html' import input as input_field %}
{{ input_field('username') }}

```

### Twig Use Statement

Twig的模板继承只支持单继承，Twig还提供了use以帮助我们实现更大程度的代码复用。

use语句告诉Twig去把在某个文件中定义的block块导入到当前模板中。
```Twig
{% use "blocks.html" %}
```

这一功能类似于对于Macro的import语句，但是use只对block块有效，而且，想use的模板必须满足
1. 不extends其他模板。
2. 不定义宏
3. body为空

和针对Macros的import类似，use也支持了导入一部分代码段的功能，同时还提供别名机制来避免命名冲突：

```Twig
{% extends "base.html" %}

{% use "blocks.html" with sidebar as base_sidebar, title as base_title %}

{% block sidebar %}{% endblock %}
{% block title %}{% endblock %}
{% block content %}{% endblock %}
```


## Template的全局变量

不管是Twig模板，还是纯PHP模板，Symfony都为之提供了一个变量`app`

* app.security  #deprecated since 2.6
* app.user        
* app.request
* app.session
* app.environment
* app.debug


