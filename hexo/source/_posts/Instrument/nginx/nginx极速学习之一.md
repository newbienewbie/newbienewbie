---
title: nginx极速学习之一
date: 2016-11-14 23:12:23
tags:
- nginx

categories:
- 法器
- nginx
---

Nginx 是非常优秀的开源 Web Server，基本功能包括：

* Web Server 
* Serving static content
* Reverse Proxy
* Compression and decompression
* Web content cache 

充当 Web Server ，是 Nginx 最核心的功能。

## Nginx 是如何处理请求的？

我们知道，HTTP 协议可以抽象为`Request-Response`模型，那么它是如何根据请求做出响应的呢？

`Request-Response`模型实际是要完成请求到响应文件的映射。
一个正常的 HTTP Request 类似于：

```
{Verb} {路径}
Host: {域名}或者{IP}:{端口号}
其他headers
\r\n
data
```

对于 Nginx ，首先关注的不同点就是 `Host` 、`路径`。

### Nginx 是如何匹配 server 的

考虑一个常见情况：我们知道，一个物理机之上可以放置多个虚拟服务器，拥有同一个IP、共享80端口，但是拥有不同的域名。

合理的响应方式必然是要根据收到的`HTTP`请求中的`Host`来生成相应网站的响应。 Nginx 的处理方式也符合这样的直觉：

1. 测试`Request`的`IP`、`PORT`是否和`listen`指令配置的`IP`、`PORT`是否一致，找到匹配`IP:PORT`的相应服务器。
2. 在上一步找到的Server基础上，测试`Request`的`HOST`是否和`server_name`指令配置的服务器名是否一致；
3. 如果匹配`server_name`这一步未找到，则会交由默认的Server处理（如果未显示定义默认服务器，则默认是第一个）。

一个常见的 Nginx 配置类似于：

```
server {
    listen      192.168.1.1:80;
    server_name example.org www.example.org;
    ...
}

server {
    listen      192.168.1.1:80;
    server_name example.net www.example.net;
    ...
}

server {
    listen      192.168.1.2:80;
    server_name example.com www.example.com;
    ...
}
```

那么，一个请求满足条件：

```
IP 192.168.1.1 
PORT 80
域名 www.example.net
```

则会匹配到配置好的第二个 server 。

### Nginx 如何匹配 location

`nginx` 对`location`的匹配顺序规则为：

1. first searches for the most specific prefix location given by literal strings regardless of the listed order
2. Then nginx checks locations given by regular expression in the order listed in the configuration file ,The first matching expression stops the search and nginx will use this location
3. If no regular expression matches a request, then nginx uses the most specific prefix location found earlier.

Nginx 配置：
```
server {
    listen      80;
    server_name example.org www.example.org;
    root        /data/www;

    location / {
        index   index.html index.php;
    }

    location ~* \.(gif|jpg|png)$ {
        expires 30d;
    }

    location ~ \.php$ {
        fastcgi_pass  localhost:9000;
        fastcgi_param SCRIPT_FILENAME
                      $document_root$fastcgi_script_name;
        include       fastcgi_params;
    }
}
```

这段配置中，列出了若干 `location`配置，所以，一个`/index.php`请求的匹配过程应该是:

1. 首先会命中最为具体的prefix location `/` 
2. 然后又会找到第一个匹配到的正则表达式location `\.php$`，匹配结束



