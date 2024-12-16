import mongoose, { Document, Model, Schema } from "mongoose";

interface ILink extends Document {
    title: string;
    url: string;
}

interface ILessonFile extends Document {
    fileTitle: string,//اسمش لحظه ی دانلود
    fileName: string;//اسمش داخل باکت
    fileDescription:string;
}

interface ILesson extends Document {
    courseId: mongoose.Schema.Types.ObjectId,
    courseSectionId: mongoose.Schema.Types.ObjectId,

    lessonType: string;
    lessonTitle: string,

    //اینا مربوط به خوده درس هستن
    lessonFile: ILessonFile//چه ویدیو چه فایل باشه میره این

    //اینا مربوط به اینه که اگه درس همزمان فایلی هم داشت
    attachedFile: [ILessonFile],


    //اگه این درس لینکی داره
    links: [ILink]

    lessonLength?: number,
    isFree: boolean,

    additionalInfo: string,
    notice: string,

    order: number,


}

const linkSchema = new Schema<ILink>({
    title: String,
    url: String
})

const fileSchema = new Schema<ILessonFile>({
    fileTitle: String,//اسمش لحظه ی دانلود
    fileName: String,//اسمش داخل باکت
    fileDescription:String,
})

const LessonSchema = new Schema<ILesson>({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
        required: true
    },
    courseSectionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CourseSection",
        required: true
    },
    lessonTitle: { type: String, required: true },
    lessonType: { type: String, enum: ["video", "quiz", "text", "file"], default: "video" },
    lessonFile: fileSchema, // فایل مربوط به درس (ویدیو یا فایل اصلی درس)
    attachedFile: [fileSchema], // فایل‌های پیوست‌شده به درس
    links: [linkSchema], // لینک‌های مرتبط با درس
    lessonLength: { type: Number }, // مدت زمان درس (بر حسب ثانیه یا دقیقه)
    isFree: { type: Boolean, default: false }, // آیا درس رایگان است؟
    additionalInfo: { type: String }, // توضیحات اضافه درس
    notice: { type: String }, // یادداشت یا هشدار مرتبط با درس
    order: { type: Number, required: true }, // ترتیب نمایش درس
}, { timestamps: true });

const LessonModel: Model<ILesson> = mongoose.model<ILesson>("Lesson", LessonSchema);

export default LessonModel;