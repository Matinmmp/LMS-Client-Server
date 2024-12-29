import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITeacher extends Document {
    engName: string;
    faName: string;
    tags: string[];
    description?: string;
    longDescription: string;
    avatar: { imageName: string; imageUrl: string },
    courses: mongoose.Schema.Types.ObjectId[]; // ارتباط یک به چند با دوره‌ها
    academies: mongoose.Schema.Types.ObjectId[]; // ارتباط چند به چند با آکادمی‌ها
    seoMeta: { title: string; description: string; keywords: string[] }; // اطلاعات سئو
    
    // اینا همه باید با کرون جاب حساب بشن
    rating: number;
    ratingNumber: number;
    totalStudents: number;
    totalAcademies:number;
    totalCourses:number;
}

const teacherSchema: Schema<ITeacher> = new mongoose.Schema({
    engName: { type: String, required: false },
    faName: { type: String, required: false },
    tags: String,
    description: String,
    longDescription: String,
    avatar: {imageName: String,imageUrl: String},
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // اشاره به دوره‌ها
    academies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Academy' }], // اشاره به آکادمی‌ها
    seoMeta: { title: String, description: String, keywords: [String] },
    
    rating: { type: Number, default: 0 },
    ratingNumber: { type: Number, default: 0 },
    totalStudents: { type: Number, default: 0 },
    totalAcademies: { type: Number, default: 0 },
    totalCourses: { type: Number, default: 0 },

}, { timestamps: true });

const TeacherModel: Model<ITeacher> = mongoose.model('Teacher', teacherSchema);

export default TeacherModel;
