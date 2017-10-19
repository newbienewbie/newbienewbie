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
    }  
};