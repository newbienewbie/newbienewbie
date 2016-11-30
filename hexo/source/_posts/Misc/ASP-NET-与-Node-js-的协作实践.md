---
title: ASP.NET 与  Node.js 的协作实践
date: 2016-11-29 16:57:47
tags:
- Node.js
- ASP.NET
- Nginx
categories:
- Misc
---

## 背景

单位有个老旧的网站系统，是用 `ASP.NET WebForm` 技术编写的，由于大量使用了服务端组件技术，加载一个首页就要接近两秒时间。经过小半年的改造，包括首页在内的绝大部分页面的响应速度都提升了2~8倍。尽管随着BOSS突然调离，其对我的奖励承诺再无兑现可能，我还是不能甩手这个网站系统的维护工作。

听说阿里用`Node.js`全面替换了最好的语言`PHP`，雪球也用`Node.js`替换了`JSP`，并收效甚好。于是我也想用`Node.js`逐渐替换这个老旧的网站。

## 分析 

此网站系统大家每天都需要使用，而且历史包袱众多，如要推倒重来，成本和风险都过大。所以更好的选择是要让`ASP.NET`和`Node.js`技术栈共存。

### 两套技术栈并存

两套技术栈共存的问题容易解决，引入`Nginx`架设反向代理即可：

```
                                                                           
                              +---------------------------------------+    
                              |                                       |    
                          +---------+          +-----------------+    |    
  /------------\          |         |          |                 |    |    
  |            |          |         |  Proxy   | IIS       4000  |    |    
  |            |---------->         |---------->                 |    |    
  |            |          |  Nginx  |          +-----------------+    |    
  |  Browser   |   HTTP   |         |                                 |    
  |            |          |   80    |          +-----------------+    |    
  |            <----------|         |          |                 |    |    
  |            |          |         |  Proxy   | Node.js   5000  |    |    
  \------------/          |         ----------->                 |    |    
                          +---------+          +-----------------+    |    
                              |                                       |    
                              |                                       |    
                              +---------------------------------------+    
                                                                           
```

### 共享认证和授权

`Nginx`解决了两套技术共存问题，但是如何让`ASP.NET`和`Node.js`共享登陆状态、权限管理策略？
由于历史原因，`ASP.NET`原来只支持`用户名-密码`登陆模式模式。后来经过我2016年5月份的改造，网站也同时支持`中石化AD域`登陆模式。如何让`Node.js`也支持这两套认证和授权机制？

比较好的思路有：
1. 搭建一个认证授权中心，`Node.JS`和`ASP.NET`以类似于`OAuth2.0`的机制，从认证授权中心获取用户登陆状态和角色权限信息。
2. 利用已有的成果：将`ASP.NET`上已有的认证授权机制以服务的方式暴露给`Node.js`。
3. 利用已有的代码：使用 `Edge.js`之类的技术调用`C#`代码。

第三种思路似乎并不具备可伸缩性，只能在同一个机器上部署，排除之。前两种思路各有利弊，但考虑到新建一个内部认证授权中心（支持中石化AD域统一身份查询），需要申请权限、层层审批，于是决定采用方案2。

## 实践


### Nginx 架设反向代理集成 ASP.NET 和 Node.js

要让网站系统集成`ASP.NET` 和 `Node.js`两个子系统，首先是利用`Nginx`架设反向代理。

假设`ASP.NET`、`Node.js`子系统和`Nginx`均部署在 `IP` 为 `10.16.160.14` 的服务器上，使用的端口分别为`4000`、`5000`和`80`。防火墙只对`Nginx`使用的`80`端口流量放行。Nginx负责根据`location`将流量转发到后端的`IIS`服务器或者`Node.JS`服务器上。

由于 `ASP.NET` 网站系统的代码老旧、历史久远，目前已有重定向使用的方式有如下几种：

使用`meta`重定向：

```CSharp
// 历史代码一：使用 绝对`URL` 重定向
String uri = Request.ServerVariables["HTTP_HOST"];
Response.Write("<meta http-equiv='refresh' content='0.1;url=http://"+uri+"' />");

// 历史代码二：使用 `path` 重定向
Response.Write("<meta http-equiv='refresh' content='0.1;url=/' />");
```

使用HTTP协议重定向：
```CSharp
// 历史代码三
Response.Redirect('/');
```

由于以上历史代码大量共存，加上遗留代码完全没有单元测试，短期仓促修改容易引入新的bug，所以在尽量不修改源码的前提下，就需要对`Nginx`反向代理的`proxy_set_header`、`proxy_redirect`字段进行配置，否则会重定向到错误主机。


