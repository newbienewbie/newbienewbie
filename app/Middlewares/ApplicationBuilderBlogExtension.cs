
using App.Options;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;

namespace App.Middlewares{


    public static class ApplicationBuilderBlogExtension
    {

        public static void UseStaticBlog(this IApplicationBuilder app){
            if (app == null)
            {
                throw new System.ArgumentNullException(nameof(app));
            }

            var sp = app.ApplicationServices;

            var bo=sp.GetService<IOptions<StaticBlogOption>>().Value;

            var fileProvider=new PhysicalFileProvider(bo?.RootPath);
            var fileOptions = new DefaultFilesOptions() {
                DefaultFileNames = new[] { "index.html", "index.htm", },
            };
            fileOptions.RequestPath=bo.RequestPath;
            fileOptions.FileProvider=fileProvider;
            var option = Microsoft.Extensions.Options.Options.Create(fileOptions);

            // there's a bug in default staticFiles 
            app.UseMiddleware<MyDefaultFilesMiddleware>(option);

            var staticFileOptions = new StaticFileOptions() {
                RequestPath = bo.RequestPath,
                FileProvider= fileProvider,
            };
            app.UseStaticFiles(staticFileOptions);
        }

    }

}
