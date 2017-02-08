const config={
    "button":[
        {
            "name":"查询1",
            "sub_button":[
                {
                    "type":"click",
                    "name":"1-1",
                    "key":"k1_1"
                },
                {
                    "type":"click",
                    "name":"1-2",
                    "key":"k1_2"
                },
                {
                    "type":"click",
                    "name":"1-3",
                    "key":"k1_3"
                }
            ]
        },
        {
            "name":"查询2",
            "sub_button":[
                {
                    "type":"click",
                    "name":"2-1",
                    "key":"k2_1"
                },
                {
                    "type":"click",
                    "name":"2-2",
                    "key":"k2_2"
                },
                {
                    "type":"click",
                    "name":"2-3",
                    "key":"k2_3"
                },
                {
                    "type":"click",
                    "name":"2-4",
                    "key":"k2_4"
                }
            ]
        },
        {
            "type":"click",
            "name":"联系我们",
            "key":"contactus"
        }
    ]
};


// 为以后从其他地方（如数据库、网络）异步加载配置预留接口
function getMenuConfig(){
    return new Promise(function(resolve,reject){
        resolve(config);
    });
}

module.exports={getMenuConfig};