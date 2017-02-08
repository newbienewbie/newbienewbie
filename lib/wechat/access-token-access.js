const fs=require('fs');
const path=require('path');

const FILE_PATH=path.join('../../access_token.txt');

function getCachedToken (callback) {
    // 传入一个获取全局token的方法
    fs.readFile(FILE_PATH, 'utf8', function (err, txt) {
        if (err) {return callback(err);}
        callback(null, JSON.parse(txt));
    });
}

function cacheToken(token, callback) {
    // 请将token存储到全局，跨进程、跨机器级别的全局，比如写到数据库、redis等
    // 这样才能在cluster模式及多机情况下使用，以下为写入到文件的示例
    fs.writeFile(FILE_PATH, JSON.stringify(token), callback);
}


module.exports={getCachedToken,cacheToken};