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
    additionalInfo: string,
    notice: string
}


const linkSchema = new Schema<ILink>({
    title: String,
    url: String
})

const fileSchema = new Schema<IFile>({
    fileTitle: String,
    fileName: String,
})

const SectionSchema = new Schema<ISection>({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    sectionName: String,
    sectionLinks: [linkSchema],
    sectionFiles: [fileSchema],
    totalLessons: Number,
    totalLength: Number,
    order: { type: Number, required: true },
    isFree: { type: Boolean, default: false },
    additionalInfo: { type: String },
    notice: String
}, { timestamps: true })


const SectionModel: Model<ISection> = mongoose.model<ISection>("Section", SectionSchema);

export default SectionModel;