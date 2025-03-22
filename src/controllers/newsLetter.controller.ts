import { Request, Response, NextFunction } from "express";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import NewsletterModel from "../models/newsLetter.model";

// 📌 **ثبت ایمیل در خبرنامه**
export const subscribeNewsletter = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email } = req.body;

        if (!email) {
            return next(new ErrorHandler("لطفاً ایمیل خود را وارد کنید", 400));
        }

        const existingSubscriber = await NewsletterModel.findOne({ email });

        if (existingSubscriber) {
            return next(new ErrorHandler("این ایمیل قبلاً در خبرنامه ثبت شده است", 400));
        }

        const newSubscriber = await NewsletterModel.create({ email, sendMail: true });

        res.status(201).json({
            success: true,
            message: "ایمیل شما با موفقیت در خبرنامه ثبت شد",
            subscriber: newSubscriber
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});
