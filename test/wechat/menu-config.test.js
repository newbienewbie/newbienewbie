const assert=require('assert');
const {getMenuConfig}=require('../../lib/wechat/menu-config');


describe('test menu-config',function(){
    this.timeout(2000);

    it('test #getMenuConfig()',function(){
        return getMenuConfig()
            .then(config=>{
                assert.ok(config.button);
                assert.ok(Array.isArray(config.button) );
            })
    });
});