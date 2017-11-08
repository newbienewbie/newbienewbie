const config=require("../../config");
const session=require('express-session');
const sessionStore=require('./session-store.js');


const sessMiddleware=session({
     key: config.session.key,
     secret:config.session.secret,
     store:sessionStore,
     resave: false,
     saveUninitialized: true,
});



module.exports=sessMiddleware;
