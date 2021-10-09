---
layout: post
title: PHPCMS分析7-用Laravel的Database层代替PHPCMS的model层
date: 2015-04-14 12:16:08
tags:
- PHPCMS
- 源码分析

categories:
- 风语
- PHP
- PHPCMS
---

## Laravel框架的Database层安装

尽管PHPCMS号称现代CMS，但是它的模型层用起来总觉得少了些现代气息——我说的是和Laravel比起来。

不过由于PHPCMS采用了典型的MVC分层架构，我们完全可以替换掉它本身的Model层；另一方面，Laravel框架的Database也是独立的组件（在github的仓库为Illuminate/Database）,我们完全可以采用composer安装后取代PHPCMS原来的Model层。

目前只支持PHP>=5.4

## 使用

首先在一个可以自动运行的位置——比如在libs/fucntions/extention.func.php中，引入以下代码。

```PHP
use Illuminate\Database\Capsule\Manager as Capsule;
require(PC_PATH."Illuminate/Database/vendor/autoload.php");
$dbconfig=pc_base::load_config('database','default');
$capsule = new Capsule;
$capsule->addConnection([
    'driver'    => 'mysql',
    'host'      => $dbconfig['hostname'],
    'database'  => $dbconfig['database'],    //dbname
    'charset'   => $dbconfig['charset'],
    'username'  => $dbconfig['username'],          
    'password'  => $dbconfig['password'],
]);
$capsule->setAsGlobal();
```

然后在模型层中即可以方便的使用了

```PHP
use Illuminate\Database\Capsule\Manager as Capsule;

$po=Capsule::table('product_order')->
    join('products',"product_order.product_id","=","products.id")->
    leftJoin('member',"product_order.userid","=","member.userid")->
    where(array('product_order.state'=>$state))->
    skip($offset)->take($perPage) ->
    select("member.username as user",
        "product_order.id as id",
        "products.name as product",
        "product_order.price as price",
        "product_order.state as state"
    )->
    get();

Capsule::table('product_order')->where(array('id'=>$id))->increment('state',1);
Capsule::table('product_order')->where(array('id'=>$id))->decrement('state',1);

```


