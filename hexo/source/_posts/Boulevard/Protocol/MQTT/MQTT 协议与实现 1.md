---
title: MQTT 协议与实现 1  —— 协议概要
date: 2019-02-09 20:27:30
tags:
- MQTT
- CSharp
categories:
- 大道
- 协议
- MQTT
---

[`MQTT` 协议](http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html)是连接物与物(`M2M`)的协议，该协议规定了一系列用于物与`Broker`之间相互交换的控制报文。总体来说，一个控制报文结构分为三个部分：

1. 固定头(`Fixed Header`) : 所有 MQTT Control Packets 的固定存在的报头
2. 可选头(`Variable Header`) : 某些  MQTT Control Packets 会包含的报头
3. 负载(`Payload`) : 某些 MQTT Control Packets 会有传输 `Payload`

其中，首字节的前四个比特规定了共`$2^4=16$`种可能的控制报文类型，后4个字节则是一些标志位组合，可以在一定程度上视作为对报文类型的补充。`MQTT`报文的基本格式为：
```math
%% KaTex
\overbrace{\color{orange}\text{报文类型}}^{\text{4 bits}} \enspace \overbrace{\color{green}\text{标志位}}^{\text{4 bits}} \enspace \overbrace{\color{blue} \text{剩余长度} }^{\text{1..4 Bytes}} \enspace \overbrace{\color{yellow} \text{可变头}}^{\text{...}} \enspace \overbrace{\color{skyblue} \text{Payload}}^{\text{...}}
```

### 固定头

固定头的由两部分组成：首字节及剩余长度。正如上文所述，首字节的前四个比特位代表了不同的控制报文类型。从功能上说，控制报文主要分为以下两大类：
<!-- more -->

* 连接管理类：
    - 连接控制型：连接、连接确认；断开连接
    - 心跳控制型：`Ping`请求、`Ping`相应
* 消息管理类：
    - 消息订阅型：订阅、订阅确认；取消订阅、取消订阅确认
    - 消息发布型：发布、发布确认、发布收到、发布释放、发布完成

具体来说，各类型的编码如下：

* 连接类
    * `CONNECT`: `1` , 客户端请求连接到服务器
    * `CONNACK` : `2`, 连接确认 ，由服务端发往客户端
* 消息发布 (均为双向消息，即可从客户端发到服务器，也可由服务器发往客户端)
    * `PUBLISH`: `3` , 发布消息
    * `PUBACK` : `4` , 发布确认 
    * `PUBREC` : `5` , 发布收到 (delivery part 1)
    * `PUBREL` : `6` , 发布释放 (delivery part 2) 
    * `PUBCOMP`: `7` , 发布完成 (delivery part 3) 
* 消息订阅
    * `SUBSCRIBE` : `8` , Client subscribe request  (Client to Server )
    * `SUBACK` : `9`, Subscribe acknowledgment ( Server to Client)
    * `UNSUBSCRIBE` : `10` , Unsubscribe request (Client to Server)
    * `UNSUBACK` : `11` , Unsubscribe acknowledgment  ( Server to Client)
* 心跳
    * `PINGREQ` : `12`, PING request  (Client to Server)
    * `PINGRESP` : `13` , PING response  (Server to Client )
* 断开连接
    * `DISCONNECT` : `14` , Client is disconnecting (Client to Server)
* `0` ,`15` : 保留。

剩余长度则代表了当前报文的剩余字节数（包括可选头及负载两部分的总长度）。该长度采用可变长编码，即第一个字节的低7位表示0~127，最高位如果为1则表示还有后续字节；如此类似，最多不超过4个字节。

## 可变头和负载

某些类型的报文包含了可变头，而且每种报文的可变头都不一样；而且，也并不是每种报文都有`Payload`部分:

|连接管理类型报文| Payload    |
|---------------|------------|
| `Connect`     | **必含**   |
| `CONNACK`     | 必无       |
| `DISCONNECT`  | 必无       |
| `PINGREQ`     | 必无       | 
| `PINGRESP`    | 必无       |

|消息管理类型报文| Payload    |
|---------------|------------|
| `PUBLISH`     | **可选**   |
| `PUBACK`      | 必无       | 
| `PUBREC`      | 必无       |
| `PUBREL`      | 必无       | 
| `PUBCOMP`     | 必无       |
| `SUBSCRIBE`   | **必含**   | 
| `SUBACK`      | **必含**   | 
| `UNSUBSCRIBE` | **必含**   | 
| `UNSUBACK`    | 必无       | 


### 连接功能

`Connect`报文的可变头和复杂相对简单。

- `Variable header`: 协议名(6 Bytes)+协议级别(1 Byte)+连接标志(1 Byte)+保持连接(2 Bytes)
- `Payload`: Client Identifier +  Will Topic + Will Message + User Name + Password 

