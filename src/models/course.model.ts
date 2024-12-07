import mongoose, { Document, Model, Schema } from "mongoose";
import { Date } from "mongoose";


interface ILink extends Document {
    title: string;
    url: string;
}

interface ICourseData extends Document {
    title: string;//
    description: string;//
    videoSection: string;//
    videoLength: number;//
    links?: ILink[];//
    isFree: boolean;//
    useForDemo: boolean;//
    videoName: string;
}

export interface ICourse extends Document {
    name: string; // نام دوره
    description: string; // توضیح کوتاه دوره
    longDescription: string; // توضیح طولانی دوره (HTML)
    academyId: mongoose.Schema.Types.ObjectId; // شناسه آکادمی مرتبط
    teacherId: mongoose.Schema.Types.ObjectId; // شناسه مدرس مرتبط
    categoryIds: mongoose.Schema.Types.ObjectId[]; // شناسه دسته‌بندی‌ها
    discount: {
        percent: number;
        expireTime: Date;
        usageCount: number;
    }; // اطلاعات تخفیف دوره
    price: number; // قیمت دوره
    estimatedPrice?: number; // قیمت تخمینی
    thumbnail: {
        imageName: string;
        imageUrl: string;
    }; // تصویر بندانگشتی دوره
    // bigThumbnail: {
    //     imageName: string;
    //     imageUrl: string;
    // };
    tags: string; // برچسب‌های دوره
    level: string; // سطح دوره (مثل مبتدی، متوسط، پیشرفته)
    benefits: { title: string }[]; // مزایای شرکت در دوره
    prerequisites: { title: string }[]; // پیش‌نیازهای دوره
    courseData: ICourseData[]; // داده‌های جزئی‌تر دوره
    ratings?: number; // امتیاز دوره
    purchased?: number; // تعداد خریدهای دوره
    links?: ILink[]; // لینک‌های مرتبط با دوره
    status: number; // وضعیت دوره (0: ongoing, 1: finished, 2: stopped)
    releaseDate: Date; // تاریخ انتشار دوره
    folderName: string; // نام پوشه مربوط به دوره
    isInVirtualPlus: boolean; // آیا دوره در برنامه Virtual Plus موجود است
    showCourse: boolean; // آیا دوره برای کاربران قابل نمایش است
    totalVideos: number; // تعداد ویدیوهای موجود در دوره
    viewsCount: number; // تعداد بازدیدهای دوره
    seoMeta: {
        description: string;
        keywords: string[];
    }; // اطلاعات SEO دوره
    previewVideoUrl?: string; // لینک ویدیوی پیش‌نمایش
    relatedCourses?: mongoose.Schema.Types.ObjectId[];
    relatedBlogs?: mongoose.Schema.Types.ObjectId[];
    favoritesCount: Number;
    lastContentUpdate: Date;
    isPreOrder: Boolean;
    holeCourseVideos: Number;//تعداد ویدیو هایی که دوره در نهایت باید داشته باشه برای تخمین درصد تکمیل دوره
}

const linkSchema = new Schema<ILink>({
    title: String,
    url: String
})

const courseDataSchema = new Schema<ICourseData>({
    title: String,
    videoSection: String,
    description: String,
    videoLength: String,
    useForDemo: {
        type: Boolean,
        default: false
    },
    isFree: {
        type: Boolean,
        default: false
    },
    links: [linkSchema],
    videoName: String,
})

const courseSchema = new Schema<ICourse>({
    name: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String, required: true }, // پشتیبانی از HTML
    price: { type: Number, required: true },
    estimatedPrice: { type: Number },
    thumbnail: { imageName: String, imageUrl: String },
    // bigThumbnail: { imageName: String, imageUrl: String },
    tags: { type: String, required: true },
    level: { type: String, required: true },
    benefits: [{ title: String }],
    prerequisites: [{ title: String }],
    courseData: [courseDataSchema],
    ratings: { type: Number, default: 0 },
    purchased: { type: Number, default: 0 },
    status: { type: Number, default: 0 },
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy' },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    discount: { percent: Number, usageCount: { type: Number, default: 0 }, expireTime: Date },
    links: [linkSchema],
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    releaseDate: Date,
    folderName: String,
    isInVirtualPlus: { type: Boolean, default: false },
    showCourse: { type: Boolean, default: false },
    totalVideos: Number,
    viewsCount: { type: Number, default: 0 },
    seoMeta: { description: String, keywords: [String] },
    previewVideoUrl: { type: String },
    relatedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // دوره‌های مشابه
    relatedBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Blog' }], // بلاگ‌های پیشنهادی
    favoritesCount: { type: Number, default: 0 }, // تعداد علاقه‌مندی‌ها
    lastContentUpdate: { type: Date, default: Date.now }, // آخرین بروزرسانی محتوا
    isPreOrder: { type: Boolean, default: false }, // پیش‌فروش
    holeCourseVideos: { type: Number, default: 0 }
}, { timestamps: true });


const CourseModel: Model<ICourse> = mongoose.model('Course', courseSchema);

export default CourseModel;