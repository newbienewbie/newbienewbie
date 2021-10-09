---
layout: post
title: yeoman 与文件系统交互
date: 2016-12-19 10:56:42
tags:
- ECMAScript
- Node.js
- yeoman
- 项目生成
categories:
- 风语
- ECMAScript
- yeoman
---


`.yo-rc.json`文件定义了一个`yeoman`项目的根目录（`root`）。 这个文件允许用户运行在子目录里运行命令。

## 两个 context

`yeoman`文件功能都是基于这样一个简单设想：在磁盘上，你总是有两个 `location contexts`。大部分情况下是从一个地方读，然后向另一个地方写。

### destination context

`destination context`被定义为当前工作目录或者最近一级包含`.yo-rc.json`文件的父目录。

* 使用`destinationRoot()`方法获取`destination path`
* 使用`.destinationPath('sub/path')`方法来连接一个`path`

### template context

`template context`是存放模板文件的地方。`template context`默认定义为`./templates/`。可以通过使用调用`sourceRoot('new/template/path')`方法覆盖这个默认值。

* 使用`sourceRoot()`方法获取`path`值。 
* 使用`.templatePath('app/index.js')`连接一个`path`

## in-memory file System 和 文件功能

由于异步`API`难以使用, `yeoman`提供了同步的`file-system API`，将所有的文件都写到`in-memory`文件系统，当`yeoman`完成运行后，再写到磁盘。`in-memory`文件系统在所有的`composed generators`之间共享.
`Generator`通过`this.fs`暴露所有的文件方法，`this.fs`是`mem-fs editor`的一个实例。

### 拷贝模板文件

使用`copyTpl()`方法来拷贝模板，此方法使用`ejs`模板语法：
```HTML
<html>
  <head>
    <title><%= title %></title>
  </head>
</html>
```
调用的时候只要像渲染视图文件那样进行就可以了：
```JavaScript
class extends Generator {
  writing() {
    this.fs.copyTpl(
      this.templatePath('index.html'),
      this.destinationPath('public/index.html'),
      { title: 'Templating with Yeoman' }
    );
  }
}
```


### 更新已经存在的文件内容

更新已经存在的文件内容是很复杂的工作，最可靠的方法是把文件解析为`AST`，然后编辑之。一些流行的`AST parser`包括：

* `Cheerio`：解析`HTML`。
* `Esprima`：解析`JavaScript`。
* 对于`JSON`文件，使用原生的`JSON`对象方法。
* 对于`Gruntfile`，使用`Gruntfile Editor`。

使用`Regex`解析一个代码文件是邪道。

## 通过流转换输出文件

`Generator`系统允许对每一个文件使用定制的`filter`,比如美化文件等。一旦`yeoman`通过[vinyl](https://github.com/gulpjs/vinyl)处理完，再把每一个修改过的文件写入磁盘。

通过调用`registerTransformStream()`方法即可注册一个新的修改器：
```JavaScript
var beautify = require('gulp-beautify');
this.registerTransformStream(beautify({indentSize: 2 }));
```
需要注意的是，每一个文件都会被这个`stream`处理。
