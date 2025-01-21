import mongoose, { Document, Model, Schema } from "mongoose";
import { Date } from "mongoose";

interface ILink extends Document {
    title: string;
    url: string;
}
interface IFile extends Document {
    fileTitle: string,//اسمش لحظه ی دانلود
    fileName: string;//اسمش داخل باکت
    fileDescription: string;
}

//فایل هایی که داخل دوره ازش استفاده شده مثل کد ها و متن ها
const fileSchema = new Schema<IFile>({
    fileTitle: {
        type: String,
        default: '',
    },//اسمش لحظه ی دانلود
    fileName: {
        type: String,
        default: '',
    },//اسمش داخل باکت
    fileDescription: {
        type: String,
        default: '',
    },
})

//لینک هایی که قراره بخش اطلاعات دوره ازش استفاده بشه
const linkSchema = new Schema<ILink>({
    title: {
        type: String,
        default: '',
    },
    url: {
        type: String,
        default: '',
    },
})

export interface ICourse extends Document {
    urlName: string; // برای URL هست
    name: string; // نام دوره
    faName: string; // نام دوره
    description: string; // توضیح کوتاه دوره
    longDescription: string; // توضیح طولانی دوره (HTML)
    academyId: mongoose.Schema.Types.ObjectId; // شناسه آکادمی مرتبط
    teacherId: mongoose.Schema.Types.ObjectId; // شناسه مدرس مرتبط
    categoryIds: mongoose.Schema.Types.ObjectId[]; // شناسه دسته‌بندی‌ها
    discount: { percent: number; expireTime: Date; usageCount: number; }; // اطلاعات تخفیف دوره
    price: number; // قیمت دوره
    estimatedPrice?: number; // قیمت تخمینی
    thumbnail: { imageName: string; imageUrl: string; }; // تصویر بندانگشتی دوره
    tags: string[]; // برچسب‌های دوره
    level: string; // سطح دوره (مثل مبتدی، متوسط، پیشرفته)
    benefits: { title: string }[]; // مزایای شرکت در دوره
    prerequisites: { title: string, link?: string }[]; // پیش‌نیازهای دوره
    rating?: number; // امتیاز دوره
    ratingNumber: number;
    purchased?: number; // تعداد خریدهای دوره
    links?: ILink[]; // لینک‌های مرتبط با دوره
    status: number; // وضعیت دوره (0: ongoing, 1: finished, 2: stopped)
    folderName: string; // نام پوشه مربوط به دوره
    isInVirtualPlus: boolean; // آیا دوره در برنامه Virtual Plus موجود است
    showCourse: boolean; // آیا دوره برای کاربران قابل نمایش است
    totalLessons: number; // تعداد ویدیوهای موجود در دوره
    viewsCount: number; // تعداد بازدیدهای دوره
    seoMeta: { title: string; description: string; keywords: string[] }; // اطلاعات سئو
    previewVideoUrl?: string; // لینک ویدیوی پیش‌نمایش
    relatedCourses?: mongoose.Schema.Types.ObjectId[]; // دوره‌های مشابه
    favoritesCount: number; // تعداد علاقه‌مندی‌ها
    createDate: Date; // تاریخی که این کورس توی سایت اضافه شده
    endDate: Date; // تاریخی که این کورس توی سایت تموم شده
    releaseDate: Date; // تاریخ انتشار واقعی دوره
    finishDate: Date; // تاریخ پایان واقعی دوره
    lastContentUpdate: Date; // آخرین بروزرسانی محتوا
    isPreOrder: boolean; // پیش‌فروش
    holeCourseVideos: number; // تعداد ویدیوهایی که دوره در نهایت باید داشته باشه
    courseFiles: IFile[]; // فایل‌های دوره
    info: string; // اطلاعات اضافه
    warning: string; // هشدارها
    error: string; // خطاها
    courseLength: number; // زمان دوره به ثانیه
}


const courseSchema = new Schema<ICourse>({
    urlName: {
        type: String,
        required: true,
        unique: true, // اضافه کردن unique
    },
    name: { type: String, required: true },
    faName: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String, required: true }, // پشتیبانی از HTML
    price: { type: Number, required: true },
    estimatedPrice: { type: Number },
    thumbnail: {
        imageName: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
    },
    tags: {
        type: [String],
        required: true,
        lowercase: true, // تبدیل به حروف کوچک
    },
    level: { type: String, required: true },
    benefits: { type: [{ title: String }], default: [] },
    prerequisites: { type: [{ title: String, link: String }], default: [] },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    ratingNumber: {
        type: Number,
        default: 0,
        min: 0,
    },
    purchased: { type: Number, default: 0, min: 0 },
    status: { type: Number, default: 0 },
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy', default: [] },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: [] },
    discount: { percent: Number, usageCount: { type: Number, default: 0 }, expireTime: Date },
    links: [linkSchema],
    categoryIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
        default: []
    },
    folderName: {
        type: String,
        default: '',
    },
    isInVirtualPlus: { type: Boolean, default: false },
    showCourse: { type: Boolean, default: false },
    totalLessons: Number,
    viewsCount: { type: Number, default: 0 },
    seoMeta: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        keywords: { type: [String], default: [] },
    },
    previewVideoUrl: { type: String },
    relatedCourses: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
        default: []
    }, // دوره‌های مشابه

    // relatedBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' }], // بلاگ‌های پیشنهادی

    createDate: { type: Date, default: Date.now },
    releaseDate: Date,
    lastContentUpdate: { type: Date, default: Date.now }, // آخرین بروزرسانی محتوا
    isPreOrder: { type: Boolean, default: false }, // پیش‌فروش
    holeCourseVideos: { type: Number, default: 0 },
    courseFiles: [fileSchema],
    info: { type: String, default: '' },
    warning: { type: String, default: '' },
    error: { type: String, default: '' },
    courseLength: Number,

    //کرون جاب
    favoritesCount: { type: Number, default: 0 }, // تعداد علاقه‌مندی‌ها
}, { timestamps: true });


const CourseModel: Model<ICourse> = mongoose.model('Course', courseSchema);

export default CourseModel;