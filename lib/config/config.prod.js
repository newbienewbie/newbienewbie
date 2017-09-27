module.exports={
    env:"prod",
    database: {
        dialect:'mysql',
        host:process.env.ITMINUS_MYSQL_DB_HOST,
        port:process.env.ITMINUS_MYSQL_DB_PORT,
        username:process.env.ITMINUS_MYSQL_DB_USERNAME,
        password:process.env.ITMINUS_MYSQL_DB_PASSWORD,
        dbname:process.env.ITMINUS_APP_NAME,
        charset:'utf-8',
    }  
};