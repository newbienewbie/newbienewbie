---
title: Fetch API 使用代理
date: 2016-11-01 15:17:59
tags:
- ECMAScript
- Node.js
- Fetch
categories:
- 风语
- ECMAScript
- 爬虫
---

关于`node-fetch`如何使用代理来发送请求，其官网文档只简单提示可以用`agent`进行代理：

```JavaScript
{
    method: 'GET'
    , headers: {}        // request header. format {a:'1'} or {b:['1','2','3']}
    , redirect: 'follow' // set to `manual` to extract redirect headers, `error` to reject redirect
    , follow: 20         // maximum redirect count. 0 to not follow redirect
    , timeout: 0         // req/res timeout in ms, it resets on redirect. 0 to disable (OS limit applies)
    , compress: true     // support gzip/deflate content encoding. false to disable
    , size: 0            // maximum response body size in bytes. 0 to disable
    , body: empty        // request body. can be a string, buffer, readable stream
    , agent: null        // http.Agent instance, allows custom proxy, certificate etc.
}
```

在`npm`上搜了下，貌似这个`http-proxy-agent`包还不错，提供了`http.Agent`的实现。恰好前两天有人问爬虫问题，顺手就找个免费的代理来测试下：

```JavaScript
const fetch=require('node-fetch');
const HttpProxyAgent = require('http-proxy-agent');
 
// HTTP/HTTPS proxy to connect to 
let proxy ='http://112.226.72.152:8888';
const agent = new HttpProxyAgent(proxy);

fetch('http://gs.amac.org.cn/amac-infodisc/api/pof/manager?page=0&size=20',{
    method:'POST',
    headers:{
        'content-type':'application/json',
        'referer':'http://gs.amac.org.cn/amac-infodisc/res/pof/manager/index.html',
        'user-agent':"Mozilla/5.0 (Windows NT 10.0; WOW64; rv:49.0) Gecko/20100101 Firefox/49.0",
    },
    body:JSON.stringify({}),
    agent:agent,
}).then(resp=>{
    return resp.json();
})
.then(info=>{
    console.log(info);
})
.catch(e=>{
    console.log(e);
});
```

顺利的拿到了结果:
```
{ content:                                                                                          
   [ 
        { 
            id: '138',                                                                                   
            managerName: '平安道远投资管理（上海）有限公司',                                             
            artificialPersonName: '杨晓华',                                                              
            // ...其他信息省略                                                      
            primaryInvestType: '证券投资基金' 
        },
        {
            id: '194',                                                                                   
            managerName: '上海重阳投资管理股份有限公司',                                                 
            artificialPersonName: '裘国根',                                                              
            // ...其他信息省略                                                      
        },           
        // ...其他信息省略
   ],
    totalPages: 899,                                                                                  
    totalElements: 17973,                                                                             
    last: false,                                                                                      
    numberOfElements: 20,                                                                             
    first: true,                                                                                      
    sort:                                                                                             
    [ { direction: 'ASC',                                                                            
        property: 'registerDate',                                                                    
        ignoreCase: false,                                                                           
        nullHandling: 'NATIVE',                                                                      
        ascending: true } ],                                                                         
    size: 20,                                                                                         
    number: 0 
} 
```

貌似效果还不错。看来这两天可以写个代理池来提供服务了。