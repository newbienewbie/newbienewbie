using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace App.Pages.Home
{
    public class ContactModel : PageModel
    {
        [BindProperty]
        public ContactInfo InputModel{ get; set; }

        public void OnGet()
        {
        }

        public IActionResult OnPostAsync() {
            if (!ModelState.IsValid)
            {
                return Page();
            }
            else {
                return Page();
            }
        } 

        public class ContactInfo 
        {
            [Display(Name = "姓名")]
            [MinLength(6,ErrorMessage ="字段 {0} 最少6个字")]
            [MaxLength(255)]
            public string UserName { get; set; }

            [Display(Name = "邮件地址")]
            [DataType(DataType.EmailAddress, ErrorMessage ="字段 {0} 必须为 Email 地址")]
            public string Email { get; set; }

            [Display(Name = "内容")]
            [MinLength(10,ErrorMessage ="字段{0} 必须大于10个字符")]
            [DataType(DataType.MultilineText)]
            public string Content { get; set; }
        }
    }

}