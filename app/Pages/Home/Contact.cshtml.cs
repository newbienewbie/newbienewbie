using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using App.Services.EmailSender;

namespace App.Pages.Home
{
    [Authorize]
    public class ContactModel : PageModel
    {
        private IEmailSender _emailSender;
        private ILogger<ContactModel> _logger;
        private string _emailMeAddr;

        public ContactModel(IEmailSender emailSender,IOptions<StmpEmailSenderOptions> optionsAccessor, ILogger<ContactModel> logger ){
            this._emailSender = emailSender;
            this._logger = logger;
            this._emailMeAddr = optionsAccessor.Value.User;
        }

        [BindProperty]
        public ContactInfo InputModel{ get; set; }

        public String Message {get;set;} = "";

        public void OnGet()
        {
        }

        public IActionResult OnPostAsync() {
            if (!ModelState.IsValid)
            {
                return Page();
            }
            else {
                var user =HttpContext.User?.Identity.Name;
                if(String.IsNullOrEmpty(user)){
                    this._logger.LogWarning("unknown user submit contactme form");
                    return Page();
                }
                this.Message = "感谢您联系我,我将在看到消息后给您回复";
                this._emailSender.SendEmailAsync(this._emailMeAddr,$"an user({user}) contacts me",$"title={this.InputModel.Title};\r\n \r\n content={this.InputModel.Content};");
                return Page();
            }
        } 

        public class ContactInfo 
        {
            [Display(Name = "标题")]
            [MinLength(6,ErrorMessage ="字段 {0} 最少6个字")]
            [MaxLength(255)]
            public string Title { get; set; }

            [Display(Name = "内容")]
            [MinLength(10,ErrorMessage ="字段{0} 必须大于10个字符")]
            [DataType(DataType.MultilineText)]
            public string Content { get; set; }
        }
    }

}