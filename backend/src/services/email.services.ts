import { transporter, mailGenerator } from "../config/email.config";
import { User } from "../model/user.model";
import nodeMailer from 'nodemailer';
const company_name = "ABC Company";
const domain = "https://inventory-silk-kappa.vercel.app/";
export class EmailServices {

    static registerEmail(passcode: string, user: User) {
        let template = {
            body: {
                name: user.full_name,
                intro: `Welcome to ${company_name}. Your staff account has been successfully created, and we are pleased to have you join our organization.`,
                action: {
                    instructions: 'Here are your login credentials to access your staff portal:',
                    button: {
                        color: '#22BC66',
                        text: 'Go to Staff Portal',
                        link: `${domain}/login`
                    }
                },
                dictionary: {
                    'email': user.email,
                    'Password': passcode
                },
                outro: [
                    "Please keep your login credentials secure and do not share them with anyone.",
                    "We wish you success in your role and look forward to your contributions.",
                   
                ]
            }

        }
        return mailSender(template, `Welcome to ${company_name}`, user.email);
    }
    static resetPasswordEmail(passcode: string, user: User) {
        let template = {
            body: {
                name: user.full_name,
                intro: `You have requested to reset your password. Please use the following code to reset your password:`,
                action: {
                    instructions: 'Here are your login credentials to access your staff portal:',
                    button: {
                        color: '#22BC66',
                        text: 'Go to Staff Portal',
                        link: `${domain}/login`
                    }
                },
                dictionary: {
                    'email': user.email,
                    'Password': passcode
                },
                outro: [
                    "Please keep your login credentials secure and do not share them with anyone.",
                    "We wish you success in your role and look forward to your contributions.",

                ]
            }

        }
        return mailSender(template, `Reset Password`, user.email);
    }
}


const mailSender = async (template: any, subject: string, email: string): Promise<Boolean> => {
    const mail = mailGenerator.generate(template);
    let message = {
        from: `" ${company_name}" <riplanit@gmail.com>`,
        to: '<' + email + '>',
        subject: subject,
        html: mail,

    }

    try {
        await transporter.sendMail(message);
        console.log("Successfully sent to " + email);
        return true;
    } catch (error) {
        console.error("Email send failed:", error);
        return false;
    }
}
const mailSenderWithAttachment = async (template: any, subject: string, email: string, attachment: any): Promise<Boolean> => {
    const mail = mailGenerator.generate(template);
    let message = {
        from: `" ${company_name}" <riplanit@gmail.com>`,
        to: '<' + email + '>',
        subject: subject,
        html: mail,
        attachments: [
            {
                filename: attachment.filename,
                content: Buffer.from(attachment.content, "utf-8"),
                contentType: attachment.contentType,
            },
        ],
    }

    try {
        await transporter.sendMail(message);
        console.log("Successfully sent to " + email);
        return true;
    } catch (error) {
        console.error("Email send failed:", error);
        return false;
    }
}