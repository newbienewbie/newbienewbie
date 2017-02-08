const assert=require('assert');
const domain=require('../../lib/domain');


describe("测试domain",function(){
    this.timeout(3000);
    it("测试连接",function(done){
        domain.sequelize.authenticate()
            .then(()=>{
                console.log('authenticate passed');
                done();
            }).catch(e=>{
                assert.fail(e);
                done();
            });
    });
});