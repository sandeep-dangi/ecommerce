const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");

const sendEmail = asyncHandler(async (data,req,res) => {   //with the help of this data , we will fetch our dynamic data like TO: , subject , text , html whatever we want to send (One thing keep in mind you have to pass this data before req in this case it is only work otherwise not)

    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",       //"smtp.enthereal.email"
        port: 587,
        secure: false, // Use `true` for port 465, `false` for all other ports
        auth: {
          user: process.env.MAIL_ID,  //your mail id
          pass: process.env.MP,   // any password but not your email password
        },
      });
      
      // async..await is not allowed in global scope, must use a wrapper
      let info = await transporter.sendMail({
      //async function main() {
        // send mail with defined transport object
        // const info = await transporter.sendMail({

          //from: 'sandeepdangi977@gmail.com',//"Hey 👻" <abc@email.com>', // sender address
          //to: 'sandeepdangi966@gmail.com',//data.to, // list of receivers
          from: '"Hey 👻" <abc@gmail.com.com>',
          to: data.to,
          subject: data.subject, // Subject line    "Hello "
          text: data.text, // plain text body   "hello world"
          html: data.htm, // html body  "<b>Hello world?</b>"
        });
      
        console.log("Message sent: %s", info.messageId);
        // Message sent: <d786aa62-4e0a-070a-47ed-0b0666549519@ethereal.email>


        console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
        //Preview URL: https://ethereal.email/message/WaQk..

});

module.exports = sendEmail;