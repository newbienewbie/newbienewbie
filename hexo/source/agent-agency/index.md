---
title: 代理管理局
date: 2016-11-12 08:29:18
tags:
---

## 为什么要有这个项目

有时候出于爬虫需要，可能临时需要一些HTTP(s)代理。所以自然而然就有了写爬虫去抓各个代理网站公布的免费代理的想法。

## 基本思路

目前的思路是从各类代理网站抓取代理信息(针对特定的代理网站编写定向爬虫，置于`lib/hunter/`文件夹下)。

* 定时抓取代理信息，经过解析、检测后，进行持久化。
* 定时检测代理池内的代理有效性，及时清理失效的代理
* 对外暴露代理

## 使用方法

### 源码克隆

克隆[源码](https://github.com/newbienewbie/agent-agency)

### 安装依赖

```
> cd agent-agency
> npm install
```

### 配置

* 在 `lib/config/`下添加一个配置文件，比如`config.dev.json`(可以参考`config.prod.json`和`config.default.json`的写法)，并在其中写入本地或远程的数据库配置。
* 修改`lib/config/configuration.js`中的 `env`为刚刚配置的`dev`

```JavaScript
let env="dev";
const envConfig=require(`./config.${env}.json`);
```

### 安装数据库

```
> node install/install-db.js
```

### 测试

```
> npm run test
```

### 启动


启动命令:
```
npm run start
```
如有必要，请修改抓取频率。

## 代理汇总

目前已知的和完成的代理网站：

- ☑ 西刺代理 : http://www.xicidaili.com/
- ☑ 纯真代理 : http://www.cz88.net/proxy/index.shtml
- ☑ 开心代理 : http://www.kxdaili.com/dailiip.html
