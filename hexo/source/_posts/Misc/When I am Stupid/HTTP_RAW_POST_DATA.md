---
title: 开发微信接口时遇到的HTTP_RAW_POST_DATA
date: 2015-09-24 01:55:38
tags:
- 微信
- Symfony

categories:
- Misc
---


在微信开发中，需要对POST过来的`HTTP_RAW_POST_DATA`进行解密，
为了避免重复造轮子，我使用了Symfony/HttpFoundataion组件中的Request类,然后不动脑子的写出了类似这样的代码：

```PHP

//...
$httpRawPostData=$event->getRequest()
    ->request
    ->get('HTTP_RAW_POST_DATA','');

//对$httpRawPostData解密并查找相应的路由
//...

```

试了好几遍，都是以找不到相应路由的异常结束。

然后我才意识到，我真是个蠢货。

微信服务器发送到我的服务器上的`HTTP_RAW_POST_DATA`本身就是最原始的数据，上面的写法实际上需要微信服务器POST这样的请求：

```
HTTP_RAW_POST_DATA={加密后的数据}
```


所以正确的代码应该是：

```PHP
//...
$httpRawPostData=$event->getRequest()
    ->getContent();
//对$httpRawPostData进行解密
//...
```

What a stupid mistake.


