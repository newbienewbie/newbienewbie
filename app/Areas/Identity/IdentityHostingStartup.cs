using System;
using App.Areas.Identity.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI;
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
                services.AddDbContext<AppDbContext>(options =>{
                    options.UseMySql( context.Configuration.GetConnectionString("AppDbContextConnection"));
                });

                services.AddDefaultIdentity<IdentityUser>()
                    .AddEntityFrameworkStores<AppDbContext>();
            });
        }
    }
}