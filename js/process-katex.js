 // 处理形如 <code>$E=mc^2$</code> 形式的公式
 var inlineMathNodes=document.querySelectorAll('code');
 var re=/^\$(.*)\$$/;
 for(var j=0;j<inlineMathNodes.length;j++){
   var result=re.exec(inlineMathNodes.item(j).innerText);
   if(result!==null){
	 katex.render(result[1], inlineMathNodes.item(j));
   }
 }
 function removeNode(node){
   if(node.remove){
	 node.remove();
   }else{
	 return first.parentNode.removeChild(node);
   }
 };

 // 查找所有 pre code.language-math 节点 以备筛出数据公式
 var nodes=document.querySelectorAll("pre code.language-math");
 for(var i=0;i<nodes.length;i++){
   var node=nodes.item(i);
   // 魔术标记所在行 
   try{
	 var lines = node.innerText.split('\n');
	 if((!!lines) && lines.length > 0)
	 {
	   var first = lines[0];
	   if(first.trim().match(/%%(\s?)*KaTeX(\s?)*/i)){
		 var views = "";
		 // 逐行渲染
		 for(var k=1; k <lines.length; k++){
			 var f=lines[k];
			 views += katex.renderToString(f);
		 }
		 // 消除父级嵌套 
		 try{
		   node.innerHTML=views;
		 }catch(e){
		   // IE9 don't support the method of assignning value to tr.innerHTML. Maybe the code below will be removed in the future
		   console.log('IE9 sucks',e);
		   $(tr).html(node.innerHTML);
		 }
	   }
	 }
   }
   catch(err){
	 console.log(err)
   }
 }