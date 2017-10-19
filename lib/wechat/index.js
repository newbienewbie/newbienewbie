const wechat=require('wechat');
const WechatAPI=require('wechat-api');
const domain=require('../domain');
const {getMenuConfig}=require('./menu-config');
const {getCachedToken,cacheToken}=require('./access-token-access'); 

var List = require('wechat').List;


const common={
    tianqi:function tianqi(req,res,next){
        // reply
        const reply={
            content: 'nice day:http://www.itminus.com',
            type: 'text',
        };
        res.reply(reply);
    },
    riqi:function riqi(req,res,next){
        const reply={
            content:'nice day2:http://www.itminus.com',
            type:'text',
        };
        res.reply(reply);
    },
};

List.add('help', [
  ['回复{a}查看', common.tianqi],
  ['回复{b}查看', common.riqi],
  ['回复{c}查看', '嗯']
]);

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

        if(message.Content=='help'){
            res.wait('help');
        }else{
            // reply
            const reply={
                content: 'http://www.itminus.com',
                type: 'text'
            };
            res.reply(reply);
        }
    });

}

function createMenu(){
    return Promise.all([api(),getMenuConfig()])
        .then(([api,config])=>{
            return new Promise(function(resolve,reject){
                api.createMenu(config,function(err,result){
                    if(err){ reject(err);}
                    else{ resolve(result); }
                });
            });
        }); 
}

module.exports={genMiddleware,retrieve,api,getMenuConfig,createMenu};