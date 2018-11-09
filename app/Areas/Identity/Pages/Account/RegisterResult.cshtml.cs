using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;

namespace App.Areas.Identity.Pages.Account
{
    [AllowAnonymous]
    public class RegisterResultModel : PageModel
    {
        public RegisterResultModel(){
        }

        public string ReturnUrl { get; set; }
        public string Email {get;set;}

        public void OnGet(string email , string returnUrl = null)
        {
            this.Email = email;
            this.ReturnUrl = returnUrl;
        }

    }
}
