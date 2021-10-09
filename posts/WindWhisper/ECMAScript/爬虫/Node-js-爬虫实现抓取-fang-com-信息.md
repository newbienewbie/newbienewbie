---
layout: post
title: 使用 Node.js 编写房价爬虫
date: 2016-10-20 20:25:15
tags:
- ECMAScript
- Node.js
- 爬虫
- 房天下
categories:
- 风语
- ECMAScript
- 爬虫
---

在知乎上有个关于[深圳房价暴跌](https://www.zhihu.com/question/51547046)的讨论，楼下有个答主回答说他[编写的爬虫监控到了深圳房价下跌](https://www.zhihu.com/question/51547046/answer/126838511)：

{% blockquote 鼹鼠CC, "https://www.zhihu.com/people/yan-shu-zhao-fang" "https://www.zhihu.com/question/51547046/answer/126838511" "深圳房价暴跌，一线城市的第一轮下跌已经开始了吗？" %}
虽然暴跌这个用词有点夸张，深圳的房价已经开始下跌了，而且这一波跌幅还不会小。
我爬取了深圳某中介的四万多条二手房挂盘数据，相比国庆节前，已经有八千多条房源的放盘价格出现了下降。
{% endblockquote %}

然而，该答主在评论中表示代码不开源，也不透露是从哪个网上爬取的信息，并且其公共号也只关心深圳房价。于是我就想自己写一个爬虫监控周边房价。

## 技术选型

按说写爬虫用`Python`有成熟的方案,但是人生贵在折腾——`JavaScript`在 Web 上有天然的优势。所以这次以`Node.js`为基础。

* 使用 `fetch` API 进行网络请求
* 使用 `cheerio` + `RegEx` 进行解析
* 使用 `Sequelize` 进行持久化 

## 爬虫方案

### 目标分析

1. 由于常州没有链家，只好选[房天下](http://fang.com)（[搜房网](http://soufun.com)）。
2. 优先从二手房入手

所以目标网站为：

```
# URL 构成:
# - esf : 二手房
# - cz : 常州
http://esf.cz.fang.com/
```

二手房信息都是在一定的搜索条件下分页展示的，URL格式较为固定：

```
# 创建种子路径，种子是一个相对URL
# 目前总是以/house-开头，完整的格式为：
/house-{区代码}-{镇代码}/{总价区间代码}-{分页代码}: 
# eg:'/house-a0341-b013685/d250/';
```

### 爬虫逻辑

1. 以种子路径为基础，指定区域、价格条件(可选)，得到一个种子URL，并将之作为目标URL
2. 抓取目标URL的响应数据
3. 从中解析房源列表中的每条信息
4. 将解析结果持久化（暂时只写入数据库）
5. 查看是否有下一页，如果有，将下一页作为目标URL，跳至步2；如果没有，停止抓取。

## 代码实现

功能分割：

1. 步骤2：爬虫`Crawler`的`crawlPage(url)`
2. 步骤3：解析器`Parser`的`parseHouseListItem(e)`
3. 步骤4：持久化服务`persistence-service`的`persist(info)`方法
4. 步骤5：爬虫`Crawler`的`crawl(seed)`方法

代码相对简单，核心部分如下（[完整代码见GitHub](https://github.com/newbienewbie/fangtianxia)）：

```JavaScript

class Crawler{

    constructor(host='http://esf.cz.fang.com'){
        this.host=host;
        this.parser=new Parser(host);
    }


    /**
     * 根据某个URL对应的分页的中的房价信息
     */
    crawlPage(url) {
        console.log(`当前正直抓取: ${url}`);
        return fetch(url)
            .then(resp => resp.text())
            .then(text => {
                let $ = cheerio.load(text);

                // 获取house 信息列表
                const infoList=this.parser.parseHouseList($);
                // 持久化
                infoList.forEach((info)=>{
                    persistenceService.persist(info);
                });

                // 获取下一页的地址
                const nextUrl=this.parser.parseNextPageUrl($);
                return Promise.resolve(nextUrl);
            })
    }

    /**
     * 抓取各页的所有房价信息，直至完成最后一页为止。
     */
    crawl(seed) {
        return this.crawlPage(seed)
            .then(nextpath => {
                if (nextpath) {
                    if (!this.host) {
                        throw 'HOST 不满足要求！';
                    }
                    const next = this.host + nextpath;
                    console.log(`捕获到下一页: ${next}`);
                    return this.crawl(next);
                } else {
                    console.log('未捕获到下一页，抓取结束');
                }
            });
    }


}

```

## 效果展示：

{% asset_img "房价抓取结果.jpg" "房价抓取结果" %}
