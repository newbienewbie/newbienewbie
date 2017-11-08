const express=require('express');
const peise=require('./peise');


const router=express.Router();

router.use('/peise',peise);



module.exports=router;