---
layout: post
title: Symfony架构分析
date: 2015-04-10 09:27:08
tags:
- Symfony

categories:
- 风语
- PHP
- Symfony
---


接触到的第一个PHP 框架就是CodeIgniter。轻巧，入门简单,概念清晰。

然而我快发现，我很难复用CodeIgniter的代码--代码耦合度太高了，所以我开始试着写了一个自己的MVC框架 [Bamboo](https://github.com/newbienewbie/Bamboo)。我想包装自己的类和模块，这样我就可以搭积木一样搭建各种网站了。当然，我只写了个基本框架，下面的重头戏是把所有的模块都自己实现。比如，Logger，Security，Upload，etc.我开始意识到这是个浩大的工程，然后计划搁浅了。

直到有一天,我在Laravel里看到了它使用了Symfony组件的时候，我才发现，原来我在视图造一个很大的轮子。Symfony是可复用的,是组件化的。

## Request-Response模型

从本质上来说，HTTP协议实际上描述了一个Request-Response模型。与之相关的PHP代码实际上都在做着`解释请求、生成响应`的工作，Symfony则更进一步的将Request和Response对象化了。

Request-Response模型是整个Symfony的基础模型，可以毫不夸张的说，整个Symfony都构筑在这个基础模型之上(参见Front Controller部分)。

### Request对象

Request类很简单，封装了原生PHP的各大超全局输入变量:
```PHP
use Symfony\Component\HttpFoundation\Request


$request = Request::createFromGlobals();

$request->getPathInfo();    //the URI being requested (e.g. /about) minus any query parameters
$request->query->get('foo');    //$_GET 
$request->request->get('bar', 'default value if bar does not exist');    /$_POST
$request->server->get('HTTP_HOST');    //$_SERVER
$request->files->get('foo');     //retrieves an instance of UploadedFile identified by foo
$request->cookies->get('PHPSESSID');   //$_COOKIE 
$request->headers->get('host');
$request->headers->get('content_type');
$request->getMethod();    //GET, POST, PUT, DELETE, HEAD
$request->getLanguages(); // an array of languages the client accepts
```


### Response对象
Response类也非常简单，用来代替原生PHP的echo(),header():
```PHP
Symfony\Component\HttpFoundation\Response

$response = new Response();

$response->setContent('<html><body><h1>Hello world!</h1></body></html>');
$response->setStatusCode(Response::HTTP_OK);
$response->headers->set('Content-Type', 'text/html');
// prints the HTTP headers followed by the content

$response->send();
```

## Front Controller

![Symfony分层架构图](#)

说来惭愧，第一次看到Front Controller的概念还是在PHPWind的9.x的源代码里看到的，当时还天真的以为它是PHPWind9.x的开发人员想出来的名词。后来看Symfony也有这个概念，这才发现原来自己是多么的孤陋寡闻。当然，我们一直都在使用这个东西，只是不知道那就叫FrontController.

一般情况下，代码会以各个独立的模块分层存在。为了根据请求的不同调用合适的功能代码，一些如CodeIgniter的框架(包括我自己写的Bamboo)都有一个统一入口文件(index.php)负责这项工作。
在Symfony等一些框架(其他如PHPWind9.x以后的版本)中，单独抽象出了Front Controller的概念。和CodeIgniter中的index.php一样，Front Controller是一个统一入口，一切发到我们Application的请求都会由其处理，然后根据接收到的Request不同，按照配置的Route规则加载对应的Controller的Action。
处理请求之后，生成响应对象并send()到客户端。

根据环境的不同，Symfony自带有两个Front Controller：

* `web/app.php`    #生产环境
* `web/app_dev.php`  #开发环境

之所以没有测试环境对应的前端控制器，是因为测试环境可以通常只在单元测试时使用。

当然console工具也提供了能在任意环境下运行的Front Controller。

Symfony中的Front Controller非常简单，遵循的逻辑可以概括为"`处理请求，发送响应`",这也是整个Symfony框架对Request-Response模型的实现：

```PHP
// web/app.php

require_once __DIR__.'/../app/bootstrap.php';
require_once __DIR__.'/../app/AppKernel.php';
use Symfony\Component\HttpFoundation\Request;

//初始化一个prod环境、非debug模式运行的AppKernel
$kernel = new AppKernel('prod', false);

$kernel->handle(Request::createFromGlobals())    //处理请求
        ->send();    //发送响应
```

至此，针对Request-Response模型的处理流程已经总体规划完毕了。

对于一个Symfony项目`myproj`,为了方便起见，假设整个文件夹都位于`/var/www/`下,当我们在浏览器中访问：

`localhost/myproj/web/some_route`     

实际上是在调用Front Controller来执行与some_route对应的代码。事实上，上面这个URL在默认情况下等效于：

`localhost/myproj/web/app.php/some_route`

当然，在开发模式下，可以访问：

`localhost/myproj/web/app_dev.php/some_route`

激活debug工具并能自动重建缓存。

正是由于Front Controller已经实现了Request-Response这样的基本流程，在Symfony中为一个基本组件（Bundle）添加页面只需要要遵循两步：

1. 创建Controller    #定义如何根据Response生成Response对象
2. 配置Route    #配置URL和Controller的映射关系

当然，为了避免组织混乱、保持结构清晰，实际中，Route、Controller等等都是以Bundle来设计的。

## Bundle

Bundle从PHP的角度而言，可以视作一个命名空间。一旦一个PHP命名空间添加了Bundle Class，就成为Bundle。这个Bundle Class的命名必须遵循以下规则：

* 只使用字母和下划线
* 使用CamelCased命名风格
* 使用descriptive和short的名字
* 以vender名为prefix
* 以"Bundle"为suffix

Bundle Class的getClass()方法返回这个类名。

Bundle是Symfony的基本组件。Bundle存放了与某个特性相关的一切文件(比如PHP类、配置、甚至是css文件和JavaScript文件)的目录。
事实上，Symfony的Bundle和PHPCMS里的module作用相当，类似于模块、插件。但是相较于PHPCMS之类其他的框架，Symfony的Bundle具有更好的抽象和实现。

一个Bundle，通常位于src/VenderOfBundle/BundleName之下,其中的目录结构多为：

```
Vender/
    YourBundle/
        VenderYourBundle.php
        Controller/               #控制器
            Spec1Controller.php
            Spec2Controller.php
        DependencyInjection/      #DI
        Resources/
            config/
            views/
        Tests/                    #测试
```

想要添加一个Bundle，应该先创建以上目录，然后修改app/Kernel.php文件，为registerBundles()方法添加一个该Bundle的实例：

```PHP
// app/AppKernel.php

public function registerBundles(){

    $bundles=array(
        //...
        new Vender\YourBundle\VenderYourBundle();
    );

    //...

    return $bundles;
}
```
以上两步可以归纳为：

1. 创建Bundle
2. 注册Bundle

当然，添加Bundle的这些步骤可以用一个命令代替：

```bash
    php app/console generate:bundle --namespace=Vender/YourBundle --format=yml
```

## Route

Route是指从Request（如URL路径,HTTP Method)到控制器(具体到Action)的映射。所以， 一条路由规则有两个要素组成：

1. URL Path
2. 与URL Path匹配的Controller

我们还可以为这条路由规则起一个独一无二的名字，这样我们就能用于生成URL了。

路由层的作用就是把输入进来的URL转换为要执行的Controller。

Symfony会从一个单独的路由配置文件中加载所有的路由规则。这个路由配置文件通常是

`app/config/routing.yml`

,当然，Symfony支持高度定制，我们可以把默认的路由文件配置成其他任意其他文件(包括XML和PHP文件)。如：

```YAML
# app/config/config.yml
framework
    # ....
    router: { resource: "%kernel.root_dir%/config/routing.yml"}
```



当然，从URL到控制器动作，参数匹配是必不可少的。Symfony的路由系统支持:

* URL匹配         #通过@Route()设置
    * 必选参赛    #通过占位符来设置
    * 可选参数    #通过占位符和设置defaults来设置
    * 正则匹配    #通过requirements设置
* HTTP Method匹配 #通过@Method()

```PHP
/**
 *@Route("/blog/{page}",defaults={"page": 1},requirements={
 *    "page": "\d+"
 *})
 *@Method("GET")
 */
public function indexAction($page){
    //...
}
```

当然，威力更巨大的是condition属性，支持无限可能的定制。
```YAML
contact:
    path: /contact
    defaults: { _controller: AcmeDemoBundle:Main:contact}
    condition: "context.getMethod() in ['GET','HEAD'] and request.headers.get('User-Agent') matches '/firefox/i' "
```
这个配置会被转换为以下的PHP代码：
```PHP
if(rtrim($pathinfo,"/contact")===''&&
    (
        in_array($context->getMethod(),array(0=>'GET',1=>'HEAD')) &&
        preg_match('/firefox/i',$request->headers->get("User-Agent"))
    )
    
){
    //....
}
```



### 一个Bundle中的Route

要让合适的Controller和Action发生调用，必须建立url与之的映射。

```PHP
#src/Vender/YourBundle/Resources/config/routing.yml

specController:
    path: /specController/{limit}
    defaults: { _controller: VenderYourBundle:specController:yourAction}

```


### app级Route

尽管所有的路由配置规则是从一个单独的文件中读取的，大家在实际中还是会通过`resource`导入其他路由规则。比如，使用Annotation格式的路由配置应设置:

```YAML
app: 
    resource: "@AppBundle/Controller"
    type: annotation  #使用Annotation reader来读取resource变量
```

如果我们手工添加了一个Bundle，我们可以把它自身包含的Route规则导入app level的配置中，即应该在app/config/routing.yml中添加配置：

```YAML
# app/config/routing.yml

vender_yourbundlename
    resource: "@VenderYourBundle/Resources/config/routing.yml"
    prefix: /
    
```
当然，如果是用`php app/console generate:bundle`命令生成的bundle，那么这一步已经由Symfony替我们做好了。


### 双向映射

Route提供了bidirectional System:

1. match($URL)      #返回匹配到的控制器及参数构成的数组
2. generate($RouteName,$paramsArray)       #生成URL


## Controller

我们知道，每一个Route规则都有一个`_controller`对象，我们当然可以用

`完全限定名的ClassName::ActionName`

的形式来引用一个Controller，比如：

`AppBundle\Controller\BlogController::ShowAction `。

但实际上这样的表达是有冗余信息的，最起码还要指出BlogController位于的命名空间Controller是没必要的，所以Symfony还支持对Controller的逻辑命名, 一条指定Controller的Action的逻辑命名通常遵循这样的约定：

`BundleName:ControllerName:ActionName`

通常这样的逻辑名称会被映射为

`path/to/BundleName/Controller/ControllerName.php`文件中的`ActionName`方法

比如：

`AcmeDemoBundle:Random:Index`

这个控制器通常会会映射为：

`Acme\DemoBundle\Controller\RandomController`类中的`indexAction`方法。



另外值得注意的是，Symfony中Controller的Action 与CodeIgniter之类的框架并完全一样:

1. CodeIgniter中的控制器直接输出响应，而Symfony中则是必须返回Response对象;
2. Symfony支持从Route和Request定制Action方法的参数。而且对于Action方法声明，参数顺序并不重要。

```PHP

use Symfony\Component\HttpFoundation\Request;

/**
 * @Route("/hello/{firstName}/{lastName}",name="hello")
 */
public function indexAction($lastName,$firstName,Request $request){

    //$firstName和$lastName等参赛顺序并不重要
    //可以直接使用$request
    $page=$request->query->get("page",1);
}
```

此外，Symfony\Bundle\FrameworkBundle\Controller\Controller提供了一系列helper方法。

* Redirecting
    * generateUrl($route)
    * redirect($absUrl)
    * redirectToRoute($route)   # new RedirectResponse($this->generateUrl($route))
* Rendering Templates
    * render($pathOrLogicalTemplateName,$array)    #render a template and return a Response object 
* Accessing other Services
    * get('templating')
    * get('router')
    * get('mailer')
* Exception
* FlashMessage
    * addFlash()
* Forwarding


## Symfony目录结构

Symfony的基本架构便如上文所述，十分清晰。与架构相对应，Symfony的目录结构也是非常清晰的。默认的结构组织形式为：

    app/    #application config ,cache,
    src/    #project源码
    vender/ #第三方依赖,由composer独占管理权
    web/    #包含了公共访问文件,比如Front Controller和静态文件

`web/`目录类似于网站的根目录，一切的公开访问都是从这里开始的，其下的Front Controller文件如`app.php`和`app_dev.php`是整个网站的入口管理文件。其他一些静态资源也会以一定的结构组织在这个目录下。

`app/`目录是Application级的一些文件存放地。如`app/console`、`app/config`，`app/cache`

`src/`目录是针对网站各个功能的源码存放地，其中文件一般以各个Vender提供的Bundle分别组织。


尽管拥有如此清晰的文件结构，Symfony也支持任意定制目录结构。












