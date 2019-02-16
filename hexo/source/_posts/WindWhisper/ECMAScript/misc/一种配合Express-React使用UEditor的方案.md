---
title: 一种配合Express+React使用UEditor的方案(1)
date: 2016-10-15 23:03:20
tags:
- ECMAScript
- Node.js
- UEditor
- Express
- React
categories:
- 风语
- ECMAScript
- Misc
---

这是一种配合Express+React使用UEditor的方案的第(1)篇。

[UEditor](http://ueditor.baidu.com/website/index.html)是由百度推出的一款所见即所得富文本web编辑器，开源，基于MIT协议。

笔者十分喜欢这款产品，并在一个实际改造项目(基于`ASP.NET`)中替换原来老旧的`FCKEditor`，收到了很不错的效果。
虽说大家对百度近些年来某些商业行为的口碑不太好，但是不得不说，他们工程师的技术造诣仍旧是我等低级码农学习之典范。

本文只讲在`JavaScript`的前、后端应用中使用`UEditor`遇到的两个问题及解决方案：
1. 后端方面：官方网站上只给出了`.NET`、`Java`、`PHP`的后端示例，并未提供`Node.js`版，目前官网、和npm上有几款相关包，可惜功能都有欠缺。以[netpi/ueditor](https://github.com/netpi/ueditor/)为例，并不像官方提供的`.NET`、`PHP`、`Java`的后台示例那样支持自配置功能。
2. 前端方面：`React` 现在大红大紫，如何使用 `React` 包装一个 `UEditor` 元素来使用？ 如何避免`SPA`应用中的多次加载 `UEditor` 的坑？

于是笔者写了两个包解决这两个问题。

## 为 UEditor 编写 Express 支持

`UEditor`这块产品本身是一个纯前端项目，每次与后端交互，都会向一个控制器发起请求，并在`action`参数中附上动作名。笔者编写了一个npm包`express-ueditor`来实现相关功能。

### 相关地址：

* [npm安装主页](https://www.npmjs.com/package/express-ueditor)
* [GitHub源码](https://github.com/newbienewbie/express-ueditor)

### 安装与测试

```
> # 安装
> npm install
> # 测试
> npm run test
```

### 使用方法

使用方法非常简单，只需要简单记住以下3条规则即可：

1. `UEditor`类是`express-ueditor`各功能的统一出入口，
2. 可以在实例化`UEditor`的时候提供自定义选项：
```JavaScript
const ueditor=new UEditor({
    // 支持官方提供的其他语言Demo的所有自定义配置
    // ...如果不提供，则使用默认参数
});
```
3. 各组件以高阶函数的形式提供，比如config(),upload(actionStr)分别返回一个中间件函数。可参考的demo如下：
```JavaScript
const app=express();
const router=express.Router();

const ueditor=new UEditor({
    videoMaxSize:5*1014*1024*1024,  
});

router.post("/image",ueditor.upload("uploadimage"));
router.post("/video",ueditor.upload("uploadvideo"));;

app.use(router);
```

## React 包装 UEditor

目前官方给予的前端使用方式：

1. 直接引入UEditor的前端配置文件`ueditor.config.js`
2. 直接引入相关脚本文件`ueditor.all.js`，
3. 编写自定义JavaScript完成UEditor的生成。

[相关代码](http://fex.baidu.com/ueditor)为:

```HTML
<!DOCTYPE HTML>
<html>

<head>
    <meta charset="UTF-8">
    <title>ueditor demo</title>
</head>

<body>
    <!-- 加载编辑器的容器 -->
    <script id="container" name="content" type="text/plain">
        这里写你的初始化内容
    </script>
    <!-- 配置文件 -->
    <script type="text/javascript" src="ueditor.config.js"></script>
    <!-- 编辑器源码文件 -->
    <script type="text/javascript" src="ueditor.all.js"></script>
    <!-- 实例化编辑器 -->
    <script type="text/javascript">
        var ue = UE.getEditor('container');
    </script>
</body>

</html>
```

有一个不方便的地方在于，目前`UEditor`并不支持`npm`安装。
如果要简单的包装为一个React组件`UEditor`，还需要预先在页面中手工引入`ueditor.config.js`、`ueditor.config.js`。
如果是传统的多页面应用问题倒不严重，因为只有在访问特定页面的时候在会加载。
单若是开发单页面应用，就比较麻烦了：
1. 对于特定角色的用户，SPA的功能可能只有一部分被使用，如何确保只在用户执行了某个操作的时候才加载这两个脚本文件？
2. SPA在用户切换到其他功能后再切换回来时，因为UE.getEditor()已经有现成实例，无法重新获取编辑器。

针对问题1，解决方案是：

1. 每当组件加载前，都判断相应的脚本`Script`是否存在，如果不存在，创建之。
2. 每当组件加载完，尝试获取编辑器`UE.getEditor()`，如果无法获取，则稍后再试，如此往复。

针对问题2，解决方案是：

每次组件卸载前，都触发一次`UE.delEditor()`来删除编辑器。

笔者已经将之封装为到UI组件`simple-react-ui`中。

### 相关地址

[npm安装主页](https://www.npmjs.com/package/simple-react-ui)
[GitHub源码](https://github.com/newbienewbie/simple-react-ui)

### 安装

```
npm install simple-react-ui --save
```

### 使用

* 把UEditor相应的文件包放置在浏览器端可以访问的URL路径下，比如，`/static`
* 引入 simple-react-ui 的 UEditor 组件，提供相应的属性

```JavaScript
import React from 'react';
import UEditor from 'simple-react-ui/dist/ueditor';

const Add=React.createClass({

    render:function () {

        return (<div className="col-sm-9 col-sm-offset-3 col-md-8 col-md-offset-2 main">
            <form action="" method='post' className="container" >
                <input name='title'/>
                <UEditor id="ueditorContainer" name="content" 
                    width={800} height={500} 
                    uconfigSrc='/static/ueditor/ueditor.config.js'
                    ueditorSrc='/static/ueditor/ueditor.all.min.js'
                />
                <input className="btn btn-warning" type='submit' name="提交" value='提交'/>
            </form>
        </div>);
    }
});


export default Add;
```

