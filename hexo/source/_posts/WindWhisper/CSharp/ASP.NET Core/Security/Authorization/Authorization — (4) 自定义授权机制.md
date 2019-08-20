---
title: Authorization — (4) 自定义授权机制
date: 2019-08-20 22:55:03
tags:
- ASP.NET Core
- Authorization
- CSharp
- 源码分析
categories:
- 风语
- CSharp
- ASP.NET Core
- Security
- Authorization
---


## 自定义 `Policy`

通常情况下，我们可以为`AuthorizationOptions`配置多种`Policies`：
```csharp
services.AddAuthorization(opts=> {
    opts.AddPolicy("CanEnterSecurity", policyBuilder => policyBuilder.RequireClaim("FullName", "Itminus"));
    
    // a function that can executed at runtime 
    opts.AddPolicy("CanDoRuntime",policyBuilder => policyBuilder.RequireAssertion(async context => {
        await Task.Run(()=> { /* pretend doing some sth*/ });
        if (context.User.Identity.Name.Contains("admin")) {
            return true;
        }
        return false;
    }));
    
    opts.AddPolicy("ResourceOwnnershipCheck",pb=> pb.RequireAssertion(async(context) =>{
        var resource = (Dictionary<string,string>)context.Resource;
        return resource["P1"].Contains("World");
    }));
});
```

有时候，这种`inline`风格的代码对于解决复杂问题稍显乏力。这种情况下，我们可以自定义`Requirement`和相应的`AuthorizationHandler<TRequirement>`处理器，然后把相关授权处理器注册为相关服务即可。

绝大部分需求都可以使用以上的方法解决。下面看一个自定义`AuthorizationPolicyProvider`的例子。<!-- more -->

## 自定义`AuthorizationPolicyProvider`

### 需求

