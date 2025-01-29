import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAcademy extends Document {
    engName: string;
    faName: string;
    tags: string[];
    description: string;
    longDescription: string;
    avatar: { imageName: string; imageUrl: string };
    courses?: mongoose.Schema.Types.ObjectId[]; // ارتباط یک به چند با دوره‌ها
    teachers?: mongoose.Schema.Types.ObjectId[]; // ارتباط چند به چند با مدرسین
    seoMeta: { title: string; description: string; keywords: string }; // اطلاعات سئو
    rating: number;
    ratingNumber: number;
    
    totalStudents: number;
    totalTeachers: number;
    totalCourses: number;
}

const academySchema: Schema<IAcademy> = new mongoose.Schema({
    engName: {
        type: String,
        default: '',
    },
    faName: {
        type: String,
        default: '',
    },

    tags: {
        type: [String],
        default: [],
        lowercase: true,
    },

    description: {
        type: String,
        default: '',
        required: true,
    },
    longDescription: {
        type: String,
        default: '',
        required: true,
    },

    avatar: {
        imageName: {
            type: String,
            default: '',
            validate: {
                validator: function (v: string) {
                    return /\.(jpg|jpeg|png|gif)$/i.test(v);
                },
                message: 'فرمت فایل تصویر نامعتبر است!'
            }
        },
        imageUrl: { type: String, default: '' },
    },

    courses: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: [],
        index: true, // ایندکس برای جستجوهای سریع‌تر
    }],
    teachers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: [],
        index: true, // ایندکس برای جستجوهای سریع‌تر
    }],

    seoMeta: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        keywords: { type: String, default: '' },
    },

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
    totalStudents: {
        type: Number,
        default: 0,
        min: 0,
        index: true, // ایندکس برای مرتب‌سازی و فیلتر کردن
    },
    totalTeachers: {
        type: Number,
        default: 0,
        min: 0,
        index: true, // ایندکس برای مرتب‌سازی و فیلتر کردن
    },
    totalCourses: {
        type: Number,
        default: 0,
        min: 0,
        index: true, // ایندکس برای مرتب‌سازی و فیلتر کردن
    },

}, { timestamps: true });

// اضافه کردن ایندکس‌های ترکیبی برای جستجوهای پیشرفته
academySchema.index({ engName: 1, faName: 1 }); // جستجو بر اساس نام انگلیسی و فارسی



const AcademyModel: Model<IAcademy> = mongoose.model('Academy', academySchema);

export default AcademyModel;