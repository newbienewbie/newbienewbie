const config=require("../../config");
const session=require('express-session');
const mySqlSession = require('express-mysql-session');


let Store=mySqlSession(session);
let store=new Store({
    host:config.database.host,
    port:config.database.port,
    user:config.database.username,
    password:config.database.password,
    database:config.database.dbname
});



module.exports=store;