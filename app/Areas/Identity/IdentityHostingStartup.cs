using System;
using App.Areas.Identity.Data;
using App.Services;
using App.Services.EmailSender;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Pomelo.EntityFrameworkCore.MySql;

[assembly: HostingStartup(typeof(App.Areas.Identity.IdentityHostingStartup))]
namespace App.Areas.Identity
{
    public class IdentityHostingStartup : IHostingStartup
    {
        public void Configure(IWebHostBuilder builder)
        {
            builder.ConfigureServices((context, services) => {
                var config = context.Configuration;
                services.AddDbContext<AppDbContext>(options =>{
                    options.UseSqlite( config.GetConnectionString("AppDbContextConnection"));
                });

                services.AddDefaultIdentity<IdentityUser>(c=>{
                    c.SignIn.RequireConfirmedEmail=true;
                }).AddEntityFrameworkStores<AppDbContext>()
                ;

                services.AddSingleton<IEmailSender, SmtpEmailSender>();
                services.Configure<StmpEmailSenderOptions>(config.GetSection("SmtpEmailSender:QQ"));
            });
        }
    }
}