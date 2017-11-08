const express=require('express');



const router=express.Router();


router.use('/sample/:id',(req,res)=>{
    const {id}=req.params;
    const context={
        title:'配色工具',
        predefined_css_url:`/static/tool/peise/css/sample-${id}.css`,
    };
    res.render(`tool/peise/sample/sample-${id}.njk`,context);
});

router.use('/',(req,res)=>{
    const context={
        title:'配色工具',
    };
    res.render('tool/peise/index.njk',context);
});



module.exports=router;