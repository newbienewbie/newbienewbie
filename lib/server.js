const http= require('http');
const app=require('./app.js');



const env= process.env;
const server = http.createServer(app);
// 如不加'0.0.0.0',在多网卡的服务器上，可能会无法监听合适的网段。
const ip=env.NODE_IP || '0.0.0.0';
const port=env.NODE_PORT || 3000;

server.listen(port,ip, function () {
  console.log(`Application worker ${process.pid} started on ${ip}:${port}...`);
});
