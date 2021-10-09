---
layout: post
title: JScript 与模块化
date: 2017-01-24 22:31:32
tags:
- ECMAScript
- JScript
categories:
- 风语
- ECMAScript
- JScript
---


## Windows Script Files (.wsf) 

`Windows script file`(`*.wsf`) 是一个`XML`文件，表现的像个`Windows Script`容器，然而它们并非和特定的`engine`相关，可以包含任意`Windows Script`：

比如，有一个`JScript`文件的代码为：
```JavaScript
//fso.js
function GetFreeSpace(drvPath) {
   var fs, d, s;
   fs = new ActiveXObject("Scripting.FileSystemObject");
   d = fs.GetDrive(fs.GetDriveName(drvPath));
   s = "Drive " + drvPath + " - " ;
   s += d.VolumeName;
   s += " Free Space: " + d.FreeSpace/1024 + " Kbytes";
   return s;
} 
```

现在创建一个`*.wsf`文件来引用`JScript`脚本，然后使用`VBScript`调用之：
```XML
<job id="IncludeExample">
   <script language="JScript" src="fso.JS"/>
   <script language="VBScript">
      ' Get the free space for drive C.
      s = GetFreeSpace("c:")
      WScript.Echo s
   </script>
</job>
```

## 模块化编写脚本

注意上面使用脚本的方式，是不是和在`HTML`中引用、创建`script`脚本非常类似？`*.wsf`给了我们模块化开发`JScript`的能力。
比如，我们可以引用一个`MyLib1.js`、再创建一个`MyLib2.js`的库：
```XML
<!-- MyJob.wsf -->
<job id="IncludeExample">
  <script language="JScript" src="MyLib1.js"/>
  <script language="JScript" src="MyLib2.js"/>
  <script language="JScript">
    WScript.Echo(myLib1.foo());
    WScript.Echo(myLib2.bar());
  </script>
</job>
```

事实上，更多时候可以使用`package`，这样就能同时处理多个任务——从另一个角度说，能提供更高级别的封装。

比如要显示：
* domain name 
* computer name
* user name 

我们使用`VBScript`、`JScript`分别完成：

```XML
<package>
   <job id="vbs">
      <script language="VBScript">
         Set WshNetwork = WScript.CreateObject("WScript.Network")
         WScript.Echo "Domain = " & WshNetwork.UserDomain
         WScript.Echo "Computer Name = " & WshNetwork.ComputerName
         WScript.Echo "User Name = " & WshNetwork.UserName
      </script>
   </job>

   <job id="js">
      <script language="JScript">
         var WshNetwork = WScript.CreateObject("WScript.Network");
         WScript.Echo("Domain = " + WshNetwork.UserDomain);
         WScript.Echo("Computer Name = " + WshNetwork.ComputerName);
         WScript.Echo("User Name = " + WshNetwork.UserName);
      </script>
   </job>
</package>
```
