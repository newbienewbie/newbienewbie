---
title: yeoman 生成器方法的执行原理
date: 2016-11-22 21:50:18
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

## 生成器原型的方法与任务

`yeoman`是通过执行生成器来完成项目生成的。

对于一个生成器对象，每一个直接挂载到其`prototype`属性上的方法，都会被认作一个`task`。

也就是说，通过`Object.getPrototypeOf(Generator)`返回的原型，其每一个方法都会被自动执行。当然，有一种情况除外，他们会被当作helper方法，不会触发自动执行： 以`_`开头的方法。

## run loop

`run loop`是一个支持优先级的队列系统。每一个`task`都会通过`run loop`依次运行。按照运行顺序，有效的`priorities`包括：

1. `initializing` - 初始化 
2. `prompting` - where you'd call this.prompt()
3. `configuring` - Saving configurations and configure the project (creating .editorconfig files and other metadata files)
4. `default` - If the method name doesn't match a priority, it will be pushed to this group.
5. `writing` - Where you write the generator specific files (routes, controllers, etc)
6. `conflicts` - Where conflicts are handled (used internally)
7. `install` - Where installation are run (npm, bower)
8. `end` - 终止, cleanup, say good bye, etc

### 方法名与任务队列的优先级

在通过新建方法名为生成器添加任务的方式中：
* 如果一个方法名和某一个`priority`一致，则`run loop`会推送这个方法到特定的队列。
* 如果方法名不能匹配到`priority`, 则会推送到`default`优先级下。

比如
```JavaScript
class MyGenerator extends Base{

  constructor( ...args ) {
    super(...args);
  }

  method1() {
    console.log(`The name is: ${ this.appname }`);
  }

  default(){
      console.log(`holy shit`);
  }

  initializing(){
      console.log(`first blood`);
  }

} 
```

执行后将会输出:
```
first blood
The name is: test redis
holy shit
```

### 任务优先级的分组指定

当然，还可以人为指定优先级分组：
```JavaScript
Base.extend({
  priorityName: {
    method: function () {},
    method2: function () {}
  }
});
```

`ES6`并不支持在`class`内部书写属性，但是可以使用`get`定义：
```JavaScript
class MyGenerator extends Base{

  constructor( ...args ) {
    super(...args);
  }

  get prompting(){
      return {
          double:function(){
              console.log('double kill');
          },
          triple:function(){
              console.log('triple kill');
          }
      };
  }

  method1() {
    console.log(`The name is: ${ this.appname }`);
  }

  default(){
      console.log(`holy shit`);
  }

  initializing(){
      console.log(`first blood`);
  }

} 
```
运行后的输出为：
```
first blood
double kill
triple kill
The name is: test redis
holy shit
```

## 异步任务

想要暂停`run loop`，直到某个异步任务完成，最简单的方式是返回一个`Promise`对象。
* 一旦此`Promise`对象 `resolves`，`run loop`就会继续
* 一旦此`Promise`对象失败，`run loop`则会抛出异常并终止

如果使用的`API`不支持`Promise`, 也可以使用遗留的`this.async()`。 

```JavaScript
asyncTask: function () {
  var done = this.async();

  getUserEmail(function (err, name) {
    done(err);
  });
}
```