---
layout: post
title: TCP 连接
date: 2017-01-15 20:28:36
tags:
- ECMAScript
- Node.js
- net
- TCP
categories:
- 风语
- ECMAScript
- Node.js
---


## TCP Socket

该类代表了 `TCP socket` 或者`local socket`。

其实例实现了`duplex Stream`接口。即可用作`client`,也可用作`server`

### 事件

TCP Socket 也是`EventEmitter`，重要的事件包括：

* `lookup`: 在解析`hostname`(但在连接之前)触发
* `connect`: 当一个`socket`连接成功建立后触发
* `data`: 当`socket`接收到数据后触发
* `drain`: emitted when the write buffer becomes empty
* `end`: 当`socket`的另一端发送了`FIN packet`触发
* `close`: 当`socket`被完全关闭后触发
* `timeout`: 当`socket`非活动时超时触发，注意这只是提示`socket`是空闲的，用户需要手工关闭连接。
* `error`: 当发生错误时触发

### 重要方法：

#### socket.connect(options[, connectListener])

对给定的`socket`，打开连接

#### socket.write(data[, encoding][, callback]) 

在`socket`上发送数据，默认为`UTF8`编码，
Returns `false` if all or part of the data was queued in user memory. `drain` will be emitted when the buffer is again free.

#### socket.end([data][, encoding])

半关闭`socket`，即发送一个`FIN`包。如果指定`data`，等效于

```JavaScript
socket.write(data, encoding);
socket.end();
```

## TCP client

* `net.createConnection(options,connectListener)`
* `net.connect(options,connectListener)`

工厂函数，创建一个新的`net.Socket`实例，并调用`socket.connect` 方法进行连接远程服务器，返回`socket`。

```JavaScript
const net = require('net');

const client = net.connect({port: 8124}, () => {
    // 'connect' listener
    console.log('connected to server!');
    client.write('world!\r\n');
});

/* or
const client = net.createConnection({port: 8124}, () => {
    //'connect' listener
    console.log('connected to server!');
    client.write('world!\r\n');
});
*/

client.on('data', (data) => {
    console.log(data.toString());
    client.end();
});

client.on('end', () => {
    console.log('disconnected from server');
});
```

## TCP server:

使用`net.createServer((client)=>{})`工厂方法创建服务器：
```JavaScript
const net = require('net');

const server = net.createServer((c) => {
    // 'connection' listener
    console.log('client connected');
    c.on('end', () => {
        console.log('client disconnected');
    });
    c.write('hello\r\n');
    c.pipe(c);
});


server.on('error', (err) => {
    throw err;
});

server.listen(8124, () => {
    console.log('server bound');
});
```

## 一个例子：

实现一个TCP程序，在服务器和客户端之间建立连接，如果服务器接到来自客户端的消息，就在2秒后回复消息；而当客户端收到服务器的消息后，立刻给服务器发送消息。
服务端程序如下：
```JavaScript
const net=require('net');

let i=0;

const server=net.createServer((client)=>{
    client.on('data',function(data){
        console.log('message from client received:',data.toString());
        setTimeout(function() {
            client.write(`server message ${i++}`);
        }, 2000);
    });
    client.on('end',function(){
        console.log('client disconnected');
    });
    client.on('close',function(){
        console.log('socket closed !');
    });
    client.on('error',function(error){
        console.log('shit happens ...');
    });
});

server.listen(7788,()=>{
    console.log('server bound');
});
```

客户端：
```JavaScript
const net=require('net');

let i=0;

const socket=net.createConnection(
    {
        port:7788,
        host:'127.0.0.1',
    },
    ()=>{
        console.log('connect!');
        socket.write(`initial data`);
    }
);

socket.on('data',function(data){
    console.log(`data from server received:`,data.toString());
    socket.write(`client data: ${i++}`);
});

socket.on('error',function(error){
    console.log(`shit happens ...`);
});

```
最后的效果：

{% asset_img "talk-screenshot.jpg" "node tcp talk" %}
