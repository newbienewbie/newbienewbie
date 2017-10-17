---
title: 一种 Admin UI 设计思路——兼谈Admin UI的自动生成
date: 2017-10-08 19:34:51
tags:
- ECMAScript
- Node.js
- React
- AdminUI
categories:
- Misc
---

后台管理很多都是在简单的增删改查，本文讨论的就是如何自动生成增删改查的界面。

对于创建、修改工作，大部分时候我们都需要使用表单。一个普通的表单负责前端验证、简单错误提示，并将数据发送到后端。但是编写这样的代码并不愉快。
首先，创建表单和编辑表单在很大概率上是一样的，或者差异比较小的，起码验证逻辑、错误提示的规则配置是几乎一致的。其次，为每个模型都去编写创建界面/编辑界面/删除界面/查询界面，非常琐碎、耗时。
我们的目标就是要尽可能地少些代码，尽可能地多自动生成增删改查的管理界面。

## 从普通的视图组件说起

### PlainForm

必须只包含视图内容，不得含有任何远程交互代码，甚至不得含有任何远程交互的意图。必须提供 `initialValues` 属性，来设置初始值。

```js
// 一个纯粹的视图组件，将来可以用于新增或者编辑角色模型
class PlainAddOrEditForm extends React.Component{
    constructor(props){
        super(props);
    }

    render(){
        const {getFieldDecorator,getFieldsError, getFieldError, isFieldTouched,validateFields}=this.props.form;
        const hasFieldError=(fieldname)=>isFieldTouched(fieldname) && getFieldError(fieldname);
        const hasErrors=(fieldsError)=>Object.keys(fieldsError).some(field => fieldsError[field]);
        const FormItem=Form.Item;
        return (
        <Form >
            <FormItem label='角色名' validateStatus={hasFieldError('name')} help={hasFieldError('name')||''} >
            {
                getFieldDecorator('name',{
                    rules:[{required:true,message:'角色名必填'}],
                    initialValue:this.props.initialValues.name,
                })(
                    <Input placeholder='角色名' />
                )
            }
            </FormItem>
        
            <FormItem label='描述' validateStatus={hasFieldError('description')} help={hasFieldError('description')||''} >
            {
                getFieldDecorator('description',{
                    rules:[{required:true,message:'角色描述必填'}],
                    initialValue:this.props.initialValues.description,
                })(
                    <Input placeholder='description' />
                )
            }
            </FormItem>
        
        </Form>);
        
    }
}
```

<!-- more -->

### PlainViewComponent

`PlainForm`可以不经过嵌套直接使用(为了方便，将之表示为 `PlainForm组件` )。
我们大可以在其中加入`button`控制其提交，但是这会带来代码复用的问题。因为这相当于假定这个表单已经有了一个我们定义的提交按钮了。如果我们需要在对话框中显示这个表单，当点击对话框右下侧的取消按钮，我们希望什么也不做，关闭对话框；当我们单机对话框右下侧的确定按钮，表单会进行提交。这样我们就有了两个提交按钮，这无疑很扯蛋。

为了更好的代码复用，一个更好的办法是让`PlainForm`本身不包含提交或者取消这类控制指令的视图元素，而是`PlainForm`嵌套在其他组件中 (表示为`聚合PlainForm的纯视图组件`)。
一个最简单的例子是：
```js
class PlainAddOrEditFormWithSubmitButton extends React.Component{
    constructor(props){
        super(props);
    }
    render(){
        return <div>
            <PlainAddOrEditForm form={this.props.form} initialValues={this.props.initialValues}/>
            <Button htmlType="submit" type="primary" onClick={this.props.onOk}> 提交 </Button>
        </div>;
    }
}
```
在这里我们组合了一个新的组件，注意作为`PlainForm`的`PlainAddOrEditForm`组件并不含`button`元素。为了设置对用户点击提交按钮时的响应，我们添加了一个`Button`组件，然后将其`onClick`属性设置为由父组件传递的`props.onOk`。

为了表示方便，把`PlainForm`组件或者`聚合PlainForm的纯视图组件`统称为`PlainViewComponent`。

无论如何，`PlainViewComponent`都不应该包含任何的服务端交互意图；作为补偿，必须对外暴露这样几个`props`：
* initialValues : 设置初始值
* onOk : 钩子函数，作为提交表单时触发的 callback 
* onCancel : 钩子函数，作为取消表单时触发的 callback 

### 表单验证、错误提示

既然`PlainViewComponent`只负责显示，那么如何控制其表单验证逻辑、错误提示呢？
这块工作可以剥离出来，我们可以根据`PlainViewComponent`和相应的字段验证规则、错误提示等配置信息，自动生成一个包装组件。最后利用包装组件对表单进行验证、错误提示、提取当前值。

