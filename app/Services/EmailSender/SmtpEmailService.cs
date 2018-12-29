
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.Extensions.Options;
using System.Threading.Tasks;
using System.Net.Mail;
using System.Text;
using System;
using Microsoft.Extensions.Logging;

namespace App.Services.EmailSender{

    public class SmtpEmailSender : IEmailSender
    {
        public SmtpEmailSender(IOptions<StmpEmailSenderOptions> optionsAccessor, ILogger<SmtpEmailSender> logger)
        {
            Options = optionsAccessor.Value;
            this._logger = logger;
            this.InitializeSmtpClient();
        }


        private void InitializeSmtpClient(){
            this.smtp = new SmtpClient();
            smtp.Host = this.Options.Host;
            smtp.Port = this.Options.Port;
            smtp.EnableSsl= this.Options.EnableSsl;
            smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
            smtp.Credentials = new System.Net.NetworkCredential(this.Options.User, this.Options.Key);
            smtp.DeliveryMethod = SmtpDeliveryMethod.Network;
            smtp.SendCompleted += (s , e )=>{
                if (e.Cancelled)
                    this._logger.LogWarning($"email sending task canceled");
                else if (e.Error != null){
                    this._logger.LogCritical($"email sending task error : {e.Error.Message}\r\n\t{e.Error.StackTrace}");
                } else 
                {
                    this._logger.LogInformation($"email sending task succeeded");
                }
            };
        }

        public StmpEmailSenderOptions Options { get; } //set only via Secret Manager

        private ILogger<SmtpEmailSender> _logger;
        private SmtpClient smtp;

        public Task SendEmailAsync(string email, string subject, string message)
        {
            this._logger.LogInformation($"EmailSender is trying to send email to {email} : {subject} => {message}");
            return Execute(email,subject,message);
        }


        private Task Execute(string to, string subject,string body)
        {
            MailMessage mail = new MailMessage();
            mail.BodyEncoding = Encoding.UTF8;
            mail.IsBodyHtml = true;
            mail.SubjectEncoding = Encoding.UTF8;
            mail.Priority = MailPriority.Normal;

            mail.From = new MailAddress(this.Options.User);
            mail.To.Add(new MailAddress(to));
            mail.Subject = subject;
            mail.Body = body;

            smtp.SendAsync(mail,null); 
            return Task.CompletedTask;
        }

    }


}