using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using App.Options;
using App.Middlewares;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.AspNetCore.StaticFiles.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Rewrite;
using Microsoft.Extensions.Hosting;

namespace App
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.Configure<CookiePolicyOptions>(options =>
            {
                // This lambda determines whether user consent for non-essential cookies is needed for a given request.
                options.CheckConsentNeeded = context => true;
                options.MinimumSameSitePolicy = SameSiteMode.None;
            });

            services.AddOptions<StaticBlogOption>()
                .Configure<IWebHostEnvironment>((o,env)=>{
                    o.RequestPath="/blog";
                    var binDir= env.ContentRootPath;
                    o.RootPath=Path.Combine(binDir,"static-blog");
                });

            services.AddOptions<StaticVerificationOption>()
                .Configure<IWebHostEnvironment>((o,env)=>{
                    o.RequestPath = "";
                    var binDir= env.ContentRootPath;
                    o.RootPath = Path.Combine(binDir,"search-engine-verify");
                });

            services.AddAuthentication()
                .AddMicrosoftAccount(o =>{
                    o.ClientId = Configuration["Authentication:Microsoft:ClientId"];
                    o.ClientSecret = Configuration["Authentication:Microsoft:ClientSecret"];
                })
                .AddGoogle(o => {
                    o.ClientId = Configuration["Authentication:Google:ClientId"];
                    o.ClientSecret = Configuration["Authentication:Google:ClientSecret"];
                })
                ;
            services.AddControllersWithViews();
            services.AddRazorPages();
            services.Configure<ForwardedHeadersOptions>(opts =>{
                opts.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedHost;
                opts.KnownNetworks.Clear();
                opts.KnownProxies.Clear();
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env, IServiceProvider sp)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                app.UseHsts();
            }
            app.UseRouting();
            app.UseRewriter(new Microsoft.AspNetCore.Rewrite.RewriteOptions()
                .AddRewrite("^$","/blog",skipRemainingRules:true)
            );

            app.UseHttpsRedirection();

            app.UseStaticBlog();
            app.UseStaticVerification();

            app.UseStaticFiles();

            app.UseCookiePolicy();
            app.UseForwardedHeaders();
            app.UseAuthentication();
            app.UseAuthorization();
            app.UseEndpoints(routes =>{
                routes.MapControllerRoute("default","{controller}/{action}/{id?}");
                routes.MapRazorPages();
            });
        }
    }
}
