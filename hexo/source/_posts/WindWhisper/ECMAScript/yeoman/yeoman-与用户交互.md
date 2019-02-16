---
title: yeoman 与用户交互
date: 2016-12-18 23:42:13
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

## 输出信息

在`yeoman`中，想要输出信息给用户非常简单，直接调用`log`方法即可：

```JavaScript
const Base=require('yeoman-generator');

class MyGenerator extends Base{

  constructor( ...args ) {
    super(...args);
  }

  get prompting(){
      return {
          double:function(){
              this.log(`${this.appname} double kill`);
          },
          triple:function(){
              this.log(`${this.appname} triple kill`);
          }
      };
  }

  method1() {
    this.log(`The name is: ${ this.appname }`);
  }

  default(){
      this.log(`holy shit`);
  }

  initializing(){
      this.log(`first blood`);
  }

} 

module.exports=MyGenerator;
```

## 处理用户输入

处理用户输入包括两类情况，一类是主动进行`Prompt`问询，一类是接收传递来的参数。

### Prompts

`Prompt`是与用户互动的主要方式。此模块背后是通过[Inquirer.js](https://github.com/SBoudrias/Inquirer.js)支撑的。根据预设的运行优先级，应该把相关代码放入`prompting`中。

```JavaScript
class MyGenerator extends Base{

  constructor(...args) {
    super(...args);
  }

  prompting(){
    return this.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Your project name',
            default: this.appname 
        }, 
        {
            type: 'confirm',
            name: 'safe',
            message: 'safe mode ?'
        }
    ]).then((answers) => {
      this.log('app name', answers.name);
      this.log('safe mode', answers.safe);
    });
  }

} 

```

### Arguments 和 Options

`Arguments`是直接从命令行传递的，而`Options`则是利用附带`flag`标记进行传递：
```
yo yeo --email webbot@webbot.com --username webbot myarg
```

比如这里的 `--email`、`--username` 即为`Options`，则 `myarg` 则为`Arguments`。 

* 为了告知`yeoman generarator`我们将来要接收一个`Argument`参数，应该在构造函数中调用`this.argument()`方法。
* 为了告知`yeoman generarator`我们将来要接收这样一个`Option`选项，应该在构造函数中调用`this.option()`方法。

这两个方法的签名类似，都接收两个参数：
1. `name`
2. `hash`

第二参数`hash`是可选的，可接收多个键值对:

* `desc`：一段描述
* `required`：是否必填的`Boolean`
* `type`：`String`, `Number`, `Array`或者自定义函数
* `default`：默认值

默认的`Arguments`是`String`类型，而默认的`Options`是`Boolean`类型。

## 示例：

```JavaScript
class MyGenerator extends Base{

  constructor(...args) {
    super(...args);
    this.argument('hello');
    this.option('email',{type:String});
    this.option('username',{type:String});
  }

  prompting(){
    // 异步依次问询
    return this.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Your project name',
            default: this.appname 
        }, 
        {
            type: 'confirm',
            name: 'safe',
            message: 'safe mode ?'
        }
    ]).then((answers) => {
      this.log('app name', answers.name);
      this.log('safe mode', answers.safe);
    });
  }

  default(){
      this.log(this.options.hello);
      this.log(this.options.email);
      this.log(this.options.username);
  }

} 
```

若在一个`activiti-client`项目中执行命令：
```
yo yeo myarg --email webbot@itminus.com --username webbot
```
则交互效果将类似于：
```
? Your project name activiti client
? safe mode ? Yes
app name activiti client
safe mode true
myarg
webbot@itminus.com
webbot
```