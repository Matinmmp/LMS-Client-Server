import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITeacher extends Document {
    name: string;
    description?: string;
    avatar: {
        imageName: string;
        imageUrl: string;
    },
    courses: mongoose.Schema.Types.ObjectId[]; // ارتباط یک به چند با دوره‌ها
    academies: mongoose.Schema.Types.ObjectId[]; // ارتباط چند به چند با آکادمی‌ها
    students: number;
    rates: number;
}

const teacherSchema: Schema<ITeacher> = new mongoose.Schema({
    name: String,
    description: String,
    avatar: {
        imageName: String,
        imageUrl: String
    },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // اشاره به دوره‌ها
    academies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Academy' }], // اشاره به آکادمی‌ها
    rates: {
        type: Number,
        default: 0
    },
    students: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

const TeacherModel: Model<ITeacher> = mongoose.model('Teacher', teacherSchema);

export default TeacherModel;
