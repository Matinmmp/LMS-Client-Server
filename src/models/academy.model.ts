import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAcademy extends Document {
    name: string;
    description?: string;
    avatar: {
        imageName: string;
        imageUrl: string;
    },
    courses: mongoose.Schema.Types.ObjectId[]; // ارتباط یک به چند با دوره‌ها
    teachers: mongoose.Schema.Types.ObjectId[]; // ارتباط چند به چند با مدرسین
    rates: number;
}

const academySchema: Schema<IAcademy> = new mongoose.Schema({
    name: String,
    description: String,
    avatar: {
        imageName: String,
        imageUrl: String
    },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // اشاره به دوره‌ها
    teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }], // اشاره به مدرسین
    rates: {
        type: Number,
        default: 0
    },
}, { timestamps: true });

const AcademyModel: Model<IAcademy> = mongoose.model('Academy', academySchema);

export default AcademyModel;
