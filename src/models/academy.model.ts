import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAcademy extends Document {
    engName: string;
    faName: string;
    tags: string;
    description?: string;
    longDescription: string;
    avatar: { imageName: string; imageUrl: string },
    courses: mongoose.Schema.Types.ObjectId[]; // ارتباط یک به چند با دوره‌ها
    teachers: mongoose.Schema.Types.ObjectId[]; // ارتباط چند به چند با مدرسین
    seoMeta: { title: string; description: string; keywords: string[] }; // اطلاعات سئو
    // اینا همه باید با کرون جاب حساب بشن
    rating: number;
    ratingNumber: number;
    totalStudents: number;
    totalTeacher: number;
    totalCourses: number;
}

const academySchema: Schema<IAcademy> = new mongoose.Schema({
    engName: String,
    faName: String,
    tags: String,
    description: String,
    longDescription: String,
    avatar: { imageName: String, imageUrl: String },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // اشاره به دوره‌ها
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }], // اشاره به مدرسین
    seoMeta: { title: String, description: String, keywords: [String] },
    rating: { type: Number, default: 0 },
    ratingNumber: { type: Number, default: 0 },//تعداد کسایی که رای دادن
    totalStudents: { type: Number, default: 0 },
    totalTeacher: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },

}, { timestamps: true });

const AcademyModel: Model<IAcademy> = mongoose.model('Academy', academySchema);

export default AcademyModel;

