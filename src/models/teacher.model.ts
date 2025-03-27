import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITeacher extends Document {
    engName: string;
    faName: string;
    tags: string[];
    description?: string;
    longDescription: string;
    avatar: { imageName: string; imageUrl: string };
    courses: mongoose.Schema.Types.ObjectId[]; // ارتباط یک به چند با دوره‌ها
    academies: mongoose.Schema.Types.ObjectId[]; // ارتباط چند به چند با آکادمی‌ها
    seoMeta: { title: string; description: string; keywords: string }; // اطلاعات سئو
    rating: number;
    ratingNumber: number;
    totalStudents: number;
    totalAcademies: number;
    totalCourses: number;
}

const teacherSchema: Schema<ITeacher> = new mongoose.Schema({

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
    },

    avatar: {
        imageName: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
    },

    courses: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Course', 
        default: [],
        index: true, // ایندکس برای جستجوهای سریع‌تر
    }],
    academies: [{
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Academy', 
        default: [],
        index: true, // ایندکس برای جستجوهای سریع‌تر
    }],

    seoMeta: {
        title: { type: String, default: '' },
        description: { type: String, default: '' },
        keywords: { type: String, default: '' }
    },

    rating: { 
        type: Number, 
        default: 0, 
        min: 0, 
        max: 5,
        index: true, // ایندکس برای مرتب‌سازی و فیلتر کردن
    },
    ratingNumber: { 
        type: Number, 
        default: 0, 
        min: 0,
        index: true, // ایندکس برای مرتب‌سازی و فیلتر کردن
    },
    totalStudents: { 
        type: Number, 
        default: 0, 
        min: 0,
        index: true, // ایندکس برای مرتب‌سازی و فیلتر کردن
    },
    totalAcademies: { 
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
// teacherSchema.index({ engName: 1, faName: 1 }); // جستجو بر اساس نام انگلیسی و فارسی
// teacherSchema.index({ rating: -1 }); // مرتب‌سازی بر اساس امتیاز (از بالا به پایین)
// teacherSchema.index({ totalStudents: -1 }); // مرتب‌سازی بر اساس تعداد دانشجویان (از بالا به پایین)

const TeacherModel: Model<ITeacher> = mongoose.model('Teacher', teacherSchema);

export default TeacherModel;