const express=require('express');



const router=express.Router();
// OpenShift的健康验证
router.use('/',(req,res)=>{
    res.writeHead(200);
    res.end();
});



module.exports=router;