const assert=require('assert');
const wechat=require('../../lib/wechat');


describe('测试wechat',function(){
    this.timeout(2000);
    it('测试#retieve()',function(){
        return wechat.retrieve(1).then(config=>{
            assert.equal(config.id,1);
            assert.ok(config.appid);
            assert.ok(config.appsecret);
            assert.ok(config.token);
            assert.ok(config.encodingAesKey);
        });
    });

    it('test #api()',function(){
        return wechat.api().then(api=>{
            const createMenu=api.createMenu;
            assert.ok(createMenu,"必定有此方法");
            assert.ok(createMenu instanceof Function,"必定是函数");
        });
    });

    it('test #createMenu()',function(){
        this.timeout(5000);
        return wechat.createMenu()
            .then(
                function(msg){
                    console.log(msg);
                },
                function(reason){
                    console.log(reason);
                    assert.fail(reason);
                }
            ).catch(err=>{
                console.log(err);
                assert.fail(err);
            });
    })


});