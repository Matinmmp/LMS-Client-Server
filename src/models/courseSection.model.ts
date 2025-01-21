import mongoose, { Document, Model, Schema } from "mongoose";

interface ILink extends Document {
    title: string;
    url: string;
}

interface IFile extends Document {
    fileTitle: string,
    fileName: string;
}

interface ISection extends Document {
    courseId: mongoose.Schema.Types.ObjectId,
    sectionName: string,
    sectionLinks: [ILink],
    sectionFiles: [IFile],
    totalLessons: number,
    totalLength: number,
    order: number,
    isFree: boolean,
    info: string,
    warning: string,
    error: string,
}


const linkSchema = new Schema<ILink>({
    title: {
        type: String,
        default: '',
    },
    url: {
        type: String,
        default: '',
    }
})

const fileSchema = new Schema<IFile>({
    fileTitle: {
        type: String,
        default: '',
    },
    fileName: {
        type: String,
        default: '',
    },
})

const SectionSchema = new Schema<ISection>({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true,
        index: true, // اضافه کردن ایندکس
    },
    sectionName: {
        type: String,
        default: '',
    },
    sectionLinks: [linkSchema],
    sectionFiles: [fileSchema],
    totalLessons: Number,
    totalLength: Number,
    order: {
        type: Number,
        required: true,
        index: true, // اضافه کردن ایندکس
    },
    isFree: { type: Boolean, default: false },
    info: {
        type: String,
        default: '',
    },
    warning: {
        type: String,
        default: '',
    },
    error: {
        type: String,
        default: '',
    },
}, { timestamps: true })


const CourseSectionModel: Model<ISection> = mongoose.model<ISection>("CourseSection", SectionSchema);

export default CourseSectionModel;