其中，`Variable Header`分为：
- 协议名：长度(2个字节，值为`4`)+`MQTT`(4个字节)
- 协议级别：1个字节，值为`0x04`代表版本号为`3.1.1`的协议
- 连接标志：1个字节，即`清理会话标志|遗嘱标志|遗嘱QoS标志|遗嘱保留标志|用户名标志|密码标志`
- 保持连接：2个字节，表示一个客户端从结束到开始发送下一个控制包的最大时间间隔(秒)

而`Payload`部分则分为：
- 客户端标识符：这是`Payload`中的第一个字段
- 遗嘱主题和遗嘱消息：如果`Variable Header`中的`遗嘱标志`被设置为1，那么`Payload`中的接下来的字段就是`Will Topic`和`Will Message`。
- 用户名：如果`Variable Header`中的用户名标志被设置为1，那么接下来的字段就是用户名
- 密码：用户`Variable Header`中的密码标志被设置为1，那么接下来的字段就是密码。

服务器收到`CONNECT`报文后，需要发送一个`CONNACK`进行连接确认。`CONNACK`报文的可变头由两个部分构成： 连接确认标志(1 Byte) + 返回码(1 Byte) 。其中返回码的编码为：

| `CONACK`返回码 | 含义                         |
|---------------|------------------------------|
| `0x00`        | 连接接受                      |
| `0x01`        | 连接拒绝（不被接受的协议版本）  |
| `0x02`        | 连接拒绝（客户端标识符拒绝）    |
| `0x03`        | 连接拒绝（服务器服务不可用）    |
| `0x04`        | 连接拒绝（用户名或者密码错误）  |
| `0x05`        | 连接拒绝（未授权）             |
| `0x06`-`0xFF` | 预留                         |

`CONNACK`报文无`Payload`部分。


### 发布消息及响应

消息发布可由客户端发往服务器，也可以由服务器发往客户端，其中`PUBLISH`报文的可变头和负载格式为：

- `Variable Header`: 主题名 + 包标识符（2个字节）
- `Payload`:  即所发布的消息

而`PUBLISH`消息的接收者将根据`QoS`级别的不同，分别有如下响应行为：

| QoS Level | 期待响应   
|-----------|-----------
|  QoS 0    |    None   
|  QoS 1    |    PUBACK 
|  QoS 2    |    PUBREC 


此外，对于`QoS 2`的消息发布，当接收方收到`PUBREC`后，会响应以`PUBREL`；而发布方收到`PUBREL`后，会再返回以`PUBCOMP`，作为`QoS`中发布消息控制报文的最后一次消息交换 :

```
+-------+              +-------+
|       | (1) PUBLISH  |       |
|       +-------------->       |
|       |              |       |
|       | (2) PUBACK   |       |
|       <--------------+       |
|       |              |       |
|   A   | (3) PUBREL   |   B   |
|       +-------------->       |
|       |              |       |
|       | (4) PUBCOMP  |       |
|       <--------------+       |
|       |              |       |
+-------+              +-------+
```

### 订阅消息

#### 订阅

和消息发布不同，`SUBSCRIBE` 是由客户端发往服务端来创建订阅的报文。每个`SUBSCRIBE`报文都注册了一个客户端对一个或者多个主题的兴趣。
 
`SUSBSCRIBE`报文固定头第一个必须字节必须是：`$\color{orange}1000\enspace \color{green}0010$`；负载必须至少包含一个`Topic Filter/Requested QoS`对，其中，每个`Topic Filter/Requested QoS`对类似于：
```
Topic Filter = Length (Byte 1-2) + Filter(Byte 3...N)
Requested QoS  = 0x000000XX (Byte N+1)
```
同一个`SUBSCRIBE`报文下，各个`Topic Filter/Requested QoS`对连续堆叠。

而当服务端收到`SUBSCRIBE`消息时，必须响应一个`SUBACK`报文。`SUBACK`报文的`Payload`将针对各个订阅逐一给出响应码，每个响应码占一个字节：

|响应码 | 含义                    |
|------|-------------------------|
| 0x00 | Success - Maximum QoS 0 |
| 0x01 | Success - Maximum QoS 1 | 
| 0x02 | Success - Maximum QoS 2 |
| 0x80 | Failure

也即`SUBACK`报文的`Payload`是由一系列响应码构成的字节数组。

### 取消订阅

类似的，`UNSUBSCRIBE`是由客户端发往服务端来取消订阅的报文。`UNSUSBSCRIBE`报文固定头第一个必须字节必须是：`$\color{orange}1010\enspace \color{green}0010$`。

但是和`SUBSCRIBE`不同的是，`UNSUBSCRIBE`的`Payload`并非由各个`Topic Filter/Requested QoS`对连续堆叠而成，而是一个由`Topic Filter`所组成的列表。

此外，`UNSUBACK`报文并没有`Payload`。