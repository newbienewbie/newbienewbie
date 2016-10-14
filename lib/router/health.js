const express=require('express');



const router=express.Router();

router.use('/',(req,res)=>{
    res.writeHead(200);
    res.end();
});



module.exports=router;