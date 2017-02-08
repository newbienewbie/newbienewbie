const wechat=require('wechat');
const WechatAPI=require('wechat-api');
const domain=require('../domain');
const {getMenuConfig}=require('./menu-config');
const {getCachedToken,cacheToken}=require('./access-token-access'); 

function retrieve(id=1){
    return domain.wechat.findOne({
        where:{id:id}
    });
}


function api(id=1){
    return retrieve(id=1).then(config=>{
        return new WechatAPI(config.appid,config.appsecret,getCachedToken,cacheToken);
    });
}


function genMiddleware(config){
    return wechat(config, function (req, res, next) {
        // 微信输入信息都在req.weixin上
        var message = req.weixin;
        
        // reply
        const reply={
            content: 'http://www.itminus.com',
            type: 'text'
        };
        res.reply(reply);
    });

}

function createMenu(){
    return Promise.all([api(),getMenuConfig()])
        .then(([api,config])=>{
            api.createMenu(config,function(err,result){
                if(err){ return Promise.reject(err);}
                else{ return Promise.resolve(result);}
            })
        }); 
}

module.exports={genMiddleware,retrieve,api,getMenuConfig,createMenu};