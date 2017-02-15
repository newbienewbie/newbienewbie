---
title: 百度地图 BMap 的 React 封装
date: 2017-02-15 17:50:04
tags:
- ECMAScript
- 百度地图
- BMap
- React
categories:
- 风语
- ECMAScript
- Misc
---

## 百度地图的常规使用

要使用百度地图`BMap`，需要引入一个入口脚本。根据加载`BMap`策略的不同，可以分为`同步`和`异步`两种方式。

### 同步式

同步式入口脚本的URL地址为：
```
http://api.map.baidu.com/api?v=2.0&ak=马赛克
```
返回的脚本内容类似于：
```JavaScript
(function(){ 
    window.BMap_loadScriptTime = (new Date).getTime(); 
    document.write('<script type="text/javascript" src="http://api.map.baidu.com/getscript?v=2.0&ak=${这里是马赛克}&services=&t=20170207140543"></script>');
})();
```
很明显，入口脚本会再创建一个`script`再远程请求服务端返回真正的核心脚本。当核心脚本加载完毕后，就可以调用百度地图`BMap`的相关`API`进行操作了。

来自[官方文档示例](http://lbsyun.baidu.com/index.php?title=jspopular/guide/helloworld)：
```HTML
<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
	<style type="text/css">
	body, html,#allmap {width: 100%;height: 100%;overflow: hidden;margin:0;font-family:"微软雅黑";}
	</style>
	<script type="text/javascript" src="http://api.map.baidu.com/api?v=2.0&ak=您的密钥"></script>
	<title>地图展示</title>
</head>
<body>
	<div id="allmap"></div>
</body>
</html>
<script type="text/javascript">
	// 百度地图API功能
	var map = new BMap.Map("allmap");    // 创建Map实例
	map.centerAndZoom(new BMap.Point(116.404, 39.915), 11);  // 初始化地图,设置中心点坐标和地图级别
	map.addControl(new BMap.MapTypeControl());   //添加地图类型控件
	map.setCurrentCity("北京");          // 设置地图显示的城市 此项是必须设置的
	map.enableScrollWheelZoom(true);     //开启鼠标滚轮缩放
</script>
```
`同步式`的缺点很明显，入口核心会继续创建一个核心脚本，核心脚本加载完毕后浏览器才会继续执行之后的相关代码。

### 异步式

由于`同步式`从而影响用户体验，百度地图还提供了`异步式`的接口，大致思路是在接口`URL`中指定一个回调函数，百度服务器返回相应脚本，当`BMap`完成加载后，再触发回调函数。

假设请求`URL`为：
```
http://api.map.baidu.com/api?v=2.0&ak=马赛克&callback=init
```
则百度返回的入口脚本类似于：
```JavaScript
(function(){ 
    window.BMap_loadScriptTime = (new Date).getTime(); 
    window.BMap=window.BMap||{};
    window.BMap.apiLoad=function(){
        delete window.BMap.apiLoad;
		//# 注意这里的回调函数
        if(typeof init=="function"){ init() }
	};
    var s=document.createElement('script');
    s.src='http://api.map.baidu.com/getscript?v=2.0&ak=马赛克&services=&t=20170207140543';
    document.body.appendChild(s);
})();
```
至于使用方式很明显了，这里是官方的使用示例：
```HTML
<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
	<meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
	<style type="text/css">
	body, html,#allmap {width: 100%;height: 100%;overflow: hidden;margin:0;font-family:"微软雅黑";}
	</style>
	<title>异步加载地图</title>
</head>
<body>
	<div id="allmap"></div>
</body>
</html>
<script type="text/javascript">
	//百度地图API功能
	function loadJScript() {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "http://api.map.baidu.com/api?v=2.0&ak=您的密钥&callback=init";
		document.body.appendChild(script);
	}
	function init() {
		var map = new BMap.Map("allmap");            // 创建Map实例
		var point = new BMap.Point(116.404, 39.915); // 创建点坐标
		map.centerAndZoom(point,15);                 
		map.enableScrollWheelZoom();                 //启用滚轮放大缩小
	}  
	window.onload = loadJScript;  //异步加载地图
</script>
```

## 百度地图的`React`封装思路

为什么要封装百度地图？原因是在使用`React`的`SPA`中，要使用`BMap`，每次都要手工引入百度地图的入口脚本`script`不够优雅；更关键的是，由于需要提前在视图文件中引入入口脚本，那么不管用户是否点开触发百度地图的路由，`SPA`都会主动加载`BMap`。

`React`封装`BMap`的思路比较简单，即
1. 在组件加载前先判断当前是否已经有入口文件，如果没有，则创建之。
2. 创建用于显示百度地图的容器
3. 在组件加载完毕后，检查当前BMap是否可用：如果不可用，等待一段时间后再检查；如果可用，创建`BMap.Map`实例
4. 调用事先准备好的回调函数。

然而这里有个坑是，必须采用百度的异步入口脚本.因为`React`异步创建了入口脚本`script`，如果入口脚本是同步式的，则会调用`document.write()`方法，很显然，这会触发错误。解决方法很简单，直接采用异步式的入口脚本，随便指定一个`callback`参数——比如叫`init`，则百度返回的回调代码类似于：
```
if(typeof init=="function"){ init() }
```
如果`init`不存在，就不会有任何副作用。而我们真正想要执行的回调函数则通过属性的方式传递给`React`封装的组件，并在合适的时候予以触发。

核心代码为：
```JavaScript
export const BMapComponent=React.createClass({

    getDefaultProps:function(){
        const ID=`itminus_bmap${parseInt(Math.random()*10000000)}`;
        return {
            ak:'',
            callback:function(map){},
            id:ID,
        };
    },

    componentWillMount(){
        // 注意callback=init参数不能去掉，因为这是百度地图异步加载的接口，
        // 否则，会因为React异步创建了script，百度返回的script中又调用document.write()，从而触发错误
        let bmapSrc=`http://api.map.baidu.com/api?v=2.0&ak=${this.props.ak}&callback=init`;
        if(typeof BMap !='undefined'){
            return;
        }else{
            let script=document.querySelector(`script[src='${bmapSrc}']`);
            if(!script){
                script= document.createElement("script");
                script.src = bmapSrc;
                document.body.appendChild(script);
            }
        }
    },

    componentDidMount(){
        function timeoutPromise(timeout){
            return new Promise(function(resolve,reject){
                setTimeout(function() {
                    resolve();
                }, timeout);
            });
        }
        function waitUntil(props){
            return new Promise(function(resolve,reject){
                const map=new BMap.Map(props.id);
                resolve(map);
            }).catch(err=>{
                console.log("there's no BMap yet. Waitting ...",err);
                return timeoutPromise(300).then(()=>{
                    return waitUntil(props);
                });
            });
        }
        waitUntil(this.props).then(map=>{
            console.log(`[+] bmap loaded`,map);
            this.props.callback(map);
        });
    },

    render:function(){ 
        return <div id={this.props.id}></div>;
    } 
});

export default BMapComponent;
```

使用的时候则非常简单：
```
export const Contact=React.createClass({
    render:function(){
        return (<div className="contact">
            <div className="feedback">
                <h1>FEEDBACK</h1>
                <form>
                </form>
            </div>
            <div className="map">
                <BMapComponent 
                    ak={"马赛克"}  
                    callback={(map)=>{
                        var point = new BMap.Point(116.404, 39.915);  // 创建点坐标  
                        var bs = map.getBounds();   //获取可视区域
                        var bssw = bs.getSouthWest();   //可视区域左下角
                        var bsne = bs.getNorthEast();   //可视区域右上角
                        map.centerAndZoom(point, 15);  
                    }}
                />
            </div>
        </div>);
    }
});
```
显示效果类似于：
{% asset_img "baidu_map_demo.jpg" "百度地图 BMap 的 React 封装" %}