`Nginx`配置如下：
```
http {

    # ...其他配置省略

    upstream aspnet_upstream{
        server 10.16.160.14:4000;
    }
    upstream nodejs_upstream{
        server 10.16.160.14:5000;
    }

    server {
        listen       80;

        location / {
            proxy_pass http://aspnet_upstream;
            proxy_set_header Host $host;
            proxy_redirect http://10.16.160.14:4000/ /;
        }

        location /node {
            proxy_pass http://nodejs_upstream;
        }

        # ...其他配置省略
    }
}
```
### 认证授权共享

解决了两套技术栈共存问题，另一个迫切需要解决的问题是如何实现`认证`和`授权`机制的共享。

假设有这样一个业务场景：
1. 用户已经通过`ASP.NET`编写的登陆界面完成登陆操作。
2. 用户向由`Node.js`子系统下编写的某个页面发送请求，此页面要求用户登陆、或者具备某种权限角色。

问题是`Node.js`子系统如何根据已登陆的`ASP.NET`子系统的 `SessionID` (`cookie`) 来判断用户登陆状态和权限信息？

一个简单的认证流程过程为:

1. `Node.js`子系统收到用户的浏览器请求，然后读取`ASP.NET`子系统的的`SessionID`
2. 利用`SessionID`和事先配置好的凭据（如APPID和密钥），向`ASP.NET`子系统暴露的服务接口发送请求
3. `ASP.NET`子系统对收到的请求进行凭据验证，如果成功，则返回与`SessionID`对应的用户信息。
4. `Node.js`子系统根据返回的用户信息，决定是否拦截来自浏览器的请求。

#### `ASP.NET`提供用户信息服务

`ASP.NET`暴露服务，根据当前用户的角色：

代码为：

```CSharp
// SnpUserService.ashx

public class SnpUserService : IHttpHandler, System.Web.SessionState.IRequiresSessionState {

    public void ProcessRequest (HttpContext context) {

        // ... 省略对 Node.js 子系统的凭据验证

        User user=(User)context.Session["User"];
        String json = JsonConvert.SerializeObject(user);
        context.Response.ContentType = "application/json";
        context.Response.Write(json);
    }

    public bool IsReusable {
        get { return false; }
    }

}
```

#### Node.js 消费服务

`Node.js`以异步的方式对`ASP.NET`暴露的服务进行调用。`登陆检查器`代码为：

```JavaScript
const loginChecker=function(req){
    if(req.session.username){return true;}

    const url=`http://10.16.160.14/SnpUserService.ashx`;
    const aspnetSessionId=req.cookies['ASP.NET_SessionId'];

    return fetch(url,{
        method:"post",
        headers:{ "Cookie":`ASP.NET_SessionId=${aspnetSessionId}` },
        body:JSON.stringify({/*凭据*/}),
    }).then(resp=>resp.json())
    .then(user=>{
        // ...省略校验 user
        return user;
    }).catch(err=>{
        console.log(err);
        return false;
    });
};
```
有了`登陆检查器`，就可以方便得进行请求拦截，当然，为了提高效率，避免大量重复请求，还可以设置缓存，避免网络IO。

### 登陆拦截器

直接使用`登陆检查器`进行登陆验证、拦截请求并不方便。借助于笔者编写的`express-security`包，可以进一步将`登陆检查器`包装为一个异步拦截器。`express-security`是一个通用的`npm`包，可以接受同步或者异步的`登陆检查器`、`角色访问器`，生成`express` 中间件，从而实现对请求进行拦截，相应地址为：

* `npm` 主页：https://www.npmjs.com/package/express-security
* `GitHub` 源码地址：https://github.com/newbienewbie/express-security

利用`express-security`实现一个`异步登陆拦截器`的参考代码为：
```JavaScript
const security=require('express-security');
const fetch=require('node-fetch');

// loginChecker= ... 

const checker=new security.AuthorizationChecker(
    loginChecker
);

module.exports=checker;
```

然后即可以中间件的方式进行请求拦截：
```JavaScript
const express=require('express');
const checker=require('../service/auth/checker');

const router=express.Router();

router.use('/secret',cookieParser(),checker.requireLogin("/SnpLogin.aspx"),(req,res)=>{
    res.send(`您已经登陆，所以可以访问这里`);
});

module.exports=router;
```
这样，当用户访问此路径，如果是未登录`ASP.NET`状态，则会被拦截并重定向至 "/SnpLogin.aspx" ；否则会正常显示相应的业务内容。

### 角色拦截器

同理，实现一个异步的`角色访问器`，然后包装为异步的`角色拦截器`，以中间件的形式进行调用，即可实现授权拦截。由于原理一致，此处不再赘述。

## 总结

通过`Nginx`架设反向代理，可以在保留现有技术资产的前提下，引入`Node.js`做新功能的快速原型开发，以实现各语言、各软件系统之间充分互动。
