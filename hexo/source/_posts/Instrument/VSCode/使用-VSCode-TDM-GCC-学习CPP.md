---
title: 笔记：使用 VSCode + TDM-GCC 学习CPP
date: 2017-08-02 21:56:27
tags:
- VSCode
- TDM-GCC
- Cpp
categories:
- 法器
- VSCode
---

由于一些原因，打算捡起`C/C++`来做些习题。虽说个人电脑上装了大慈善家微软的`Visual Studio 2017`（社区版），但是对于简单的习题而言，VS 这个大杀器还是稍重了些。考虑到最近一年来，我已经用`VSCode`替换`Vim`作为主力编辑器，故而我开始在网上搜寻`VSCode`编写`C/C++`的相关资料。

[微软官方对使用 VSCode 编写 C/C++ 的文档描述](https://code.visualstudio.com/docs/languages/cpp)并不给力，显然远远没有更上`VSCode`的发展速度。然后我在知乎上搜到微软员工 [Belleve](https://www.zhihu.com/people/be5invis)写的[使用 VSCode + TDM-GCC](https://www.zhihu.com/question/40929777/answer/90015056) 的回答，读后受益匪浅。相比较而言，微软官方的VSCode C/CPP文档简直完全没有帮助——如今其`C/C++`插件已经提供了代码高亮、调试等功能，设置默认的引擎后，已经无需再单独配置`c_cpp_properties.json`文件即可使用了。

特此记录备忘。

## 基本思路：

1. 使用`TDM-GCC`提供的`gcc`、`g++`、`gdb`等工具链编译、调试
2. 使用`VSCode`编辑代码，安装微软官方插件[C/C++](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools)来提供语言服务（代码格式化、自动补全、符号搜索等)和Debugging

## 安装与配置

### 安装

* 安装`TDM-GCC`，配置`PATH`方便以后使用
* 安装`VSCode`+ 官方`C/C++`插件，在首选项中配置智能提示引擎为默认:
```JavaScript
"C_Cpp.intelliSenseEngine": "Default"
```

### 项目相关配置

调试的基本过程：
1. 每次调试之前使用`g++`以`-g`参数编译源程序
2. `VSCode`调用`gdb`对编译好的文件进行调试

第1步可以通过配置`Task`完成，假定我们要编译的源文件为`main.cpp`。可以在目录中`.vscode/`下建立`tasks.json`文件:
```JSON
{
    // See https://go.microsoft.com/fwlink/?LinkId=733558
    // for the documentation about the tasks.json format
    "version": "2.0.0",
    "tasks": [
        {
            "taskName": "g++-g",
            "command": "g++",
            "args": [
                "-g",
                "main.cpp",
                "-o",
                "debug/main.exe"
            ]
        }
    ]
}
```

我们在该`JSON`文件中配置了一个任务，起名为`g++-g`，每次执行后都会编译输出为`debug/main.exe`。

至于使用`VSCode`发起调试，需要在`.vscode/`下创建`launch.json`配置：
```
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "(gdb) Launch",
            "type": "cppdbg",
            "request": "launch",
            "program": "${workspaceRoot}/debug/main.exe",
            "args": [],
            "stopAtEntry": false,
            "cwd": "${workspaceRoot}",
            "environment": [],
            "externalConsole": true,
            "preLaunchTask": "g++-g",
            "MIMode": "gdb",
            "miDebuggerPath": "gdb.exe",
            "setupCommands": [
                {
                    "description": "Enable pretty-printing for gdb",
                    "text": "-enable-pretty-printing",
                    "ignoreFailures": true
                }
            ]
        }
    ]
}
```

这里我们配置了一个`launch`请求:
* `type`为`cppdbg`，
* `MIMode`为`gdb`，
* `miDebuggerPath`为`gdb`的路径，
* 目标程序为我们用`Task`编译好的`debug/main.exe`，

此外，还需注意`preLaunchTash`这个属性值我们设置为`g++-g`，保证了我们按下`F5`启动`Launch`后先执行对应的`Task`完成编译。

## demo


{% asset_img "demo.gif" "demo" %}
