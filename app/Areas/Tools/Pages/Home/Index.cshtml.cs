

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace App.Areas.Tools.Pages.Home{
    public class HomePageModel:PageModel{

        public IActionResult OnGet(){
            return Page();
        }
    }
}