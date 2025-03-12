import mongoose, { Model, Schema } from "mongoose";

interface IBlog extends Document {
    title: string; // عنوان بلاگ
    slug: string; // آدرس یکتا
    description: string; // متن کامل بلاگ
    longDescription: string; // خلاصه بلاگ
    thumbnail: { imageName: string; imageUrl: string }; // تصویر اصلی
    sliderThumbnail: { imageName: string; imageUrl: string }; // تصویر اصلی
    categories: mongoose.Schema.Types.ObjectId[]; // دسته‌بندی‌ها
    tags: string[]; // برچسب‌ها
    status: "draft" | "published" | "archived"; // وضعیت بلاگ
    seoMeta: { title: string; description: string; keywords: string[] }; // اطلاعات سئو
    views: number; // تعداد بازدید
    likes: number; // تعداد لایک‌ها
    isFeatured: boolean; // بلاگ ویژه
    relatedBlogs: mongoose.Schema.Types.ObjectId[]; // بلاگ‌های مرتبط
    relatedCourse:mongoose.Schema.Types.ObjectId[]; 
    publishDate: Date; // تاریخ انتشار
    lastUpdated: Date; // آخرین به‌روزرسانی
    readingTime: number; // زمان مطالعه (بر حسب دقیقه)
}


const blogSchema = new Schema<IBlog>({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // آدرس یکتا
    description: { type: String, required: true },
    longDescription: String,
    thumbnail: { imageName: String, imageUrl: String },
    sliderThumbnail: { imageName: String, imageUrl: String },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    tags: [String],
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft" },
    seoMeta: { title: String, description: String, keywords: [String] },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    isFeatured: { type: Boolean, default: false },
    relatedBlogs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Blog" }],
    relatedCourse: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    publishDate: { type: Date, default: Date.now },
    lastUpdated: { type: Date, default: Date.now },
    readingTime: { type: Number, default: 0 },
    
}, { timestamps: true });


const BlogModel: Model<IBlog> = mongoose.model("Blog", blogSchema);

export default BlogModel;