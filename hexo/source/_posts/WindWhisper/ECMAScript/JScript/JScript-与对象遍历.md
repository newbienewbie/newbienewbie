---
title: JScript 与对象遍历
date: 2017-01-24 23:26:10
tags:
- ECMAScript
- JScript
categories:
- 风语
- ECMAScript
- JScript
---

有些`COM`集合，本身就支持按索引访问元素，比如：
```JavaScript
var app=new ActiveXObject("Excel.Application");
var fso=new ActiveXObject('Scripting.FileSystemObject');

var excelFile=fso.GetFile("./生产管理专业业务对接表单（1.20）.xlsx");
var book=app.Workbooks.Open(excelFile);
app.Visible=true;

var sheet=book.Worksheets(1);
var list=[];
for(var i=1;i<=book.Worksheets.Count;i++){
    var item=book.Worksheets.Item(i);
    list.push(item.Name);
}
WScript.Echo(list);
book.Close();
```
对于这类集合，我们可以循环使用`Item(i)`的方式，遍历其元素。

然而，还有某些`COM`集合，并不支持按索引访问元素。要使用`JScript`遍历这种集合，需要借助于`Enumerator`接口。枚举器(`Enumerator`)定义可以用`TypeScript`表示如下：

```TypeScript
/**
 * Allows enumerating over a COM collection, which may not have indexed item access.
 */
interface Enumerator<T> {
    /**
     * Returns true if the current item is the last one in the collection, or the collection is empty,
     * or the current item is undefined.
     */
    atEnd(): boolean;

    /**
     * Returns the current item in the collection
     */
    item(): T;

    /**
     * Resets the current item in the collection to the first item. If there are no items in the collection,
     * the current item is set to undefined.
     */
    moveFirst(): void;

    /**
     * Moves the current item to the next item in the collection. If the enumerator is at the end of
     * the collection or the collection is empty, the current item is set to undefined.
     */
    moveNext(): void;
}
```

`Enumerator`并非是`ECMAScript`规范，而是`JScript`的私货。我们可以使用这种枚举器来遍历`COM`接口，比如，使用枚举器来遍历目录：

```JavaScript
var fs=new ActiveXObject('Scripting.FileSystemObject');
var f=fs.GetFolder("C:\\Windows");

var list=[];
for(var e=new Enumerator(f.SubFolders);!e.atEnd();e.moveNext()){
    list.push(e.item());
}
WScript.Echo(list);
```

甚至还可以用枚举器遍历之前那个支持按索引访问元素的`COM`集合，对代码改写如下：
```JavaScript
var app=new ActiveXObject("Excel.Application");
var fso=new ActiveXObject('Scripting.FileSystemObject');

var excelFile=fso.GetFile("./生产管理专业业务对接表单（1.20）.xlsx");
var book=app.Workbooks.Open(excelFile);
app.Visible=true;

var sheet=book.Worksheets(1);
var list=[];
for(var e=new Enumerator(book.Worksheets);!e.atEnd();e.moveNext()){
    var item=e.item();
    list.push(item.Name);
}
WScript.Echo(list);
book.Close();
```