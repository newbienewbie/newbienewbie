
using App.Options;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.DependencyInjection;

namespace App.Middlewares{


    public static class ApplicationBuilderStaticFilesVerificationExtension
    {

        public static void UseStaticVerification(this IApplicationBuilder app){
            if (app == null)
            {
                throw new System.ArgumentNullException(nameof(app));
            }

            var sp = app.ApplicationServices;

            var bo=sp.GetService<IOptions<StaticVerificationOption>>().Value;

            var fileProvider=new PhysicalFileProvider(bo?.RootPath);
            var staticFileOptions = new StaticFileOptions() {
                RequestPath = bo.RequestPath,
                FileProvider= fileProvider,
            };
            app.UseStaticFiles(staticFileOptions);
        }

    }

}