所幸这块工作已经有人替我们想到了，由 `antd.Form.create()(PlainViewComponent)`可以完成这种工作。包装生成的新组件，会被注入`form`属性。从而可以控制表单的验证、错误显示和提取当前值操作。

为了方便，把表示为这种经过包装的组件称之为`DecoratedFormComponent`

## 用于创建模型的表单

既然已经有了以上`PlainViewComponent`机制，让我们先来编写一个用于创建模型的表单来热热身：

假设我们有:
* 一个`model`定义，其中`model.methods.create()`方法定义了如何与服务器交互创建一个新的模型对象。
* 一个经过包装的`DecoratedFormComponent`表单组件`AddOrEditForm`。

则一个跟远程服务器通讯的的用于添加模型的表单，可以写成这种形式：
```js
class AddForm extends React.Component{
    constructor(props){
        super(props);
        this.formRef=null;
    }

    onOk(){
        return this.formRef.validateFields((err,value)=>{
            if(!err){
                model.methods.create(value)
                    .then(resp=>{
                        message.success(`创建成功`);
                        this.formRef.resetFields();
                    })
                    .catch(e=>{
                        message.error(`失败`+e);
                    });
            }
        });
    }

    render() {
        return <AddOrEditForm ref={form=>this.formRef=form} onOk={this.onOk} /> ;
    }
}
```

看起来很傻对不对？绕了一大圈，却只是为了一个用于创建模型的表单，为什么要这么麻烦？

但是仔细观察上面这段代码，我们会发现，我们编写的这个组件除了依赖`model`和`DecoratedFormComponent`，其他完全都是样板代码！所以，根据`DRY`原则，我们可以编写这样一个函数：
```js
(model,AddOrEditForm)=>AddComponent
```
以后只要针对具体的模型提供`model`定义、和`AddOrEditForm`即可动态生成表单。为了方便，我们还可以编写一个用于创建默认的`AddOrEditForm`的函数：
```js
createDecoratedAddOrEditForm(PlainAddOrEditForm) => DecoratedFormComponent
```
这样，就可以利用`PlainAddOrEditForm`创建一个`DecoratedFormComponent`，再加上一个`model`定义，我们就可以自动生成最终的添加模型的表单。

## Datagrid

有了上面的思路，我们可以轻而易举封装出一个通用的`Datagrid`组件，其基本功能包括：
* 列表显示
* 每行最后一列可以针对当前行执行相应操作
    * 删除当前行记录 ：有对话框确认
    * 修改当前行记录 ：保持页面不跳转，弹出对话框，编辑当前行记录
* 带分页功能

此外，还可以添加排序、筛选功能。

```js
class List extends React.Component{

    constructor(props){
        super(props);
        this.state={
            data:[],                   // 当前数据源
            pagination:{},             // 当前分页
            loading:true,              // 表格是否正在加载，用于控制动画
            currentRecord:{},          // 执行操作时的当前行记录
            editModalVisible:false,    // 编辑表单是否可见
        };
        // 对 编辑表单组件 的引用
        this.editForm=null;
        // bind `this`
        this.onTableChange=this.onTableChange.bind(this);
        this.onRemove=this.onRemove.bind(this);
        this.onEditFormSubmit=this.onEditFormSubmit.bind(this);
        this.onEditFormCancel=this.onEditFormCancel.bind(this);
    }

    /**
     * 当表单发生分页变化、过滤器变化、或者排序器变化时，应该从服务器重新加载数据
     * @param {*} pagination 
     * @param {*} filters 
     * @param {*} sorter 
     */
    onTableChange(pagination, filters={}, sorter={}) {
        const {pageSize,current}=pagination;
        return model.methods.list(current,pageSize /* ,condition */)
            .then(result=>{
                const {count,rows}=result;
                const pagination = Object.assign({}, this.state.pagination );
                pagination.total = count;
                this.setState({ loading: false, data: rows, pagination, });
            });
    }

    onRemove(record){
        return model.methods.remove(record.id)
            .then(resp=>{
                console.log(resp);
                message.warning('删除成功');
            })
            // 刷新数据源
            .then(_=>{
                return this.onTableChange(this.state.pagination);
            });
    }

    onEditFormSubmit(){
        return this.editForm.validateFields((err,values)=>{
            if(!err){
                const {id}=this.state.currentRecord;
                model.methods.update(id,values)
                    .then(resp=>{
                        message.success(`修改成功`);
                        console.log(resp);
                        this.setState({editModalVisible:false},()=>{
                            // 刷新数据源
                            this.onTableChange(this.state.pagination);
                        });
                    })
            }
        });
        
    }

    onEditFormCancel(){
        this.setState({editModalVisible:false});
    }

    componentDidMount(){
        this.setState({loading:true},()=>{
            return this.onTableChange(this.state.pagination);
        });
    }
    render() {
        const {Column,ColumnGroup}=Table;
        const fields=model.fields;
        return (<div>
        <Table dataSource={this.state.data} pagination={this.state.pagination} loading={this.state.loading} onChange={this.onTableChange} >
            { Object.keys(fields).map(k=>{
                const field=fields[k];
                return <Column title={field.title} key={k} dataIndex={k} />;
            }) }
            <Column title='操作' key='action' render={(text, record) => (
                <span>
                    <a onClick={()=>{this.setState({editModalVisible:true,currentRecord:record});return false; }} >修改</a>
                    <span className='ant-divider' />
                    <Popconfirm title='确认要删除吗' okText='是' cancelText='否' onConfirm={() => { this.onRemove(record); }} >
                        <a href='#'>删除</a>
                    </Popconfirm>
                    <span className='ant-divider' />
                </span>)} />
        </Table>

        <AddOrEditFormModal ref={form=>this.editForm=form} visible={this.state.editModalVisible}
            initialValues={this.state.currentRecord}
            onOk={this.onEditFormSubmit}
            onCancel={this.onEditFormCancel}
        />

    </div>);
    }
}
```

