

using System.Drawing;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using ZXing;

namespace App.Areas.Tools.Pages.Barcode{

    public class DecodePageModel : PageModel{

        public IActionResult OnGet(){
            return Page();
        }


        /// <summary>
        /// 
        /// </summary>
        /// <param name="file"></param>
        /// <returns></returns>
        public IActionResult OnPost( IFormFile image){
            if(image==null){
                return new JsonResult(new{});
            }
            var reader = new BarcodeReader();
            var bitmap = (Bitmap)Image.FromStream(image.OpenReadStream());
            var result = reader.Decode(bitmap);
            return new JsonResult(result);
        }

    }

}