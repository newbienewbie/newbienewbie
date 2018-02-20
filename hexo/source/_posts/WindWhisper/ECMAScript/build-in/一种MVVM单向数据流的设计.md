---
title: 一种MVVM单向数据流组件的设计
date: 2018-02-20 15:07:13
tags:
- ECMAScript
- MVVM 
- React
categories:
- 风语
- ECMAScript
- build-in
---

`React.js`提供了一种非常好的思路：即提供数据到视图的自动映射，改变数据即可自动渲染出视图。本文就是讲述这种类库的设计与实现。

首先，我们需要定义需求：我们需要一个类（函数），提供`render()`方法供子类重写；提供`props`和`state`供组件使用，而且当改变`state`时，组件可以自动更新到`DOM`中。

据此，可以写出第0版的框架代码：
```javascript
class AbstractComponent{
    constructor(props,state){
        this.props=props;
        let _state=state;
    }

    _update(newElement){ }

    render(){ /* to be implemented by subclass */ }
}
```
<!--more-->

## 如何触发自动更新

要实现当`state`改变即自动更新视图，除了可以使用`Java`风格的`setState(state)`，还可以使用`Object.defineProperty()`函数定义描述符，由于后者具有`JavaScript`特色，这里直接使用后者来实现：
```javascript
class AbstractComponent{
    constructor(props,state){
        this.props=props;
        let _state=state;
        Object.defineProperty(this,'state',{
            get:function(){ return _state; },
            set:function(state){
                _state=state;
                const newElement=this.render();
                this._update(newElement);
            }
        });
    }
    // ...
}
```
这样，每次当对`state`属性赋值时，就会触发自动更新。

## 如何实现视图更新

现在的问题是，如何更新视图？浏览器提供了一系列`API`与`DOM`交互。为了更新`DOM`，我们可以在原来的位置插入新的`HTMLElement`，并且删掉原来的`HTMLElement`。显然，为了完成这种精准的操作，就需要组件实例记录其所对应的`HTMLElement`引用，一旦组件需要更新，即可根据引用原地插入新的、删除旧的，最后更新组件对其的引用即可：
```javascript

    _update(newElement){
        // 假设 我们有属性
        //     * container 记录当前组件实例所挂载到的容器元素
        //     * elementRef 记录当前DOM中与组件相对应的HTMLElement对象
        // 现在原地插入新的
        let el= this.container.insertBefore(newElement,this.elementRef);
        // 删除旧的
        if(!!this.elementRef) 
            this.container.removeChild(this.elementRef); 
        // 更新记录
        this.elementRef=el; 
    }
```
换个角度想，插入新的、删除旧的、并把新的引用更新到当前记录中的这一过程十分类似于缓存的思想：需要的时候可以从中快速读出；覆盖缓存，则会自动深入到底层去更新`DOM`。所以我们可以再进一步，把这块缓存逻辑封装起来：
```javascript
class AbstractComponent{
    constructor(props,state){
        // ...
        this.container=null;     // which HTMLElement the component is mounted at 
        let _elementCache=null;  // cache the responding element
        Object.defineProperty(this,'elementCache',{
            get:function(){ return _elementCache; },
            set:function(newElement){
                // update HTML Element DOM
                let el= this.container.insertBefore(newElement,this.elementCache);
                if(!!this.elementCache) this.container.removeChild(this.elementCache); 
                // update elementCache
                _elementCache=el; 
            }
        });
    }

    _update(newElement){
        this.elementCache=newElement;
    }
}
```
这样，当需要更新时，计算出新的`HTMLElement`，直接赋值记录到缓存上，即可自动更新视图。

### 如何挂载到容器元素

现在，我们如何将其挂载到一个具体的容器元素上？最简单的方式我们可以为组件类添加一个`#mount()`方法：
```javascript
    mount(htmlElement){ /* ... */ }
```
然后，采用`component.mount(el)`的语法进行挂载。所谓挂载，有两个工作：
* 让组件实例记录挂载到的容器引用
* 让组件实例渲染出HTMLElement，并更新视图

所以，`#mount(htmlElemnt)`方法的实现为:
```javascript
    mount(htmlElement){
        this.container=htmlElement;  // cache the container
        this._update();              // trigger initial update 
    }
```
这里，由于初始状态下并无`newElement`，为了让初始状态下该方法也可直接使用，需要在`_update()`中加入一些防御性代码：
```javascript
    _update(newElement){
        // if newElement is null
        if(!this.elementCache){ newElement=this.render(); }
        this.elementCache=newElement;
    }
```

### 初步框架与用例

至此，第一版的一个基本类库就算大致完成了，完整的代码如下：
```javascript
class AbstractComponent{
    constructor(props,state){
        this.props=props;
        this.container=null;  //which HTMLElement the component is mounted at 
        let _state=state;
        let _elementCache=null;
        Object.defineProperty(this,'state',{
            get:function(){ return _state; },
            set:function(state){
                _state=state;
                const newElement=this.render();
                this._update(newElement);
            }
        });
        Object.defineProperty(this,'elementCache',{
            get:function(){ return _elementCache; },
            set:function(newElement){
                // update HTML Element DOM
                let el= this.container.insertBefore(newElement,this.elementCache);
                if(!!this.elementCache) this.container.removeChild(this.elementCache); 
                // update elementCache
                _elementCache=el; 
            }
        });
    }

    _update(newElement){
        // if newElement is null
        if(!this.elementCache){ newElement=this.render(); }
        this.elementCache=newElement;
    }

    render(){ /* to be implemented by subclass */ }

    mount(htmlElement){
        this.container=htmlElement;  // cache the container
        this._update();              // trigger initial update 
    }
}
```
一个use case 为：
```javascript
class MyComponent extends AbstractComponent{
    constructor(props,state){
        super(props,state);
    }
    onClick(e){
        this.state={s:'fuck you all '+Math.random()};
    }
    render(){
        const s=` <div class='fuck'> ${this.state.s} </div> ` ;
        const wrapper=document.createElement('div');
        wrapper.innerHTML=s;
        const el=wrapper.querySelector('div');
        el.onclick=this.onClick.bind(this);
        return wrapper;
    }
}

let p={ f:"fuck", };
let s={ s:"shit", };
var c=new MyComponent(p,s);

const e=document.querySelector('#container');
c.mount(e);
```

## 事件

有经验的人肯定需要经常使用事件钩子，比如挂载完成后需要触发`ajax`请求之类。为了扩展我们的这个类库功能，我们为之添加两个事件钩子:
```javascript
class AbstractComponent{

    componentWillMount(){ /*to be implement by subclass*/ }
    componentDidMount(){ /*to be implement by subclass*/ }

    mount(htmlElement){
        this.componentWillMount();
        this.container=htmlElement;  // cache the container
        this._update();              // trigger initial update 
        this.componentDidMount();
    }
}
```