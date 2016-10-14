---
title: Pimple
date: 2015-09-19 01:41:08
tags:
- 依赖注入
- IoC

categories:
- 风语
- PHP
- Misc
---

## Why Pimple

最近在倒腾WordPress，在github选择了一个四百多关注的微信框架项目，结果发现bug不断，好不容易通读源码后改好了BUG又发现扩展性太差，
而且各类之间代码耦合严重，于是打算动手写一个自己的微框架(重复造轮子)，想实现这样的目标：

1. 独立于任何框架、整站程序
2. 不要依赖于外部PHP扩展，可以运行在低端空间之上。
3. 良好的组织性
4. 良好的可扩展性

不可避免的遇到了依赖注入问题，起初想直接用Symfony/DependencyInjection组件，但是写着写着就发现这个组件太啰嗦了。
于是决定学习以下著名的Pimpler容器。

不得不说这玩意儿实在是小巧精致！

## Pimple用法

下面翻译自官方文档：

创建一个容器：

```PHP
use Pimple\Container;

$container = new Container();
```

和众多其他的DI容器一样，Pimple主要管理两类数据：`服务`和`参数`。

###  定义Services

服务是通过可以返回一个实例对象的匿名函数来定义的：

```PHP
// define some services
$container['session_storage'] = function ($c) {
    return new SessionStorage('SESSION_ID');
};

$container['session'] = function ($c) {
    return new Session($c['session_storage']);
};
```

注意此匿名函数可以访问当前容器对象实例,允许对其他`服务`或者`参赛`进行引用。
对象只有当你需要获取它们的时候才被创建，定义的顺序是无关紧要的。

使用已定义的服务同样非常简单：

```PHP
// get the session object
$session = $container['session'];

// the above call is roughly equivalent to the following code:
// $storage = new SessionStorage('SESSION_ID');
// $session = new Session($storage);
```

### 定义工厂服务

默认情况下，你每一次获取`服务`,Pimple返回它的同一个实例。如果你想要它每次返回不同的实例,用`factory()`方法包装你的匿名函数即可：

```PHP
$container['session'] = $container->factory(function ($c) {
    return new Session($c['session_storage']);
});
```

这样，每一次调用 `$container['session']`都会返回一个新的session实例。

### 定义参数

定义一个`参数`，可以轻松从外部配置我们的容器，还可以存储全局变量。

```PHP
// define some parameters
$container['cookie_name'] = 'SESSION_ID';
$container['session_storage_class'] = 'SessionStorage';
```

如果你像下面这样改变`session_storage`服务的定义 :

```PHP
$container['session_storage'] = function ($c) {
    return new $c['session_storage_class']($c['cookie_name']);
};
```

就可以通过覆写`session_storage`的参数(而不是重新定义服务)轻松改变cookie name。

### Protecting Parameters

由于Pimple把匿名函数视作服务定义，你需要用`protect()`包装你的匿名函数以把他们存储为`parameters`:：

```PHP
$container['random_func'] = $container->protect(function () {
    return rand();
});
```

### 修改Services

有一些情况下，你也许想在一个服务定义完成之后再进行修改。这可以用`extend`实现。

```
$container['session_storage'] = function ($c) {
    return new $c['session_storage_class']($c['cookie_name']);
};

$container->extend('session_storage', function ($storage, $c) {
    $storage->...();

    return $storage;
});
```

The first argument is the name of the service to extend, the second a function that gets access to the object instance and the container.

### Extending a Container¶

If you use the same libraries over and over, you might want to reuse some services from one project to the next one; 
package your services into a provider by implementing Pimple\ServiceProviderInterface:

```PHP
use Pimple\Container;

class FooProvider implements Pimple\ServiceProviderInterface
{
    public function register(Container $pimple)
    {
        // register some services and parameters
        // on $pimple
    }
}
```

Then, register the provider on a Container:


```PHP
$pimple->register(new FooProvider());
```

### 获取服务创建函数

When you access an object, Pimple automatically calls the anonymous function that you defined, 
which creates the service object for you. 
If you want to get raw access to this function, you can use the raw() method:

```PHP

$container['session'] = function ($c) {
    return new Session($c['session_storage']);
};

$sessionFunction = $container->raw('session');
```



## Pimple的核心原理

其实就是类数组操作而已。


