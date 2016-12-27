---
title: electron 主进程和渲染器进程通信
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


在`Electron`中，
* 把运行`package.json`的`main`脚本的进程称之为`Main Process`;
* 每一个网页都运行在独立的进程里，称之为`Renderer Process`。

## Main Process 和 Renderer Process

`Main Process`通过创建`BrowserWindow`实例来创建网页。每一个`BrowserWindow`实例都在独立的`Renderer Process`里运行网页。每当`BrowserWindow`实例被销毁，相应的`Renderer Process`也会终止。`Main Process`负责管理所有的网页和相应的`Renderer Processes`,每一个`Renderer Process`都相互独立。
`Main Process`和`Renderer Process`之间可以采用`IPC`机制通讯。

## ipcMain 和 ipcRenderer

`ipcMain`模块、`ipcRenderer`模块都是`EventEmitter`的一个实例，
`ipcMain`会处理来自于`Renderer Process`的异步消息和同步消息。`Renderer Process`发来的消息会被提交到这个模块。
`ipcRenderer`可以发送以同步或者异步的方式从渲染进程到主进程发送消息。也可以利用它从主进程接收消息。

* 和`EventEmitter`那样，`ipcMain`和`ipcRender`进程都利用`.on(eventName,(event,arg)=>{})`方法响应事件(处理消息)。
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

