---
layout: post
title: Electron 主进程和渲染器进程通信
date: 2016-12-27 23:47:16
tags:
- ECMAScript
- Node.js
- Electron
- 桌面软件
categories:
- 风语
- ECMAScript
- electron
---


在使用`Electron`开发中，经常有这样一种需求场景：
1. 用户点击网页界面中的`button`元素
2. 触发`Electron`执行一些系统操作，比如调用外部的系统命令、执行`Node.js`程序，
3. 执行完程序后再将结果反馈到网页中。

为解决此类文件，需要使用`IPC`通讯。

首先定义两种进程：
* 把运行`package.json`的`main`脚本的进程称之为`Main Process`;
* 每一个网页都运行在独立的进程里，称之为`Renderer Process`。

## Main Process 和 Renderer Process

`Main Process`通过创建`BrowserWindow`实例来创建网页。每一个`BrowserWindow`实例都在独立的`Renderer Process`里运行网页。每当`BrowserWindow`实例被销毁，相应的`Renderer Process`也会终止。`Main Process`负责管理所有的网页和相应的`Renderer Processes`,每一个`Renderer Process`都相互独立。
`Main Process`和`Renderer Process`之间可以采用`IPC`机制通讯。

## ipcMain 和 ipcRenderer

`ipcMain`模块、`ipcRenderer`模块都是`EventEmitter`的一个实例，
`ipcMain`会处理来自于`Renderer Process`的异步消息和同步消息。`Renderer Process`发来的消息会被提交到这个模块。
`ipcRenderer`可以发送以同步或者异步的方式从渲染进程到主进程发送消息。也可以利用它从主进程接收消息。

* 和`EventEmitter`那样，`ipcMain`和`ipcRenderer`进程都利用`.on(eventName,(event,arg)=>{})`方法响应事件(处理消息)。
* `ipcRenderer`进程利用`.send(eventName,msgObj)`将消息发送给`ipcMain`进程。
* 可以使用`event.sender.send(...)`异步的把消息回发给发送人

```JavaScript
ipcMain.on(eventName,(event,arg)=>{
    event.sender.send('eventName','ping');
});
```

## 示例

主进程：
```JavaScript
const path=require('path');
const {app,ipcMain,BrowserWindow}=require('electron');

ipcMain.on('asynchronous-message', (event, arg) => {
    console.log(arg)  // prints "ping"
    event.sender.send('asynchronous-reply', 'pong')
})


const INDEX_HTML_PATH=path.join(__dirname,"dist","views","index.html");
let win;
app.on('ready',function(){
    win=new BrowserWindow();
    win.openDevTools();
    win.loadURL(`file://${INDEX_HTML_PATH}`);
    win.on('closed',()=>{
        win=null;
    });

});
app.on('window-all-closed', function(){
    app.quit();
});
```

主进程将要创建的网页的`HTML`页面代码为：
```HTML
<html>
<head></head>
<body>
    <div id="app">
        hello,world
    </div>
    <script src="../js/index.js"></script>
</body>
</html
```
此页面`script`加载的`index.js`代码为：
```JavaScript
const {ipcRenderer} = require('electron')

ipcRenderer.on('asynchronous-reply', (event, arg) => {
  console.log(arg) // prints "pong"
})
ipcRenderer.send('asynchronous-message', 'ping')
```
则最终会在运行主程序的控制台、和`Electron`的开发工具控制台中分别输出消息，如下图所示：

{% asset_img "electron运行效果截图.jpg" "electron运行效果截图"%}

## 使用`webpack`编译`Electron`网页部分的代码

在使用`webpack`打包`Electron`网页部分的程序代码中，经常遇到这种情况:

1. 需要在渲染器进程中通过`const {ipcRenderer}=require('electron')`引入`ipcRenderer`
2. 然而`webpack`默认情况下会尝试把`electron`模块也编译来来，触发报错——找不到`fs`之类的模块。

由于`webpack`默认的编译目标是浏览器环境，直接套用默认情况然然是不合理的。我们编译后的文件并非在浏览器中执行，而是在`Electron`的`Renderer Process`中进行，这里直接把`webpack`的编译`target`设置为`electron-renderer`即可解决问题:
```JavaScript
module.exports={

    // for electron renderer process
    target:'electron-renderer', 

    entry:{
        // ... 省略
    },
    output:{
        // ... 省略 
    },
    module:{
        // ... 省略 
    },
};
```
