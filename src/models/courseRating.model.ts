import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICourseRating extends Document {
    courseId: mongoose.Schema.Types.ObjectId; // آیدی دوره
    userId: mongoose.Schema.Types.ObjectId; // آیدی کاربر
    rating: number; // امتیاز (بین ۰ تا ۵)
}

const courseRatingSchema: Schema<ICourseRating> = new Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course", // ارتباط با مدل Course
        required: true,
        index: true, // اضافه کردن ایندکس
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // ارتباط با مدل User
        required: true,
        index: true, // اضافه کردن ایندکس
    },
    rating: {
        type: Number,
        required: true,
        min: 0, // حداقل امتیاز
        max: 5, // حداکثر امتیاز
    },
}, { timestamps: true });

// اضافه کردن ایندکس ترکیبی برای جلوگیری از امتیازدهی تکراری
courseRatingSchema.index({ courseId: 1, userId: 1 }, { unique: true });

const CourseRatingModel: Model<ICourseRating> = mongoose.model<ICourseRating>("CourseRating", courseRatingSchema);

export default CourseRatingModel;