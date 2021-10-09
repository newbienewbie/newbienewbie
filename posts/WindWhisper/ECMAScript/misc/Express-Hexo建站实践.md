---
layout: post
title: Express-Hexo建站实践
date: 2016-10-14 21:24:47
tags:
- Hexo
- ECMAScript
- Node.js
- Express
- 博客

categories:
- 风语
- ECMAScript
- Misc
---

之前的域名[玄牝门](xuanpinmen.com)过期了，而且我也不打算再续。

## WordPress 和 有道云笔记 

当时用的是WordPress，尽管使用插件可以使之从 GitHub 同步 Markdown 笔记，但是还是觉得不够方便：

1. 插件对 Markdown 语法支持不够完备，从 GitHub 拉取后还要手工调整下局部不兼容问题。
2. 代码高亮得自己配，还有乱七八糟的代码自折行问题；需要自己添加钩子修改CSS。
3. 在线编辑器不能使用`VIM`模式，打字没有手感。
4. 无法全程使用键盘，不够Geek。

于是一直使用自己最趁手的编辑器（`Vim`、`VSCode`）+有道云笔记作为替代方案。
{% asset_img "youdaonote.png" "有道云笔记" %}

这两日又觉得有个域名还是蛮方便的，于是又重新萌发了搞个网站的想法。

## Express + Hexo 

搞网站，极速开发，语言选择，当然是通吃百家饭的 JavaScript 。

### 技术栈

既然追求极速、Geek，当然既要利用现有的轮子，又要充分定制:
* `Hexo` 是成熟的记笔记方案，但是 `hexo server` 的可定制化程度不高；
* HTML在线编辑器：使用笔者之前编写的`express-ueditor`和`simple-react-ui`下的ueditor，可以极速搭建一个HTML在线编辑器，但是对 Markdown 支持得多敲代码。
* 在HTML在线编辑器的基础上使用Markdown纯文本：图片相对路径设置、皮肤、插件等功能都得自己实现。

采用的方案如下：

1. 记笔记采用 `Hexo` ，纯静态化为前端文件；
2. 为了可以随时添加其他功能，采用 `Express` 作为基础框架。
3. 最起码提供两分支，一套`blog`分支管理笔记文件，一套`master`分支管理网站源码。


### 代码

代码本身极其简单，具体实现不复赘言。笔者已经将其做成了适用于`Openshift`的一个[通用型应用](https://github.com/newbienewbie/Express-Hexo)。

Openshift v2 提供了一个可以运行 Node.JS Latest [Host方案](https://openshift.redhat.com/app/console/application_type/quickstart!243)，

{% asset_img "Create-a-New-Application.png" "利用代码仓库创建博客网站" %}

在 Source Code 字段，填写`源码地址`、`分支`，经过半分钟左右，即可生成网站。如果导入的是`blog`分支，则会直接完成网站文章的导入。

### 工作流

完整工作流如下：

1. 利用最趁手的编辑器`VSCode`记笔记、调试、预览、提交
2. 推送 `commit` 到 `github`作为备份
3. 推送 `commit` 到展示网站
4. 部署后自动触发钩子，对`Hexo`笔记进行静态化
5. 网站对外采用`Express`展示静态化的`blog`

{% asset_img "express-hexo-vscode-git-browser.png" "工作流" %}
