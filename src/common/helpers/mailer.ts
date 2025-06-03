import * as nodemailer from 'nodemailer'
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EmailTemplate from './mail'
import { config } from 'dotenv'
config()


const transport = nodemailer.createTransport({
   service: 'gmail',
   host: 'smtp.gmail.com',
   secure: false,
   port: 587,
   tls: {
      rejectUnauthorized: false,  // This is necessary in some environments (e.g., local testing)
   },
   auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
   }
})


export default async function sendResetMail(to: string, username: string, code: string) {
   const from = process.env.EMAIL_USER;
   const htmlContent = renderToStaticMarkup(
      createElement(EmailTemplate, { username, code })
   );

   const mailOptions = {
      from,
      to,
      subject: 'Reja: Reset Code',
      html: htmlContent,
   };

   const sendMail = await transport.sendMail(mailOptions);
   return sendMail.accepted[0] === to
}
