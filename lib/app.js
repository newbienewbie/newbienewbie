var path=require('path');
var express=require('express');
const session=require('./service/session');
const {retrieve,genMiddleware,api,getMenuConfig}=require('./wechat');

var app=express();

var HEXO_ROOT=path.join(__dirname,"..","hexo");
var HEXO_PUBLIC=path.join(HEXO_ROOT,"public");

// session
app.use('/',session);
// required by openshift 
app.use('/health',require('./router/misc/health.js'));
// 百度站长工具
app.use('/',require('./router/misc/search-engine.js'));

// wechat 被动接口
retrieve(1).then(config=>{
    const fn=genMiddleware(config);
    app.use('/wechat',fn);
});

// Hexo博客站
app.use("/",express.static(HEXO_PUBLIC));



module.exports=app;