有这样一个[需求](https://stackoverflow.com/questions/56572424/net-core-authorize-or-instead-of-and-for-permission-test/56575666#56575666)，传统的`[Authorize]`属性对`Policy`、`Roles`是逻辑和的要求，比如:
```csharp
[Authorize(Policy = "New York", Roles = "admin")]
```
要求用户满足`New York`这个`Policy`，且`Roles`包含`admin`。现在我们需要逻辑`Or`——满足二者之一即可通过授权验证。

### 设计

对于这个问题，我们可以更深一步，设计出这样一种`Policy`风格：
```
Choice: policy='New York'| role= ADMIN
Choice: policy='New York'| role= 'ADMIN'
Choice: policy='New York'| policy = 'WC' | role= root | role = 'GVN'
```
规则是:
1. 需要逻辑`Or`的策略，应以`Choice:`打头，随后可以跟可选的空格。
2. `Policy`以`policy=policyName`的形式指定，如果`policyName`中含有空格，需以单引号`'`包裹。可以定义多个`Policeis`
3. `Role`以`role=roleName`的形式指定，如果`roleName`中含有空格，需以单引号`'`包裹。可以定义多个`Roles`。
4. 各个`Policies`和`Roles`之间以`|`分隔，分隔符`|`前后可以跟一个可选的空格。

这样开发者只需使用诸如`[Authorize(Policy="Choice: policy='New York'| policy='Chicago' | role= ADMIN")]`的形式即可指定授权策略。下面给出实现。

### 代码实现

首先定义一个`Requirement`以容纳所有的`Policies`：

```csharp
public class LogicalOrRequirement : IAuthorizationRequirement
{
    public IList<AuthorizationPolicy> Policies { get; }

    public LogicalOrRequirement(IList<AuthorizationPolicy> policies)
    {
        this.Policies = policies;
    }
}
```

针对这些子`Policy`，如果能满足其中任意一个策略，则意味着整个`Requirement`都成功：
```csharp
public class LogicalOrAuthorizationHandler : AuthorizationHandler<LogicalOrRequirement>
{

    public LogicalOrAuthorizationHandler(IHttpContextAccessor httpContextAccessor)
    {
        this._httpContextAccessor = httpContextAccessor;
    }

    private readonly IHttpContextAccessor _httpContextAccessor;

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, LogicalOrRequirement requirement)
    {
        var httpContext = this._httpContextAccessor.HttpContext;
        var policyEvaluator = httpContext.RequestServices.GetRequiredService<IPolicyEvaluator>();
        foreach (var policy in requirement.Policies)
        {
            var authenticateResult = await policyEvaluator.AuthenticateAsync(policy, httpContext);
            if (authenticateResult.Succeeded)
            {
                context.Succeed(requirement);
            }
        }
    }
}
```

不过在我们的设计中，`Policy`名字的解析需要定制，所以这里我们新建一个`PolicyProvider`，负责解析以`Choice:`开头的策略；其`FallbackPolicyProvider`为默认的`DefaultAuthorizationPolicyProvider`：
```csharp
public class LogicalOrPolicyProvider : IAuthorizationPolicyProvider
{
    const string POLICY_PREFIX = "Choice";
    const string TOKEN_POLICY="policy";
    const string TOKEN_ROLE="role";
    public const string Format = "Choice: policy='p3' | policy='p2' | role='role1' | ..."; 

    private AuthorizationOptions _authZOpts { get; }
    public DefaultAuthorizationPolicyProvider FallbackPolicyProvider { get; }

    public LogicalOrPolicyProvider(IOptions<AuthorizationOptions> options )
    {
        _authZOpts = options.Value;
        FallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
    }


    // Choice: policy= | policy= | role= | role = ...
    public Task<AuthorizationPolicy> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(POLICY_PREFIX, StringComparison.OrdinalIgnoreCase))
        {   
            var policyNames = policyName.Substring(POLICY_PREFIX.Length);
            var startIndex = policyNames.IndexOf(":");
            if(startIndex == -1 || startIndex == policyNames.Length)
            {
                throw new ArgumentException($"invalid syntax, must contains a ':' before tokens. The correct format is {Format}");
            }
            // skip the ":" , and turn it into the following list
            //     [[policy,policyName],[policy,policName],...[role,roleName],...,]
            var list= policyNames.Substring(startIndex+1)
                .Split("|")
                .Select(p => p.Split("=").Select(e => e.Trim().Trim('\'')).ToArray() )
                ;

            // build policy for roleNames
            var rolesPolicyBuilder = new AuthorizationPolicyBuilder();
            var roleNames =list.Where(arr => arr[0].ToLower() == TOKEN_ROLE)
                .Select(arr => arr[1])
                .ToArray();
            var rolePolicy = rolesPolicyBuilder.RequireRole(roleNames).Build();

            // get policies with all related names
            var polices1= list.Where(arr => arr[0].ToLower() == TOKEN_POLICY);
            var polices=polices1 
                .Select(arr => arr[1])
                .Select(name => this._authZOpts.GetPolicy(name))  // if the policy with the name doesn exit => null
                .Where(p => p != null)                            // filter null policy
                .Append(rolePolicy)
                .ToList();

            var pb= new AuthorizationPolicyBuilder();
            pb.AddRequirements(new LogicalOrRequirement(polices));
            return Task.FromResult(pb.Build());
        }

        return FallbackPolicyProvider.GetPolicyAsync(policyName);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync()
    {
        return FallbackPolicyProvider.GetDefaultPolicyAsync();
    }
}
```

最后，把相关类注册为服务：
```csharp
services.AddSingleton<IAuthorizationPolicyProvider, LogicalOrPolicyProvider>();
services.AddSingleton<IAuthorizationHandler, LogicalOrAuthorizationHandler>();
```

这样我们就可以使用传统的`[Authorize()]`属性来进行逻辑或的授权控制了：
```csharp
[Authorize(Policy="Choice: policy='New York'| role= ADMIN")]
public IActionResult Privacy()
{
    return View();
}
```