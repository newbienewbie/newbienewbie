---
title: 一种MVVM单向数据流的设计2:—也许不需要React.js
date: 2018-02-23 08:45:02
tags:
- ECMAScript
- MVVM 
- React
categories:
- 风语
- ECMAScript
- build-in
---
在上一篇 [《一种MVVM单向数据流组件的设计》](http://www.itminus.com/blog/2018/02/20/WindWhisper/ECMAScript/build-in/%E4%B8%80%E7%A7%8DMVVM%E5%8D%95%E5%90%91%E6%95%B0%E6%8D%AE%E6%B5%81%E7%9A%84%E8%AE%BE%E8%AE%A1/) 中，我实现了一种单向数据流模式：每当数据发生变化，就可以自动渲染出新的视图。大致上，这是一种仿`React.js`的简单玩具。现在的问题是，和`React.js`一样，它并不利于`SEO`。我个人十分喜欢`React.js`，也在单位的项目中中引入了这货，而且就跟着了魔一样，这一年来，只要有的选，必然是先引入`React.js`。但是有时候，我也隐隐觉得不对劲，难道离开了`React.js`我就写不成代码了？如果问题没那么复杂，为什么还要强迫自己背上这么重的壳？我开始审视自己，之所以需要`React.js`，是从内心觉得有以下几个优点：
1. 单项数据流完成数据到视图的映射
2. 无侵入式，没有强制使用其他一揽子方案。甚至不需要`Redux`。
2. `JSX`语法：得益于`XML`强大描述能力和`JavaScript`语言，这让定义界面变得十分便利
3. 组件式编程：可以嵌套、组合，天然符合人类思维；各组件可以独立开发。
4. 有了良好的生态，使用经过社区检验的组件非常方便，比如阿里出的`antd`库。

然而，如果界面没那么复杂，我们真的需要`React.js`吗？对于第1点，我们是需要的，相对于每次直接操作`DOM`，这是思想性的转变；至于剩余的几点，对于简单的页面组件，似乎吸引力并不大。

## 一个Tab组件例子

我决定裸写一个`Tab`组件试试，并不引入`React.js`，但是要用单向数据流的思想，尽量遵从`KISS`原则(`Keep It Simple and Stupid`)。既然要考虑`SEO`，那么就应该减少前端组件的动态生成。所以，先按照传统的思路，提供`HTML`片段，再引入一段`JavaScript`代码来根据状态自动改变视图(而非向前一篇文章那样自动渲染视图)。<!--more-->

首先，跟上篇文章一样，我们利用`Object.defineProperty()`来定义`state`属性，以实现当赋值时自动更新：
```javascript
class SimpleComponent{
    constructor(props,state){
        let _state=null;
        Object.defineProperty(this,'state',{
            get:function(){return _state;},
            set:function(state){
                this.update(state);
                _state=state;
            }
        });
    }
    update(state){ /* to be implemented by subclass */ }
}
```
这里，`#update(state)`方法留待子类实现如何根据状态更新视图。对于一个`Tab`组件，`HTML`部分为：
```html
<div id="c">
    <div class="tab">
        <ul>
            <li>第一</li>
            <li>第二</li>
            <li>第三</li>
        </ul>
    </div>
    <div class="content">
        <div>
            <ul>
                <li>111 </li>
                <li>111 </li>
                <li>111 </li>
            </ul>
        </div>
        <div>
            <ul>
                <li>222</li>
                <li>222</li>
                <li>222</li>
            </ul>
        </div>
        <div>
            <ul>
                <li>333</li>
                <li>333</li>
                <li>333</li>
            </ul>
        </div>
    </div>
</div>
```
给出一个样式:
```scss
#c{
    width: 400px;
    margin: 0 auto;
    .tab{
        border:1px solid gray;
        ul{
            display: flex;
            flex-direction: row;
            list-style-type: none;
            margin:0;
            padding-left:0;
            li{
                padding-right:2em;
                background-color: black;
                color: white;
                border: 2px solid gray;
                &:hover{
                    cursor: pointer;
                }
            }
            li.current{
                background-color: gray;
                border: 2px solid red;
                border-bottom: none;
            }
        }
    }
    .content{
        border:1px solid gray;
    }
}
```
现在，让我们思考下如何设计这个`Tab`的逻辑部分。一个`Tab`组件，只有一个状态变量：即当前激活了哪个标签页？显然，可以用一个`current`来存储激活标签页的索引。故其状态`state`的形状类似于：
```javascript
{
    current:0,
}
```
每个标签都有一个`onclick`事件，当点击时，即改变`state`，从而触发自动更新(`#update()`)。
```javascript
tab.onclick=(e)=>{
    this.state={ current:idx, };
};
```
而所谓`#update`，其实就是根据`state.current`修改`DOM`：
```javascript
class MyComponent extends SimpleComponent{
    constructor(props,state){
        super(props,state);
        this.container=document.querySelector("#c");
        this.liArray=this.container.querySelectorAll(".tab ul li");
        this.contents=this.container.querySelectorAll(".content >div");

        this.liArray.forEach((i,idx)=>{
            i.onclick=(e)=>{
                this.state={
                    current:idx,
                };
            };
        })
        this.state=state;
    }
    update(state){
        console.log(`update`,state, this.state );
        this.liArray.forEach((i,idx)=>{
            if(state.current==idx){
                i.className="current";
                this.contents[idx].style.display="block";
            }else{
                i.className="";
                this.contents[idx].style.display="none";
            }
        })
    }
}
```
最后，实例化之：
```
const m=new MyComponent({},{current:0});
u.update();
```
效果:
<script async src="//jsfiddle.net/itminus/22mnvfpc/embed/"></script>

虽然还有操作`DOM`的代码，但是这不影响什么，`DOM`操作并不是妖魔：从整体来看，`DOM`操作只局限于特定方法内部，外部组件、或者组件自身只要对组件的`state`赋值，就会自动触发组件的视图更新。至于`DOM`操作本身，和传统情况下使用`jQuery`完全类似，最大的区别在于这里只使用了原生API，并引入了单向流思想，然后把`DOM`操作局限在了特定方法内部，提倡用状态数据的改变来自动修改视图，仅此而已。

## 一个年历组件的例子

这里再写一个年历组件作为例子。
```html
<div id="container">
    <div class="calendar">
        <ul>
            <li>1月</li>
            <li>2月</li>
            <li>3月</li>
            <li>4月</li>
            <li>5月</li>
            <li>6月</li>
            <li>7月</li>
            <li>8月</li>
            <li>9月</li>
            <li>10月</li>
            <li>11月</li>
            <li>12月</li>
        </ul>
    </div>
    <div class="message">
        <h2></h2>
        <p></p>
    </div>
</div>
```
基本样式：
```scss
#container{
    width: 300px;
    margin: 0 auto;
    background:rgb(255, 249, 249);
    padding:1em;

    *{
        box-sizing: border-box;
    }

    .calendar{
        ul{
            color: rebeccapurple;
            display: flex;
            flex-direction: row;
            flex-wrap: wrap ;
            list-style-type: none;
            padding-left:0 ;
            li{
                cursor: pointer;
                border:1px solid gainsboro;
                flex: 0 0 33.333%;
                height: 4em;
                line-height: 4em;
                text-align: center;
                &:hover{
                    background: gray;
                    color:orange;
                }
            }
        }

    }
    .message{

    }
}
```
相关`JavaScript`代码为:
```javascript
class MyCalendar extends SimpleComponent{
    constructor(props,state){
        super(props,state);
        this.container=document.querySelector("#container");
        this.liArray=this.container.querySelectorAll(".calendar li");
        this.content=this.container.querySelector(".message");
        this._init();
        this.state=state;
    }

    _init(){
        this.liArray.forEach((i,idx)=>{
            i.onmouseover=(e)=>{
                this.state={
                    current:idx,
                    message:this._getMessage(idx),
                };
            };
        })
    }

    _getMessage(idx){
        let msg='';
        switch (idx) {
            case 0:
                msg='元旦佳节：一年之计在于春';
                break;
            case 1:
                msg='春节：过年七天乐';
                break;
            case 2:
                msg='三八妇女节、植树节：关心地球，关心女士';
                break;
            case 3:
                msg='愚人节：清明谷雨采茶忙';
                break;
            case 4:
                msg='劳动节：劳动创造财富';
                break;
            case 5:
                msg='儿童节：关心下一代';
                break;
            case 6:
                msg='自hi节';
                break;
            case 7:
                msg='七夕节：花式虐狗';
                break;
            case 8:
                msg='中秋节：继续花式虐狗';
                break;
            case 9:
                msg='国庆节：全民花式虐狗';
                break;
            case 10:
                msg='双十一：资本家的狂欢';
                break;
            case 11:
                msg='圣诞节、双十二：资本家继续狂欢';
                break;
            default:
                break;
        }
        return msg;
    }

    update(state){
        this.liArray.forEach((i,idx)=>{
            if(state.current==idx){
                i.className="current";
            }else{
                i.className="";
            }
        })
        this.content.querySelector('h2').innerHTML=`${state.current+1}月`;
        this.content.querySelector('p').innerHTML=this._getMessage(state.current);
    }
}
```
在线示例：
<script async src="//jsfiddle.net/itminus/1c83vpkb/7/embed/"></script>

## 一个日历组件的例子

现在再实现一个稍微复杂一点点的日历组件，日期横向排列，从左往右代表星期天、星期一、星期二、...、星期六，然后折行往复。可以根据上部时间输入框定位日期，一旦输入的日期变化，下部的的日期重新渲染。`HTML`标记为：
```html
<div id="container">
    <div class="calendar-header">
        <input type="date"/>
    </div>
    <div class="calendar-body">
        <table>
            <thead>
                <th>日</th>
                <th>一</th>
                <th>二</th>
                <th>三</th>
                <th>四</th>
                <th>五</th>
                <th>六</th>
            </thead>
            <tbody>
            </tbody>
        </table>
    </div>
</div>
```
为了获取日期所在月份的第一天和最后一天信息，先编写如下的辅助函数：
```javascript
function daysRangeOfMonth(d){
    const year= d.getFullYear();
    const month=d.getMonth();
    const date=d.getDate();
    const day=d.getDay();

    const lastDateOfCurrentMonth=new Date(year,month,date);
    const l_month=lastDateOfCurrentMonth.getMonth();
    lastDateOfCurrentMonth.setMonth(l_month+1);
    lastDateOfCurrentMonth.setDate(0);

    const firstDayOfCurrentMonth=new Date(year,month,1);

    return {
        firstDayOfCurrentMonth,
        lastDateOfCurrentMonth,
    };
}
```
然后实现一个日历类：
```javascript
class MyCalendar extends SimpleComponent{
    constructor(props,state={current:new Date()}){
        super(props,state);
        this.container=document.querySelector("#container");
        this.calendarHeader=this.container.querySelector('.calendar-header');
        this.calendarInput=this.calendarHeader.querySelector('input');
        this.calendarBody=this.container.querySelector('.calendar-body');
        this.calendarMain=this.container.querySelector('.calendar-body table tbody');
        this._init();
        this.state=state;
    }

    _init(){
        this.calendarInput.onchange=v=>{
            console.log(v.target.value);
            this.state={
                current:new Date(v.target.value)
            };
        };
        this.calendarMain.onclick=(e)=>{
            const date=e.target.innerText;
            const c_year=this.state.current.getFullYear();
            const c_month=this.state.current.getMonth();
            alert(`${c_year}-${c_month+1}-${date}`);
        };
    }

    update(state){
        if(!state){state=this.state;}
        const d=state.current;
        const year= d.getFullYear();
        const month=d.getMonth();
        const date=d.getDate();
        const day=d.getDay();
        console.log(month,date,day);

        const dr=daysRangeOfMonth(d);
        const f_day=dr.firstDayOfCurrentMonth.getDay(); // 星期几
        const l_day=dr.lastDateOfCurrentMonth.getDay(); // 星期几
        const l_date=dr.lastDateOfCurrentMonth.getDate();// 每个月的第几天
        let s=[];
        // 填充首部的空白期
        for(let i=0;i<f_day;i++){ s.push(`<td></td>`); }
        // 填充中部日期
        for(let i=1;i<=l_date;i++){ s.push(`<td>${i}</td>`); }
        // 填充尾部的空白期
        for(let i=l_day+1;i<7;i++){ s.push(`<td></td>`); }
        let x='';
        for(let i=0,j=0;i<s.length;i++,j++){
            if(j%7==0){
                if(i==0 ) {x+="<tr>"}
                else if(i==s.length-1){ x+='</tr>'; }
                else { x+='</tr><tr>'; };
            }
            x+=s[i];
        }
        this.calendarMain.innerHTML=x;
    }
}
```
最后，在线示例：
<script async src="//jsfiddle.net/itminus/0qf9Lwj6/3/embed/"></script>