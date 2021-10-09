---
layout: post
title: 一种配合Express+React使用UEditor的方案(2)
date: 2017-10-17 11:21:01
tags:
- ECMAScript
- Node.js
- UEditor
- Express
- React
categories:
- 风语
- ECMAScript
- Misc
---

这是一种配合Express+React使用UEditor的方案的第(2)篇。

前文讲了如何在`Express`和`React`下使用`UEditor`的基本方案。这一篇博文详细说明如何使用`UEditor`的`React`封装。

### 安装

```
npm install simple-react-ui --save
```

### 使用

* 把`UEditor`相应的`assets`文件包放置在浏览器端可以访问的URL路径下，比如，`/static`
* 引入 `simple-react-ui` 的 `UEditor` 组件，提供相应的属性

`UEditor`提供两种模式供用户使用， *受控模式*  和 *非受控模式* 。 

## 非受控模式

在非受控模式下，用户主要通过
* `initialContent` 属性来提供初始值
* `afterInit(ue)` 回调函数来与 `UEditor` 互动，其中`ue`参数是`UE.getEditor('id')`返回的编辑器实例。

`afterInit(ue)`在某种程度上类似于原生`React`组件的`ref`回调，我们可以把`ue`传递给父组件，从而可以在父组件中来做任何`UEditor`可以做的事儿。

注意，用户不得指定`value`属性，否则会自动转换为 *受控模式*

<!-- more -->

### 示例一：以非受控模式使用

```js
<form id="postAddOrEditForm">
    <input name='title' type='text' placeholder='标题' 
        value={this.state.title||''} 
        onChange={(v)=>{ this.setState({title:v.target.value}); }}
    />

    <textarea required placeholder='摘要' 
        value={this.state.excerpt||''} 
        onChange={(v)=>{ this.setState({excerpt:v.target.value});}} 
    />

    <UEditor id="ueditorContainer" name="content" 
        initialContent={this.props.initialContent} 
        width={800} height={500} 
        afterInit={(ue)=>{
            const id=this.props.id;
            if(!!id){    // 编辑已有文章的表单
                // 获取最新的数据
                fetch(`/post/detail?id=${id}`,{/**/})
                .then(resp=>resp.json())
                .then(info=>{
                    const state=Object.assign({},info);
                    this.setState(state,()=>{
                        ue.setContent(info.content);
                    });
                });
            }else{ 
                // 这是一个用于新增文章的表单
            }
        }} 
    /> 
    <Button onClick={e=>{
        e.preventDefault();
        // ... ajax post to server
        return fetch('',{/**/})
            .then(resp=>resp.json())
            .then((info)=>{
                message.info(`创建文章成功！`);
                ue.setContent('');
            });
    }}>提交
    </Button>
</form>
```

## 受控模式

受控模式是更符合`React`理念使用方式。注意， *受控模式* 和 *非受控模式* 二者只居其一，不能共存。一旦提供`value`属性，则会被认为是受控模式，此时`initialContent`不再起作用。

在受控模式下，用户可以通过
* `value`属性：父组件可以通过`value`属性来动态设置编辑器的内容
* `onChange(content)` 事件处理函数，当编辑器的内容发生变化以`onChange(content)`的方式通知父组件

### 示例二：以受控模式使用

作为受控模式的示例，这里配合 `ant-design`的`Form.create()()` 使用：
```javascript
export class PlainAddOrEditForm extends React.Component{

    constructor(props){
        super(props);
        this.state= {
            title:'',
            categoryId:'',
            featureImageUrl:'#',
            keywords:[
                {id:null,postId:null,tag:''},
            ],
            commentable:true,
        };
    }

    render() {

        const FormItem=Form.Item;
        const {getFieldDecorator,getFieldsError, getFieldError, isFieldTouched,validateFields}=this.props.form;
        const hasFieldError=(fieldname)=>isFieldTouched(fieldname) && getFieldError(fieldname);
        const hasErrors=(fieldsError)=>Object.keys(fieldsError).some(field => fieldsError[field]);

        return (
            <Form onSubmit={e=>{
                e.preventDefault();
                validateFields((err, values) => {
                    if (!err) {
                        console.log(values);
                    }
                });
            }}>
                <FormItem label='标题' validateStatus={hasFieldError('title')} help={hasFieldError('title')||''} >
                {
                    getFieldDecorator('title',{
                        rules:[{required:true,message:'title required'}],
                    })(
                        <Input name='title' type='text' placeholder='标题'/>
                    )
                }
                </FormItem>
            
                <FormItem label='content' validateStatus={hasFieldError('content')} help={hasFieldError('content')||''} >
                {
                    getFieldDecorator('content',{
                        rules:[{required:true,message:'content required'}],
                        initialValue:'<p>测试</p><b>测试</b>'
                    })(
                        <UEditor id="ueditorContainer" 
                            width={800} height={500} 
                            uconfigSrc={"/url/to/uconfig.js"} ueditorSrc={"/url/to/ueditor.js"}
                            afterInit={(ue)=>{ this.ue=ue;}} 
                            onChange={content=>{ console.log(content); }}
                    /> 
                    )
                }
                </FormItem>
  
                <FormItem>
                    <Button htmlType='submit' type="primary" size="large" disabled={hasErrors(getFieldsError())}>Submit</Button>
                </FormItem>
            </Form>
        );
    }
}


export default Form.create()(PlainAddOrEditForm);
```
