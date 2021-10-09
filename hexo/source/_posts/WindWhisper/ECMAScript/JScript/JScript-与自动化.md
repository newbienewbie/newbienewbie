---
layout: post
title: JScript 与自动化
date: 2017-01-24 21:44:37
tags:
- ECMAScript
- JScript
categories:
- 风语
- ECMAScript
- JScript
---

`JScript`实现的`ECMAScript Edition 3`，也是`IE8`使用的引擎。然而，随着`V8`大放光彩，微软放弃了之前规划的托管`JavaScript`计划（同期规划的`VB`变身为`VB.NET`活了下来），`JScript`开发组另起炉灶搞了`Chakra`与`Node.js`一争长短，这也是`IE9`之后使用的`JS`引擎。
按理说，`JScript`这玩意儿停止开发这么多年了，早应该寿终正寝了。然而我一想到时不时要帮女票和朋友们批量修改`Excel`，我就觉得未来很久一段时间内仍然不得不去求助于这货。说起来，我对`VB`/`VBA`实在无爱——尽管这是我高中学的第一门编程语言，而且在当年干物资的确实帮我省了大量的时间。加之目前使用`Web`技能开发`Office Addin App`貌似生态还不成熟、开发起来也不简便，毕竟对于一些临时任务单独架设`https`服务器有些牛刀宰鸡之感，于是需要使用`JScript`代替之。

目前能想到的应用方向包括：
* `Excel`、`Word`办公自动化
* 简单的系统管理，如文件遍历、改名、删除

## JScript 与宿主

`JScript`、`VBScript`同属于官方支持的`Windows Script`，当年，这俩脚本都需要依赖于特定的宿主(`Host`)才能执行，比如，`JavaScript`大多时候运行在浏览器中。除了浏览器环境之外，他们，还可以运行在`Windows Script Host`中。
`Windows Script Host`是一个`language-independent`的脚本宿主环境，主要用于执行`Windows`管理任务，其对象层级为：
```
// WSH 对象模型层级
WScript
    WshArguments
        WshNamed
        WshUnnamed
    WshController
        WshRemote
            WshRemoteError
    WshNetwork
    WshShell
        WshShortcut
        WshUrlShortcut
        WshEnvironment
        WshSpecialFolders
        WshScriptExec
```
`WSH`提供的对象都与相应的管理`Task`相关，比如根对象`WScript`负责：

* Set and retrieve command line arguments
* Determine the name of the script file 
* Determine the host file name (wscript.exe or cscript.exe)
* Determine the host version information
* Create, connect to, and disconnect from COM objects
* Sink events
* Stop a script's execution programmatically
* Output information to the default output device (for example, a dialog box or the command line)

在`JScript`中，永远不需要去实例化根对象`WScript`，正如同浏览器中的直接全局对象一样。

再如`WshShell`对象提供的功能为:

* 在本地运行一个程序
* 操作注册表
* 创建快捷方式
* 访问`system folder`
* 操作环境变量，比如 `WINDIR`、`PATH`、`PROMPT`

注意`WshShell`提供了操作注册表的功能！

* `RegRead` 读
* `RegWrite` 写
* `RegDelete` 删

示例代码：
```JavaScript
var shell = new ActiveXObject('Wscript.Shell'); 
var val = shell.RegRead('HKCU\\Control Panel\\Desktop\\Wallpaper'); 

WScript.Echo(val);
```

`WSH`对象模型提供的`COM`接口可以分为两类：

1. Script Execution and Troubleshooting ：这类接口运行脚本执行`WSH`的基本的操作, 输出信息、执行基本的`COM`函数（如`CreateObject`、`GetObject`）
2. Helper Functions ：执行诸如映射网络驱动器、连接打印机、获取/修改环境变量、操作注册表之类操作

## `Excel`自动化

`JScript`这货操作`Excel`，依靠的是自动化接口，和`VBScript`调用机理完全一直。唯一需要注意的是，为了避免出现中文乱码现象，记得以`GBK`格式进行存储脚本文件！

```JavaScript
var app=WScript.CreateObject("Excel.Application");
var fso=WScript.CreateObject('Scripting.FileSystemObject');

var excelFile=fso.GetFile("./生产管理专业业务对接表单（1.20）.xlsx");
var book=app.Workbooks.Open(excelFile);
app.Visible=true;
var sheet=book.Worksheets(1);
var cell=sheet.Cells(2,1);
WScript.Echo(cell.Value);
book.Close();

app=null;
fso=null;
```
文件以`GBK`编码格式保存，利用`wscript`或者`cscript`执行之，即可得到相应结果。

在`JScript`中，创建对`Excel`应用对象的引用、解除引用的语法为：
```JavaScript
// 创建引用
var app=WScript.CreateObject("Excel.Application");

// 解除引用
app=null;
```
注意，解除对象引用并不会导致`Excel.Application`对象关闭！关闭对象需要调用对象的专有的关闭方法！

## JScript 执行

可以使用以下两种程序运行`JScript`脚本：
1. Windows-based script host (Wscript.exe)
2. command-based script host (CScript.exe)

相应的命令行启动方式类似于：
```
> wscript index.js
> cscript index.js
```
