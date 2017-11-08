const path=require('path');
const http=require('http');
const express=require('express');
const nunjucks=require('nunjucks');
const moment=require('moment');
const compression = require('compression');
const {retrieve,genMiddleware,api,getMenuConfig}=require('./wechat');
const config=require('./config');
const {register}=require('./router');



class Skeleton{

    constructor(){
        this.config=config;
        this.app=express();
        this.staticHandle=express.static;
        this.configureViews();
    }

    /**
     * 配置模板
     */
    configureViews(){
        const app=this.app;
        const basePath=this.config.basePath
        let env =nunjucks.configure(basePath.views,{
            noCache:this.config.env=="prod"?false:true,
            express:app,
            autoescape:true,
        });
        env.addGlobal('moment',moment);
    }    
    
    beforeRun(){

        const app=this.app;
        const basePath=this.config.basePath

        app.use(compression());

        this.serveStaticFiles();

        //  new blog url
        const BLOG_PUBLIC_PATH=path.join(basePath.hexo,"public");
        // legacy : will be removed in the future :Hexo博客站
        app.use("/",express.static(BLOG_PUBLIC_PATH));
        // migrate the hexo blog url from '/' to '/url'
        app.use("/blog",this.staticHandle(BLOG_PUBLIC_PATH));

        // wechat 被动接口
        return retrieve(1).then(config=>{
            const fn=genMiddleware(config);
            app.use('/wechat',fn);
        });

    }

    serveStaticFiles(){
        const app=this.app;
        const basePath=this.config.basePath

        // 主站的静态文件，如css、js、html等
        basePath.assets.forEach(p=>{
            app.use('/static',this.staticHandle(p));
        });
    }


    /**
     * hook
     * @param {httpServer} server 
     * @param {Number} port 
     * @param {String} ip 
     */
    afterRun(server,port,ip){
        console.log(`Application worker ${process.pid} started on ${ip}:${port}...`);
    }


    /**
     * start the web server
     */
    run(){
        this.beforeRun();
        register(this.app);
        const env= process.env;
        const server = http.createServer(this.app);
        // 如不加'0.0.0.0',在多网卡的服务器上，可能会无法监听合适的网段。
        const ip=env.NODE_IP || '0.0.0.0';
        const port=env.NODE_PORT || 3000;
        
        server.listen(port,ip, ()=>{
            this.afterRun(server,port,ip);
        });
    }

}




module.exports={Skeleton};