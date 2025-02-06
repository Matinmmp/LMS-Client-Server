import { NextFunction, Request, Response } from "express";
import InvoiceModel from "../models/Invoice.model";
import ZarinpalCheckout from "zarinpal-checkout";
import moment from "moment";
import mongoose from "mongoose";
import CourseModel from "../models/course.model";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user.model";
import sendMail from "../utils/sendMail";


const zarinpal = ZarinpalCheckout.create('4c5be643-ec8b-47ef-a201-c6bca20bc77f', true);

const initiatePayment = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courses } = req.body;
        const userId = req.user?._id;

        if (!courses || !courses.length) {
            return next(new ErrorHandler("سبد خرید خالی است.", 400));
        }

        // const validCourseIds = courses.map((course: any) => new mongoose.Types.ObjectId(course.courseId));
        const validCourses = await CourseModel.find({ _id: { $in: courses } });

        if (!validCourses.length) {
            return next(new ErrorHandler("دوره‌های معتبر یافت نشد.", 400));
        }

        let totalOriginalPrice = 0;
        let totalDiscount = 0;
        let totalFinalPrice = 0;
        const invoiceCourses: any[] = [];

        validCourses.forEach((course: any) => {
            let discountAmount = 0;
            if (course.discount?.percent && course.discount.expireTime) {
                const discountExpireTime = moment(course.discount.expireTime);
                const currentTime = moment();

                if (currentTime.isBefore(discountExpireTime.add(10, "minutes"))) {
                    discountAmount = (course.price * course.discount.percent) / 100;
                }
            }

            const finalPrice = course.price - discountAmount;

            invoiceCourses.push({
                courseUrlName: course.urlName,
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

        const invoice = await InvoiceModel.create({
            userId,
            courses: invoiceCourses,
            totalOriginalPrice,
            totalDiscount,
            totalFinalPrice,
            paymentMethod: totalFinalPrice === 0 ? "free" : "online",
            paymentStatus: totalFinalPrice === 0 ? "successful" : "pending",
        });


        if (totalFinalPrice === 0) {
            const user = await userModel.findById(userId).select("email name");


            await sendMail({
                email: user?.email!,
                subject: "تأیید خرید شما در Virtual Learn",
                template: "purchase-confirmation.ejs",
                data: {
                    userName: user?.name,
                    invoice
                }
            });


            return res.status(200).json({
                success: true,
                message: "سفارش با موفقیت ثبت شد. نیازی به پرداخت نیست.",
                isFree: true,
                invoiceId: invoice._id,
            });


        }

        const response = await zarinpal.PaymentRequest({
            Amount: totalFinalPrice,
            CallbackURL: `http://localhost:3000/payment/verify?invoiceId=${invoice._id}`,
            Description: `پرداخت برای دوره‌های انتخابی`,
            Email: req.user?.email || undefined,
            Mobile: req.user?.phone || undefined,
        });

        if (response.status === 100) {
            return res.status(200).json({
                success: true,
                message: "لینک پرداخت ایجاد شد.",
                isFree: false,
                url: response.url,
                invoiceId: invoice._id,
            });
        } else {
            return next(new ErrorHandler("مشکلی در ایجاد لینک پرداخت وجود دارد.", 400));
        }
    } catch (error: any) {
        console.log(error)
        return next(new ErrorHandler(error.message, 500));
    }
});

const verifyPayment = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { Authority, Status, invoiceId } = req.query;
        if (Status !== "OK") {
            return next(new ErrorHandler("پرداخت توسط کاربر لغو شد.", 400));
        }

        const invoice = await InvoiceModel.findById(invoiceId);
        if (!invoice) {
            return next(new ErrorHandler("سفارش یافت نشد.", 404));
        }

        const response: any = await zarinpal.PaymentVerification({
            Amount: invoice.totalFinalPrice,
            Authority: Authority as string,
        });

        console.log(response);


        if (response.status === 100) {
            invoice.paymentStatus = "successful";
            invoice.transactionId = response?.RefID;
            await invoice.save();
            const user = await userModel.findById(invoice.userId).select("email name");

            await sendMail({
                email: user?.email!,
                subject: "تأیید پرداخت شما در Virtual Learn",
                template: "purchase-confirmation.ejs",
                data: {
                    userName: user?.name,
                    invoice
                }
            });

            return res.status(200).json({
                success: true,
                message: "پرداخت با موفقیت انجام شد.",
                refId: response?.refId,
            });
        } else {
            return next(new ErrorHandler("پرداخت ناموفق بود.", 400));
        }
    } catch (error: any) {

        return next(new ErrorHandler(error.message, 500));
    }
});


const getUserInvoices = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id as string;

        if (!userId) return next(new ErrorHandler("کاربر یافت نشد", 404));

        // دریافت لیست فاکتورها، مرتب‌سازی بر اساس جدیدترین، و انتخاب فیلدهای مورد نیاز
        const invoices = await InvoiceModel.find({ userId })
            .sort({ createdAt: -1 })
            .select("courses totalOriginalPrice totalDiscount totalFinalPrice createdAt paymentStatus transactionId refId thumbnail")
            .lean();

        if (!invoices || invoices.length === 0) {
            return res.status(404).json({
                success: false,
                message: "هیچ فاکتوری برای این کاربر یافت نشد",
            });
        }

        // **ارسال پاسخ**
        res.status(200).json({
            success: true,
            invoices,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});



export {
    initiatePayment,
    verifyPayment,
    getUserInvoices
}