const path=require('path');
const express=require('express');



const router=express.Router();
const SEARCH_ENGINE_VERIFY_PATH=path.join(__dirname,"..","..","..","search-engine-verify");
router.use("/",express.static(SEARCH_ENGINE_VERIFY_PATH));

module.exports=router;