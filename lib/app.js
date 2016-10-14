var path=require('path');
var express=require('express');

var app=express();

var HEXO_ROOT=path.join(__dirname,"..","hexo");
var HEXO_PUBLIC=path.join(HEXO_ROOT,"public");

app.use('/health',require('./router/health.js'));
app.use(express.static(HEXO_PUBLIC));



module.exports=app;