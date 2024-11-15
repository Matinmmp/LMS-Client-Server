import mongoose, { Document, Model, Schema } from "mongoose";

export interface IInvoice extends Document {
    userId: mongoose.Schema.Types.ObjectId; // آیدی کاربر
    courseId: mongoose.Schema.Types.ObjectId; // آیدی دوره
    courseName: string; // نام دوره
    originalPrice: number; // قیمت اصلی دوره
    discountAmount: number; // مبلغ تخفیف
    finalPrice: number; // مبلغ نهایی پرداخت‌شده
    paymentMethod: string; // روش پرداخت (مثلاً آنلاین، کارت به کارت)
    paymentStatus: string; // وضعیت پرداخت (موفق، ناموفق)
    transactionId?: string; // شناسه تراکنش
    createdAt: Date; // تاریخ خرید
    updatedAt?: Date; // تاریخ آخرین به‌روزرسانی، در صورت نیاز
}

const invoiceSchema: Schema<IInvoice> = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    courseName: {
        type: String,
        required: true
    },
    originalPrice: {
        type: Number,
        required: true
    },
    discountAmount: {
        type: Number,
        default: 0 // اگر تخفیفی وجود نداشت، مقدار پیش‌فرض 0 باشد
    },
    finalPrice: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ["online", "card_to_card", "wallet"], // روش‌های پرداخت
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ["successful", "failed", "pending"], // وضعیت پرداخت
        default: "pending"
    },
    transactionId: {
        type: String, // شناسه تراکنش برای بررسی پرداخت آنلاین
    },
}, { timestamps: true }); // شامل createdAt و updatedAt

const InvoiceModel: Model<IInvoice> = mongoose.model<IInvoice>("Invoice", invoiceSchema);

export default InvoiceModel;
