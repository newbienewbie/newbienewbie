---
title: 学习使用Electron编写桌面软件
date: 2016-11-01 09:35:36
tags:
- ECMAScript
- Electron
- 桌面软件
categories:
- 风语
- ECMAScript
---

## Electron 简介

可以复用前端技能（JavaScript、HTML、CSS）来写桌面软件的玩意儿！

1. GitHub 出品，于2014年春开源。
2. 跨平台: Mac, Windows, Linux
3. 成功案例：`Atom`编辑器、`Visual Studio Code` 编辑器，etc

技术架构：结合`Chromium`和`Node.js`二者为一个 runtime（共享同一个 V8 实例）。

版本更新策略：
0. `Electron` 的 `Chromium` 通常在新的稳定版本发布的一两周内更新。
1. 每当一个新版本的`Node.js`发布，`Electron` 通常会等上一个月才升级（以求更稳定）。
2. 通常，共用的`V8`是`Chromium`所使用的，有时候这意味着要给`Node.js`打补丁。不管咋说，在`Electron`中，`Node.js`和`Chromium`共享同一个`V8`。

## 应用编写

一个`Electron`应用就是一个普通的`npm`包。
首先在`package.json`中配好入口文件，顺带设置好脚本启动的命令方便以后从命令行启动：

```JavaScript
{
    // ...
    "main": "start.js",
    "scripts": {
        "start": "node_modules/.bin/electron .",
    },
    // ...
}
```
`Electron` 执行的时候，会从当前目录的`package.json`读取`main`字段规定的入口文件进行启动。

与普通的JS项目一样，可以无缝使用各种现成的包(轮子)。

```JavaScript
// start.js
const electron=require('electron');
const path=require('path');

const app=electron.app;
const INDEX_HTML_PATH=path.join(__dirname,"dist","views","login.html");

let win;

app.on('ready',function(){
    win=new electron.BrowserWindow();
    win.loadURL(`file://${INDEX_HTML_PATH}`);
    win.on('closed',()=>{
        win=null;
    });
});

app.on('window-all-closed', function(){
    app.quit();
});
```
这里 `login.html` 引用了一个经过`webpack`打包的脚本，里面使用了`React`来构建登陆组件——尽管复用我们的前端技能吧！

运行截图 {% asset_img "electron运行效果截图.jpg" "electron运行效果截图"%}

## 打包

我们并不想把所有文件挨个拷给使用者。类似于 `Java` 的`jar` 打包，前端界提供了`asar`。

安装`asar`工具，
```
> npm install asar -g
```

打包：
```
> asar pack your-proj app.asar
```

`asar`默认会把`node_modules`下的文件也打包，在某些时候这是必要的，但是对于大多数前端文件，我们都可以通过`webpack`整合资源：此时完全可以移除`node_modules`文件夹再打包，这样总体积就会小很多。

## 分发

编写完`Electron`应用，如何让用户双击执行呢？总不能让用户全局安装`electron` 在调用命令行启动吧？

步骤如下：

0. 首先务必保证，打包好的应用的文件名为`app.asar`
1. 在应用的工程目录中，找到文件夹`node_modules\electron\dist`，把`dist`文件夹整体拷贝出来，
2. 把打包好的`app.asar`放入`dist/resources/`文件夹下
3. 把`dist/electron.exe`重命名为你的目标文件名；还可以通过专业工具修改图标、公司名称等。
4. 把`dist`文件夹重命名为你任何合适的名称。

用户双击你重名后的`exe`文件,即可执行。