---
layout: post
title: Symfony配置 
date: 2015-04-10 09:27:08
tags:
- Symfony

categories:
- 风语
- PHP
- Symfony
---

## 运行环境

如前所述，Symfony自带三种运行环境，prod、dev、和test。
AppKernel会根据当前运行环境自动加载位于app/config/下的对应的配置文件,如

* config_dev.yml
* config_prod.yml
* config_test.yml

这些配置文件的加载规则都非常简单，仅仅只是通过拼凑出`config_<environment>.yml`这样的配置文件名来实现的：

```PHP
   # app/AppKernel.php 

    public function registerContainerConfiguration(LoaderInterface $loader) {
        $loader->load($this->getRootDir().'/config/config_'.$this->getEnvironment().'.yml');
    }

```

## 配置文件的格式

Symfony支持各类配置格式,默认采用YAML。在YAML中，采用如下约定：

1. imports: 类似于PHP的include，确保要导入的配置文件被优先加载。
2. 顶级entry: 为特定的bundle定义配置。 

借助于`imports`可以导入基准的config.yml文件，然后对部分需要修改的部分entry进行覆写操作。

比如：`config_dev.yaml`结构为：

```YAML
imports:
    - { resource: config.yml }

framework:
    router:
        resource: "%kernel.root_dir%/config/routing_dev.yml"
        strict_requirements: true
    profiler: { only_exceptions: false }

web_profiler:
    # ...

monolog:
    # ...

assetic:
    # ...

#swiftmailer:
#    delivery_address: me@example.com
```

事实上，Symfony的配置文件都采用了类似的结构。通过这样的导入-覆写操作，可以保持代码独立、避免重复代码（DRY原则）。

在命令行下可以用 
```Bash
app/console config:dump-reference BundleName
```
导出某一个Bundle默认的配置。





