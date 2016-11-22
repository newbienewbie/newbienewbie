---
title: yeoman 基本原理
date: 2016-11-22 20:43:32
tags:
- yeoman
- 项目生成
categories:
- 风语
- ECMAScript
- yeoman
---

`yeoman` 是与编程语言无关的通用脚手架系统。通过使用自己编写的或者别人编写的`yeoman`的生成器，我们可以很方便地生成任意编程语言的项目。
与通过`mocha`、`Jest`来执行测试文件一样，我们所写的`generator`脚本都要基于`yo`来执行的，所以我们得先安装好这个全局依赖。
```
npm install -g yo
```

在接下来的行文中，我们要编写自己的`generator`脚本，最后通过`yo`来执行。

## 约定

`yeoman` 有许多约定，诸如：

* `package.json`的`name`必须以`generator-`为前缀（强制要求）
* `package.json`的`keywords`字段必须包含`yeoman-generator`（本地安装可以忽略此字段）
* `package.json`的`files`字段必须为由`generator`使用的文件或者路径名所组成的数组（本地安装可以忽略此字段）

此外，`yeoman`对文件结构也有自己的约定。默认的文件夹结构为：

```
package.json
app/          # 默认模块
    index.js
其他子模块1/
    index.js
其他子模块2/
    index.js
```
如果不喜欢这种默认约定的文件结构，可以在`package.json`的`files`字段另行[配置](http://yeoman.io/authoring/)。

## 命令执行

通过`yo`执行生成器文件，基本的命令格式为： 
```
> yo xxx:subcommnad
> # `xxx` 为生成器名(不包含`generartor-`前缀)
> # `subcommand` 为子命令
```
按照约定，此命令会执行的生成器文件为`subcommand/index.js`。

如果省略`:subcommand`，则默认为`app`
```
> yo xxx
```
此命令会执行`app/index.js`。

## 编写生成器

借助于官方提供的`yeoman-generator`模块，我们可以很方便地创建自己的生成器，官方提供 demo 代码书写方式类似于：
```JavaScript
// app/index.js 
const generator=require('yeoman-generator');

const proj=generator.Base.extend({
    info:function(){
        console.log('hello,world');
    },
    shutup:function(){
        console.log('fuck,world');
    }
});

module.exports=proj;
```

当然，这种写法相当守旧，既然`ES6`已经普及，我们可以直接这样写：
```JavaScript
const generators = require('yeoman-generator');

class MyGenerator extends generators.Base{
  constructor( ...args ) {
    super(...args);
  }
  method1() {
    console.log(`The name is: ${ this.appname }`);
  }
} 

module.exports = MyGenerator;
```

ok，如果安装了这个生成器，搭配高版本`Node.js`，无需`babel`转换，即可完美运行。比如在一个叫`test-redis`的`npm`包下执行这个生成器，则会输出：
```
The name is: test redis
```

## 安装与执行生成器

我们当然可以把生成器传到官方的仓库里供其他人使用，但是这并不是必须的。我们可以添加当前模块的软连接到全局：
```
npm link 
```
这样就可以在本地进行调用：
```
yo xxx
```
文件`app/index.js` 会被执行。




