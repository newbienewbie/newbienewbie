const wechat=require('wechat');
const domain=require('../domain');

function retrieve(id=1){
    return domain.wechat.findOne({
        where:{id:id}
    });
}

function genMiddleware(config){
    return wechat(config, function (req, res, next) {
        // 微信输入信息都在req.weixin上
        var message = req.weixin;
        
        // reply
        const reply={
            content: 'text object',
            type: 'text'
        };
        res.reply(reply);
    });

}

module.exports={genMiddleware,retrieve};