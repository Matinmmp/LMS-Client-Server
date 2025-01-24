import nodemailer from 'nodemailer';
import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';


const sendFormEmail = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { name, email, subject, message } = req.body;

        if (!name || !email || !subject || !message) {
            return res.status(400).json({ success: false, message: 'لطفاً تمام فیلدها را پر کنید.' });
        }

        try {
            const transporter = nodemailer.createTransport({
                service: 'Gmail', // یا هر سرویسی که استفاده می‌کنید
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),

                auth: {
                    user: process.env.SMTP_MAIL,
                    pass: process.env.SMTP_PASSWORD
                }
            });

            const mailOptions = {
                from: email, // ایمیلی که از آن ارسال می‌شود
                to: 'vc.virtuallearn@gmail.com', // گیرنده ایمیل
                subject: `پیام جدید: ${subject}`,
                text: `نام: ${name}\nایمیل: ${email}\n\nپیام:\n${message}`,
            };

            await transporter.sendMail(mailOptions);
        } catch (error: any) {

            return next(new ErrorHandler(error.message, 400))
        }


        res.status(200).json({ success: true, message: 'ایمیل با موفقیت ارسال شد.' });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

export {
    sendFormEmail
}
