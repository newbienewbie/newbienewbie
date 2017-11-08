const path=require('path');
const config=require('../config');

function register(app){


    /////////////// session
    app.use('/',require('./session'));


    /////////////// pages

    // health api : originally requied by openshit
    app.use('/health',require('./misc/health.js'));

    // home page
    // app.use('/',require('./page/home.js'));
    // app.use('/about',require('./page/about'));

    // seo 
    app.use('/',require('./misc/search-engine'));

    // tool
    app.use('/tool',require('./tool'));

    return app;
}


module.exports={register};