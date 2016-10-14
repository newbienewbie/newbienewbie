const express=require('express');



const router=express.Router();

// 百度站长的验证文件
router.use("/baidu_verify_8PHqwgfgZ0.html",function(req,res){
    res.end("8PHqwgfgZ0");
});



module.exports=router;