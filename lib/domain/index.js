const Sequelize=require('sequelize');
const config=require('../config');


var database=config.database;
var sequelize=new Sequelize(
    database.dbname,
    database.username,
    database.password,
    {
        host:database.host,
        dialect:database.dialect,
        pool: {
            max: 5,
            min: 0,
            idle: 10000
        },
    }
);

var wechat=sequelize.import('./entity/wechat.js');


module.exports={
    sequelize,
    wechat,
};