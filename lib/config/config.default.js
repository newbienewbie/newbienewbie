const path=require('path');

const ROOT_PATH=path.join(__dirname,"../..");

module.exports={
    env:"dev",
    database: {
        dialect:'mysql',
        host:'localhost',
        port:3306,
        username:'username',
        password:'password',
        dbname:'dbname',
        charset:'utf-8',
    },
    session:{
        key:'your-session-key',
        secret:'your-session-secret',
    },
    basePath:{
        /**
         * hexo path
         */
        hexo: path.join(ROOT_PATH,"hexo"),
        /**
         * 模板路径列表
         */
        views:[
            path.join(ROOT_PATH,"frontend/views"),
        ],
        /**
         * 资源文件路径
         */
        assets:[
            path.join(ROOT_PATH,"frontend/static"),
        ],
        searchEngineVerify:[
            path.join(ROOT_PATH,"search-engine-verify"),
        ],
    }
};