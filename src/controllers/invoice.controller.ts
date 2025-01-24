import { NextFunction, Request, Response } from "express";
import InvoiceModel from "../models/Invoice.model";
import ZarinpalCheckout from "zarinpal-checkout";
import moment from "moment";
import mongoose from "mongoose";
import CourseModel from "../models/course.model";


const zarinpal = ZarinpalCheckout.create('MERCHANT_ID', true);

export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courses } = req.body; // دریافت لیست دوره‌ها از فرانت‌اند
        const userId = req.user?._id; // آیدی کاربر (از JWT)

        if (!courses || !courses.length) {
            return res.status(400).json({ success: false, message: "سبد خرید خالی است." });
        }

        // اعتبارسنجی دوره‌ها
        const validCourseIds = courses.map((course: any) => new mongoose.Types.ObjectId(course.courseId));
        const validCourses = await CourseModel.find({ _id: { $in: validCourseIds } });

        if (!validCourses.length) {
            return res.status(400).json({ success: false, message: "دوره‌های معتبر یافت نشد." });
        }

        // محاسبه مجموع قیمت و تخفیف
        let totalOriginalPrice = 0;
        let totalDiscount = 0;
        let totalFinalPrice = 0;
        const invoiceCourses: any[] = [];

        validCourses.forEach((course: any) => {
            const userCourse = courses.find((c: any) => c.courseId === course._id.toString());

            // **بررسی وضعیت تخفیف**
            let discountAmount = 0;
            if (course.discount?.percent && course.discount.expireTime) {
                const discountExpireTime = moment(course.discount.expireTime);
                const currentTime = moment();

                // بررسی زمان تخفیف (۱۰ دقیقه بعد از اکسپایر تایم همچنان معتبر باشد)
                if (currentTime.isBefore(discountExpireTime.add(10, "minutes"))) {
                    discountAmount = (course.price * course.discount.percent) / 100;
                }
            }

            const finalPrice = course.price - discountAmount;

            invoiceCourses.push({
                courseId: course._id,
                courseName: course.name,
                originalPrice: course.price,
                discountAmount,
                finalPrice,
                isFree: course.price === 0
            });

            totalOriginalPrice += course.price;
            totalDiscount += discountAmount;
            totalFinalPrice += finalPrice;
        });

        // **ایجاد سفارش در پایگاه داده**
        const invoice = await InvoiceModel.create({
            userId,
            courses: invoiceCourses,
            totalOriginalPrice,
            totalDiscount,
            totalFinalPrice,
            paymentMethod: totalFinalPrice === 0 ? "free" : "online", // روش پرداخت: رایگان یا آنلاین
            paymentStatus: totalFinalPrice === 0 ? "successful" : "pending", // اگر رایگان بود، وضعیت موفقیت‌آمیز
        });

        // **حالت ۱: رایگان بودن دوره‌ها**
        if (totalFinalPrice === 0) {
            return res.status(200).json({
                success: true,
                message: "سفارش با موفقیت ثبت شد. نیازی به پرداخت نیست.",
                isFree: true, // نشان می‌دهد که مبلغ نهایی صفر است
                invoiceId: invoice._id, // شناسه فاکتور برای استفاده در فرانت
            });
        }

        // **حالت ۲: پرداخت آنلاین**
        const response = await zarinpal.PaymentRequest({
            Amount: totalFinalPrice, // مبلغ پرداختی
            CallbackURL: `http://localhost:3000/api/payment/verify?invoiceId=${invoice._id}`,
            Description: `پرداخت برای دوره‌های انتخابی`,
            Email: req.user?.email || undefined,
            Mobile: req.user?.phone || undefined,
        });

        if (response.status === 100) {
            return res.status(200).json({
                success: true,
                message: "لینک پرداخت ایجاد شد.",
                isFree: false, // نشان می‌دهد که پرداخت نیاز است
                url: response.url, // لینک پرداخت
                invoiceId: invoice._id, // شناسه فاکتور برای ذخیره یا بررسی
            });
        } else {
            return res.status(400).json({ success: false, message: "مشکلی در ایجاد لینک پرداخت وجود دارد." });
        }
    } catch (error: any) {
        return next(error);
    }
};



export const verifyPayment = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { Authority, Status, invoiceId } = req.query;

        if (Status !== "OK") {
            return res.status(400).json({ success: false, message: "پرداخت توسط کاربر لغو شد." });
        }

        // یافتن سفارش در دیتابیس
        const invoice = await InvoiceModel.findById(invoiceId);
        if (!invoice) {
            return res.status(404).json({ success: false, message: "سفارش یافت نشد." });
        }

        // تأیید پرداخت
        const response: any = await zarinpal.PaymentVerification({
            Amount: invoice.totalFinalPrice,
            Authority: Authority as string,
        });

        if (response.status === 100) {
            // به‌روزرسانی وضعیت سفارش
            invoice.paymentStatus = "successful";
            invoice.transactionId = response?.RefID;
            await invoice.save();

            return res.status(200).json({
                success: true,
                message: "پرداخت با موفقیت انجام شد.",
                refId: response?.RefID,
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "پرداخت ناموفق بود.",
                status: response.status,
            });
        }
    } catch (error: any) {
        return next(error);
    }
};
