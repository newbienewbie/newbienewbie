---
title: Node.js 和 Java 如何调用外部程序
date: 2016-12-03 22:41:42
tags:
- ECMAScript
- arguments
categories:
- 风语
- ECMAScript
- Node.js
---

## Java 语言中是如何执行外部程序

`Java`中执行一个外部程序的通常方式是利用`Runtime.getRuntime().exe()`，该方法的签名是：
```Java
public Process exec(String[] cmdarray, String[] envp, File dir) throws IOException
```

返回的`Process`对象用于管理子进程。由于子进程的标准输入、标准输出、标准错误都会被重定向到父进程，故而可以使用父进程为子进程提供输入，也可以利用父进程获取子进程的标准输出、标准错误。

比如`Java`想运行`Windows`机器上的`ping`命令测试网络连通性，然后读取输出：
```Java
public static void main(String[] args) {

    String cmd="ping baidu.com";
    try {
        Process p=Runtime.getRuntime().exec(cmd);
        p.waitFor();
        BufferedReader r=new BufferedReader(new InputStreamReader(p.getInputStream(),"GBK"));
        String s="";
        while((s=r.readLine())!=null){
            System.out.println(s);
        }
    } catch (IOException ex) {
        Logger.getLogger(Main.class.getName()).log(Level.SEVERE, null, ex);
    } catch (InterruptedException ex) {
        Logger.getLogger(Main.class.getName()).log(Level.SEVERE, null, ex);
    }
}
```

其输出为：
```
正在 Ping baidu.com [220.181.57.217] 具有 32 字节的数据:
来自 220.181.57.217 的回复: 字节=32 时间=124ms TTL=51
来自 220.181.57.217 的回复: 字节=32 时间=114ms TTL=51
来自 220.181.57.217 的回复: 字节=32 时间=126ms TTL=51
来自 220.181.57.217 的回复: 字节=32 时间=134ms TTL=51

220.181.57.217 的 Ping 统计信息:
    数据包: 已发送 = 4，已接收 = 4，丢失 = 0 (0% 丢失)，
往返行程的估计时间(以毫秒为单位):
    最短 = 114ms，最长 = 134ms，平均 = 124ms
```

## Node.js 如何调用外部程序

`Node.js`提供了`child_process`模块，以类似的方式对外部程序进行调用。

### spawn()

和`Java`的机制类似,`spawn`会孵化出子进程，并为之在与`Node.js`父进程之间建立`stdin`, `stdout` and `stderr` 的管道。

`Node.js`官方提供了这样一个[例子](https://nodejs.org/api/child_process.html)：
```JavaScript
const spawn = require('child_process').spawn;
const ls = spawn('ls', ['-lh', '/usr']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});
```

调用外部程序可以有以下几种方式：

* `spawn()` 和 `spawnSync()`
* `exec()` 和 `execSync()`
* `execFile()` 和 `execFileSync()`
* `fork()`

所有的可选方式，都是建立在`spawn()` 和 `spawnSync()`的基础之上。

### exec() 和 execFile()

`child_process.exec()` 会孵化一个`shell`，然后再在其中运行一个命令，一旦完成，即将`stdout` and `stderr`作为参数传递给`callback`回掉函数。

```JavaScript
const exec = require('child_process').exec;

exec('cat *.js bad_file | wc -l', (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
});
```

和`exec()`不同，`execFile()`并不会孵化出一个`shell`,而是直接执行一个`executable file`，由于没有使用`shell`，此方法并不支持`I/O`重定向。

```JavaScript
const execFile = require('child_process').execFile;

const child = execFile('node', ['--version'], (error, stdout, stderr) => {
  if (error) {
    throw error;
  }
  console.log(stdout);
});
```

### fork()

`fork()`和`spawn()`的不同之处在于，它孵化的出来的是新的`Node.js`进程。和`spawn()`一样，它返回一个子进程对象。

```JavaScript
const fork = require('child_process').fork;
const child = fork(`${__dirname}/sub.js`);

child.on('message', (m) => {
  console.log('PARENT got message:', m);
});

child.send({ hello: 'world' });
```

`sub.js`文件类似于：

```JavaScript
process.on('message', (m) => {
  console.log('CHILD got message:', m);
});

process.send({ foo: 'bar' });
```