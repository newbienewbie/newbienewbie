# Express-Hexo

## 原理

1. 记笔记采用 `Hexo` ，纯静态化为前端文件；
2. 为了可以随时添加其他功能，采用 `Express` 作为基础框架。
3. 最起码提供两分支，一套`blog`分支管理笔记文件，一套`master`分支管理网站源码。
4. 部署后自动触发钩子，对`Hexo`笔记进行静态化
5. 网站对外采用`Express`展示静态化的`blog`


## 安装

```
> # 在主目录下
> npm install
```

## 本地调试

### 生成静态化文件

```
> # 在 hexo 目录下 
> npm install
> hexo generate
```

### 本地调试运行

命令行：
```
> # 在主目录下
> node ./lib/server.js 
```
或者，当使用`VSCode`，按下`F5`键即可。


## 服务端启动

当推送到网站服务器，自动运行的是
```
> node start.js
```