---
title: Authentication — (5) 如何自定义认证处理器
date: 2019-08-15 01:26:03
tags:
- ASP.NET Core
- Authentication
- CSharp
- 源码分析
categories:
- 风语
- CSharp
- ASP.NET Core
- Security
- Authentication
---

设想有这样一个场景，我们开发了一个`SaaS`服务，正如微软在暴露`Azure`的某些服务那样，我们要求开发者提供相应的订阅（`SubScriptionKey`）才能访问我们的资源。我们约定，开发者需要在`HTTP`请求中添加如下形式的报头：
```
Authorization: subscription-key {KEY}
```
此外，服务提供商还会定期公布一些供新用户试用的订阅，使用这些试用订阅也能通过认证。


为了巩固前几篇源码分析笔记的相关知识，我们通过自定义一个新的认证处理器来解决这个问题。

## 自定义认证处理器

首先，我们新建一个类来表示与此认证相关的配置项：
```csharp
public class SubsKeyAuthNSchemeOptions : AuthenticationSchemeOptions
{
    public string SubscriptionKeyPrefix { get; set; } = "subscription-key";
    public string TrialKey { get; set; } = "42 is the answer";
}
```

认证处理器需要首先从报头中提取`Token`（也即订阅的`Key`）；然后判断当前Key是否为试用的订阅，然后从数据库中检索该Key是否有效；如果有效，则生成认证成功凭证、认证票据，最后返回认证成功结果。

下面给出认证处理器的完整实现：<!-- more -->
```csharp
public class SubsKeyAuthNHandler : AuthenticationHandler<SubsKeyAuthNSchemeOptions>
{
    public SubsKeyAuthNHandler(IOptionsMonitor<SubsKeyAuthNSchemeOptions> options, ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock)
        : base(options, logger, encoder, clock)
    {
    }
    // 一段虚构的用于校验Key的代码
    private Task<bool> ValidateSubscriptionKeyAsync(string key)
    {
        Func<string,bool> validateKeyAgainstDb = (skey)=> {
            // ... check this subscription key
            return false;
        };
        var result = key == this.Options.TrialKey || validateKeyAgainstDb(key) ;
        return Task.FromResult(result);
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // 获取Key
        string key = null;
        string authorization = Request.Headers["Authorization"];
        if (string.IsNullOrEmpty(authorization)) {
            return AuthenticateResult.NoResult();
        }
        if (authorization.StartsWith(this.Options.SubscriptionKeyPrefix, StringComparison.OrdinalIgnoreCase)) {
            key = authorization.Substring(this.Options.SubscriptionKeyPrefix.Length).Trim();
        }
        if (string.IsNullOrEmpty(key)) { return AuthenticateResult.NoResult(); }

        // 校验Key
        var res =await this.ValidateSubscriptionKeyAsync(key);
        if (!res) {
            return AuthenticateResult.Fail($"token {this.Options.SubscriptionKeyPrefix} not match");
        } else {
            var id=new ClaimsIdentity( 
                new Claim[] { new Claim("Key", key) },  // not safe , just as an example , should custom claims on your own
                Scheme.Name 
            );
            ClaimsPrincipal principal=new ClaimsPrincipal( id);
            var ticket = new AuthenticationTicket(principal, new AuthenticationProperties(), Scheme.Name);
            return AuthenticateResult.Success(ticket);
        }
    }

    protected override Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 401;
        var message = "tell me your token";
        Response.Body.Write(Encoding.UTF8.GetBytes(message));
        return Task.CompletedTask;
    }

    protected override Task HandleForbiddenAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 403;
        var message = "you have no rights";
        Response.Body.Write(Encoding.UTF8.GetBytes(message));
        return Task.CompletedTask;
    }
}
```
为了后续可以方便地表述这种认证模式，我们不妨定义两个常量字符串：
```csharp
public class SubsKeyAuthNDefaults {
    public const string Scheme = "SubscriptionKeyAuthenticationScheme";
    public const string DisplayName= "Subscription Key Authentication Scheme";
}
```
## 配置认证

在`Startup.cs`的配置认证服务，为了让我们的程序稍显复杂一点，我故意把默认的认证模式改成了`JwtBearer`；另外我还重写了默认的`TrialKey`:
```csharp
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options => {
        options.TokenValidationParameters = new TokenValidationParameters{ /* ... */ };
        options.ForwardAuthenticate = SubsKeyAuthNDefaults.Scheme;
    })
    .AddScheme<SubsKeyAuthNSchemeOptions, SubsKeyAuthNHandler>(
        SubsKeyAuthNDefaults.Scheme, 
        SubsKeyAuthNDefaults.DisplayName, 
        opts => {
            opts.TrialKey = "42 is not the answer";
        }
    );
```

## 测试

最后，新建一个`API`用于测试我们的代码，其中`Get`方法要求`JwtBearer`认证，而`Post`方法需要进行`SubsKeyAuthNDefaults.Scheme`认证。
```csharp
[Route("api/[controller]")]
[ApiController]
public class ValuesController : ControllerBase
{

    [Authorize(AuthenticationSchemes =JwtBearerDefaults.AuthenticationScheme)]
    [HttpGet("{id}")]
    public ActionResult<string> Get(int id)
    {
        return "value";
    }

    [Authorize(AuthenticationSchemes = SubsKeyAuthNDefaults.Scheme)]
    [HttpPost]
    public string Post([FromBody] string value)
    {
        return value;
    }
}
```

#### 测试 JwtBearer 转发认证

我们分别提交错误的Key、默认的Key和自定义的Key进行测试：
```
### 返回 401
GET https://localhost:5001/api/values/5 HTTP/1.1
Authorization: subscription-key Houston, we have had a problem


### 返回 401
GET https://localhost:5001/api/values/5 HTTP/1.1
Authorization: subscription-key 42 is the answer

### 返回 200
GET https://localhost:5001/api/values/5 HTTP/1.1
Authorization: subscription-key 42 is not the answer
```

#### 测试 SubsKey 认证

1. 测试 POST方法 + SubsKey 认证（提交错误的Key）
```
POST https://localhost:5001/api/values HTTP/1.1
Authorization: subscription-key Houston, we have had a problem
Content-Type: application/json

"Hello, World"
```
以上的请求会返回 `401` + "tell me your token" ：
```
HTTP/1.1 401 Unauthorized
Connection: close
Server: Kestrel
Transfer-Encoding: chunked

tell me your token
```

2. 测试 POST方法 + SubsKey 认证 （提交正确的Key）
```
POST https://localhost:5001/api/values HTTP/1.1
Authorization: subscription-key 42 is not the answer
Content-Type: application/json

"It works"
```
以上的请求会返回 `200`  + "It works":
```
HTTP/1.1 200 OK
Connection: close
Date: Thu, 15 Aug 2019 03:06:33 GMT
Content-Type: text/plain; charset=utf-8
Server: Kestrel
Transfer-Encoding: chunked

It works
```