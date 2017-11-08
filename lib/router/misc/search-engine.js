const path=require('path');
const express=require('express');
const config=require('../../config');



const router=express.Router();

let sev=config.basePath.searchEngineVerify;
if(!Array.isArray(sev)){
    sev=[sev];
}

sev.forEach(p=>{
    router.use("/",express.static(p));
});

module.exports=router;