import mongoose, { Document, Model, Schema } from "mongoose";

interface IInvoiceCourse extends Document {
    courseId: mongoose.Schema.Types.ObjectId; // آیدی دوره
    courseName: string; // نام دوره
    courseUrlName:string;
    originalPrice: number; // قیمت اصلی دوره
    discountAmount: number; // مبلغ تخفیف برای این دوره
    finalPrice: number; // مبلغ نهایی دوره
    isFree: boolean; // آیا دوره رایگان است؟
}

export interface IInvoice extends Document {
    userId: mongoose.Schema.Types.ObjectId; // آیدی کاربر
    courses: IInvoiceCourse[]; // لیست دوره‌های موجود در سبد خرید
    totalOriginalPrice: number; // جمع کل قیمت‌های اصلی
    totalDiscount: number; // جمع کل تخفیف‌ها
    totalFinalPrice: number; // مبلغ کل نهایی پرداخت‌شده
    paymentMethod: string; // روش پرداخت
    paymentStatus: string; // وضعیت پرداخت
    transactionId?: string; // شناسه تراکنش
    createdAt: Date; // تاریخ خرید
    updatedAt?: Date; // تاریخ آخرین به‌روزرسانی
    refId: string;
}

const invoiceCourseSchema: Schema<IInvoiceCourse> = new Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    courseName: {
        type: String,
        required: true
    },
    courseUrlName: {
        type: String,
        required: true
    },
    originalPrice: {
        type: Number,
        required: true
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    finalPrice: {
        type: Number,
        required: true
    },
    isFree: {
        type: Boolean,
        default: false
    },
});

const invoiceSchema: Schema<IInvoice> = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    courses: [invoiceCourseSchema], // آرایه‌ای از دوره‌ها
    totalOriginalPrice: {
        type: Number,
        required: true
    },
    totalDiscount: {
        type: Number,
        default: 0
    },
    totalFinalPrice: {
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
        type: String
    },

    refId: String
}, { timestamps: true });

const InvoiceModel: Model<IInvoice> = mongoose.model<IInvoice>("Invoice", invoiceSchema);

export default InvoiceModel;
