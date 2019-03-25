

using System.ComponentModel.DataAnnotations;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace App.Areas.Tools.Pages.Barcode{


    public class GenerateBarcodePageModel : PageModel{

        public class InputModel {
            [Display(Name="图宽")]
            public int Width { get; set; } = 300;
            [Display(Name="图高")]
            public int Height { get; set; } = 300;
            [Display(Name="边距")]
            public int Margin { get; set; } = 4;
            [Display(Name="二维码内容")]
            public string Content { get; set; } 

            [Display(Name="备选文字")]
            public string Alt { get; set; } = "";

            [Display(Name="模式")]
            public string Mode{ get; set; } = "QR_CODE";
        }

        [BindProperty]
        public InputModel BarcodeOptions { get; set; }

        public IActionResult OnGet(){
            this.BarcodeOptions = new InputModel();
            return Page();
        }

        public IActionResult OnPost(){
            if(this.BarcodeOptions.Mode=="CODE_128"){
                if( this.BarcodeOptions.Content.ToCharArray().Any(c => c >= 128)){
                    ModelState.AddModelError("BarcodeOptions.Content","CODE_128 编码下只能使用ASCII字符!");
                    return Page();
                }
            }
            return Page();
        }

    }
}