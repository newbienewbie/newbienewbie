---
layout: post
title: Github and DNS Hijacking by Somebody
date: 2015-08-14 11:57:29
tags: 
- 墙 
- DNS劫持
categories:
- Misc
---


## 柏林墙

这几日github整个都访问不了了，恰好我刚换了win10，起初还以为是git版本不兼容。后来才发现原来和我的本地机器无关。

虽说以前github在我们大陆人看来会间歇性抽风，但是从最近这几天的情况看来，github于我所在的地区而言，似乎彻底挂了。

终于,在今天晚上我找到了一点空闲时间，决定一探究竟。

## DNS Hijacking 

注意到firefox访问github.com时总是先提示

`looking up github.com...`

然后在漫长的等待后提示timeout，于是初步认定DNS环节出了问题，分别调用：

```.bash
dig github.com @8.8.8.8 
dig github.com @8.8.8.8 +tcp
```
得到这样一张图：
{% asset_img "github_dig_github1.png" "github的DNS查询结果" %}

熟悉的配方，熟悉的味道。我闻到了阵阵恶心的味道，于是我打算暂停手头的工作，去吃点西瓜压压惊。

二十分钟后，我又进行了一次DNS查询(UDP)：

{% asset_img "github_dig_github2.png" "第二次通过UDP协议查询github的IP地址" %}

至于这两个捕获到的IP地址：`203.208.39.104`、`66.249.89.104`,我whois了一下：

{% asset_img "github_whois_203.208.39.104.png" "203.208.39.104"  %}

{% asset_img "github_whois_66.249.89.104.png" "66.249.89.104"  %}

我想上个github，结果某人告诉我要去google家的服务器找。

我又得去吃西瓜降降火了。

# 解决办法

不搭梯子的方法很简单，修改本地hosts文件，让计算机知道正确的IP地址即可。





