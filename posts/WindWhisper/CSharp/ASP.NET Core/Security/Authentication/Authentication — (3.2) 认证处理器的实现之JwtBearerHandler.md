---
layout: post
title: Authentication — (3.2) 认证处理器的实现之JwtBearerHandler
date: 2019-08-14 21:46:03
tags:
- ASP.NET Core
- CSharp
- Authentication
- 源码分析
categories:
- 风语
- CSharp
- ASP.NET Core
- Security
- Authentication
---

仅就认证处理器的工作机理而言，`JwtBearer`认证模式是最为简单的一种认证。所以，我们选择`JwtBearer`认证处理器作为本系列源码分析中关于认证处理器第一个具体实现的来讲述。

`HandleAuthenticateAsync()`的基本逻辑是:

1. 触发接收到消息事件，事件处理程序通常可以设置新的`token`——这在使用`WebSocket`/`SignalR`认证中尤其有用，因为难以传递`Authorization: Bearer {token}`报头。事件处理程序甚至可以直接设置`messageReceivedContext.Result`来截断后续处理。
2. 如果消息处理事件没有设置`Token`，则从`Authorization: Bearer {jwt-token}` 中获取
3. 获取令牌校验参数
4. 校验令牌，给出认证成功/失败结果

由于这部分相对简单，这里直接贴出相关源码（具体过程参见我的注释）：<!-- more -->
```csharp
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        string token = null;
        try
        {
            // 触发收到消息事件
            var messageReceivedContext = new MessageReceivedContext(Context, Scheme, Options);
            await Events.MessageReceived(messageReceivedContext);
            if (messageReceivedContext.Result != null)
            {
                return messageReceivedContext.Result;
            }
            token = messageReceivedContext.Token;


            // 如果消息事件没有为我们设置Token，则去Header中搜寻
            if (string.IsNullOrEmpty(token))
            {
                string authorization = Request.Headers["Authorization"];
                if (string.IsNullOrEmpty(authorization)) { return AuthenticateResult.NoResult(); }
                if (authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) { token = authorization.Substring("Bearer ".Length).Trim(); }
                if (string.IsNullOrEmpty(token)) { return AuthenticateResult.NoResult(); }
            }

            // 获取校相关验参数
            if (_configuration == null && Options.ConfigurationManager != null)
            {
                _configuration = await Options.ConfigurationManager.GetConfigurationAsync(Context.RequestAborted);
            }
            var validationParameters = Options.TokenValidationParameters.Clone();
            if (_configuration != null)
            {
                var issuers = new[] { _configuration.Issuer };
                validationParameters.ValidIssuers = validationParameters.ValidIssuers?.Concat(issuers) ?? issuers;

                validationParameters.IssuerSigningKeys = validationParameters.IssuerSigningKeys?.Concat(_configuration.SigningKeys)
                    ?? _configuration.SigningKeys;
            }


            // 校验Token
            List<Exception> validationFailures = null;
            SecurityToken validatedToken;
            foreach (var validator in Options.SecurityTokenValidators)
            {
                if (validator.CanReadToken(token))
                {
                    ClaimsPrincipal principal;
                    try
                    {
                        principal = validator.ValidateToken(token, validationParameters, out validatedToken);
                    }
                    catch (Exception ex)
                    {
                        Logger.TokenValidationFailed(ex);

                        // Refresh the configuration for exceptions that may be caused by key rollovers. The user can also request a refresh in the event.
                        if (Options.RefreshOnIssuerKeyNotFound && Options.ConfigurationManager != null
                            && ex is SecurityTokenSignatureKeyNotFoundException)
                        {
                            Options.ConfigurationManager.RequestRefresh();
                        }

                        if (validationFailures == null)
                        {
                            validationFailures = new List<Exception>(1);
                        }
                        validationFailures.Add(ex);
                        continue;
                    }

                    Logger.TokenValidationSucceeded();

                    var tokenValidatedContext = new TokenValidatedContext(Context, Scheme, Options)
                    {
                        Principal = principal,
                        SecurityToken = validatedToken
                    };

                    await Events.TokenValidated(tokenValidatedContext);
                    if (tokenValidatedContext.Result != null)
                    {
                        return tokenValidatedContext.Result;
                    }

                    if (Options.SaveToken)
                    {
                        tokenValidatedContext.Properties.StoreTokens(new[]
                        {
                            new AuthenticationToken { Name = "access_token", Value = token }
                        });
                    }

                    tokenValidatedContext.Success();
                    return tokenValidatedContext.Result;
                }
            }

            if (validationFailures != null)
            {
                var authenticationFailedContext = new AuthenticationFailedContext(Context, Scheme, Options)
                {
                    Exception = (validationFailures.Count == 1) ? validationFailures[0] : new AggregateException(validationFailures)
                };

                await Events.AuthenticationFailed(authenticationFailedContext);
                if (authenticationFailedContext.Result != null)
                {
                    return authenticationFailedContext.Result;
                }

                return AuthenticateResult.Fail(authenticationFailedContext.Exception);
            }

            return AuthenticateResult.Fail("No SecurityTokenValidator available for token: " + token ?? "[null]");
        }
        catch (Exception ex)
        {
            Logger.ErrorProcessingMessage(ex);

            var authenticationFailedContext = new AuthenticationFailedContext(Context, Scheme, Options)
            {
                Exception = ex
            };

            await Events.AuthenticationFailed(authenticationFailedContext);
            if (authenticationFailedContext.Result != null)
            {
                return authenticationFailedContext.Result;
            }

            throw;
        }
    }
```