在这里，基于和上面同样的设想，我们把变化的部分提取到了`model`和`AddOrEditFormModal`这个`DecoratedFormComponent`中，从而可以创建这样形式的`API`：
```js
(model,AddOrEditFormModal)=> DatagridComponent;
```
为各种模型自动生成一个`Datagrid`组件。为了方便，我们还可以编写一个用于创建默认的`AddOrEditForm`的函数：
```js
createDecoratedAddOrEditForm(PlainAddOrEditForm) => DecoratedFormComponent
```
这样，就可以利用`PlainAddOrEditForm`创建一个`DecoratedFormComponent`，再加上一个`model`定义，我们就可以自动生成最终的模型`Datagrid`组件。

## Admin UI 的自动生成

为了方便，我们可以设计一个通用的`tiny-admin`模块，其基本结构为：

```js

// 默认提供的 DecoratedFormComponent 对象，有两个工厂函数，用于创建普通AddOrEdit表单、和带Modal表单
export const defaultDecoratedForm={

    createDecoratedAddOrEditForm:function(PlainAddOrEditForm){/**/},

    createDecoratedAddOrEditFormModal:function(PlainAddOrEditForm){/**/},  
};



export function addform(model,AddOrEditForm){/**/},

export function datagrid(model,AddOrEditFormModal){/**/ },
```

然后针对具体的模型编写`model`和`PlainAddOrEditForm`就可以自动生成后台了。


## 示例

比如对于一个角色模型，有角色名、和描述两个字段。

`PlainAddOrEditForm`定义为：
```js

class PlainAddOrEditForm extends React.Component{
    constructor(props){
        super(props);
    }


    render(){
        const {getFieldDecorator,getFieldsError, getFieldError, isFieldTouched,validateFields}=this.props.form;
        const hasFieldError=(fieldname)=>isFieldTouched(fieldname) && getFieldError(fieldname);
        const hasErrors=(fieldsError)=>Object.keys(fieldsError).some(field => fieldsError[field]);
        const FormItem=Form.Item;
        return (
        <Form >
            <FormItem label='角色名' validateStatus={hasFieldError('name')} help={hasFieldError('name')||''} >
            {
                getFieldDecorator('name',{
                    rules:[{required:true,message:'角色名必填'}],
                    initialValue:this.props.initialValues.name,
                })(
                    <Input placeholder='角色名' />
                )
            }
            </FormItem>
        
            <FormItem label='描述' validateStatus={hasFieldError('description')} help={hasFieldError('description')||''} >
            {
                getFieldDecorator('description',{
                    rules:[{required:true,message:'角色描述必填'}],
                    initialValue:this.props.initialValues.description,
                })(
                    <Input placeholder='description' />
                )
            }
            </FormItem>
        
        </Form>);
        
    }
}

```

相应的`model`定义为：
```js
const model={
    name:"role",
    fields:{
        "name":{
            title:'角色名',
        },
        "description":{
            title:"角色描述",
        },
    },
    methods:{
        create:function(record){
            const {name,description}=record;
            return createRole(name,description);
        },
        remove:removeRole,
        update:function(id,record){
            const{name,description}=record;
            return updateRole(id,name,description);
        },
        list:listRoles,
    }
};
```

生成一个用于创建角色的表单：
```js
const AddOrEditForm=defaultDecoratedForm.createDecoratedAddOrEditForm(PlainAddOrEditForm);
const AddForm=addform(model,AddOrEditForm);
```

生成一个用于管理角色的`Datagrid`：
```js
const AddOrEditFormModal=defaultDecoratedForm.createDecoratedAddOrEditFormModal(PlainAddOrEditForm);
const DG=datagrid(model,AddOrEditFormModal);
```

## 主从式二级联动表单demo

{% asset_img "datagrid_admin_demo.gif" "datagrid admin demo" %}

