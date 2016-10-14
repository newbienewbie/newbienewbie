var path=require('path');
var express=require('express');

var app=express();

var HEXO_ROOT=path.join(__dirname,"..","hexo");
var HEXO_PUBLIC=path.join(HEXO_ROOT,"public");


// required by openshift 
app.use('/health',require('./router/misc/health.js'));
// 百度站长工具
app.use('/',require('./router/misc/baidu-zhanzhang.js'));
// Hexo博客站
app.use("/",express.static(HEXO_PUBLIC));



module.exports=app;