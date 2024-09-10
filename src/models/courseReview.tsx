import mongoose, { Document, Model, Schema } from "mongoose";
import { IUser } from "./user.model";
// فرض بر این است که مدل Course را در این فایل داریم

interface IComment extends Document {
    user: mongoose.Schema.Types.ObjectId; // استفاده از ObjectId برای ارتباط با مدل User
    comment: string;
    commentsReplies?: IComment[];
}

interface ICourseReview extends Document {
    user: mongoose.Schema.Types.ObjectId; // استفاده از ObjectId برای ارتباط با مدل User
    courseId: mongoose.Schema.Types.ObjectId; // ارتباط با مدل Course
    rating?: number;
    comment: string;
    show: boolean;
    commentsReplies?: IComment[];
}


const commentSchema = new Schema<IComment>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ارتباط با User
    comment: { type: String, required: true },
    commentsReplies: [this] // ارتباط خودارجاع برای پاسخ‌ها
})

const courseReviewSchema = new Schema<ICourseReview>({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ارتباط با User
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }, // ارتباط با Course
    show: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        default: 0
    },
    comment: { type: String, required: true },
    commentsReplies: [commentSchema] // آرایه‌ای از نظرات پاسخ
}, { timestamps: true })

const CourseReviewModel: Model<ICourseReview> = mongoose.model('CourseReview', courseReviewSchema);

export default CourseReviewModel;
