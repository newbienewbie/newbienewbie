# Express-Hexo

## 原理

1. 记笔记采用 `Hexo` ，纯静态化为前端文件；
2. 为了可以随时添加其他功能，采用 `Express` 作为基础框架。
3. 最起码提供两分支，一套`blog`分支管理笔记文件，一套`code`分支管理网站源码。
4. 部署后自动触发钩子，对`Hexo`笔记进行静态化
5. 网站对外采用`Express`展示静态化的`blog`

由于2017年9月30日之后，OpenShift关停原来的 OpenShift Online 2 ，于是我移除了OpenShift相关代码，现在按照部署在独立的VPS上的思路重新编写代码。


## 本地调试

### 数据库配置

在`/lib/config`目录下创建 `config.dev.js`，然后填写配置

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
或者，当使用`VSCode`，直接按下`F5`键即可。


## 服务器配置

### 数据库

微信公众号部分的配置存储在数据库中，执行`/lib/domain/wechat.sql`,创建微信配置表，然后把`appid`、`token`等信息填入第一行(暂时只支持单公众号)。

### 进程权限

由于监听`80`端口需要`root`权限，所以对`node`程序添加权限：
```bash
setcap 'cap_net_bind_service=+ep' /usr/bin/node
```
### 环境设置

新建一个用户X，为之设置环境变量：

```bash
export ITMINUS_REPO_DIR=/home/lou/itminus
export ITMINUS_MYSQL_DB_HOST="******"
export ITMINUS_MYSQL_DB_PORT="******"
export ITMINUS_MYSQL_DB_USERNAME="*****"
export ITMINUS_MYSQL_DB_PASSWORD="*****"
export ITMINUS_APP_NAME="****"

export NODE_ENV="production"
export NODE_IP="0.0.0.0"
export NODE_PORT="80"
```

比如可以将以上权限写入某用户的`.bash_profile`，然后执行：
```bash
source .bash_profile
```

## 如何部署

在客户端执行以下命令，即可上传代码到服务器：
```
tar -c --gzip --exclude=".git" --exclude='node_modules' --exclude='hexo/node_modules' --exclude='hexo/public' itminus | ssh user_name@remote_server -p port 'tar -x --gzip -v'
```
其中，`--exclude`参数分别忽略了这样的几个文件夹：

* .git
* node_modules/
* hexo/node_modules/
* hexo/public/

然后在服务端执行：
```bash
echo "Building static files using hexo..."

cd $ITMINUS_REPO_DIR/hexo && npm install 
cd $ITMINUS_REPO_DIR/hexo && node_modules/hexo/bin/hexo generate

echo "install dependencies of main package ..."

cd $ITMINUS_REPO_DIR && npm install
```

最后以`pm2`管理进程。
```
pm2 start lib/server.js 
```
