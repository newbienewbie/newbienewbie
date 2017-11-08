const defaultConfig=require('./config.default.js');

const env=process.env.NODE_ENV=="production"?"prod":"dev";
const PATH=`./config.${env}.js`; 
const envConfig=require(PATH);
console.log(`正在读取当前配置(当前环境：'${env}')`);


const config=Object.assign({},defaultConfig,envConfig);
module.exports=config;