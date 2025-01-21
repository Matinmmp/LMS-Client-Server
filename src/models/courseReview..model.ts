import mongoose, { Document, Model, Schema } from "mongoose";

interface IComment extends Document {
  userId: mongoose.Schema.Types.ObjectId; // استفاده از ObjectId برای ارتباط با مدل User
  comment: string;
  commentsReplies?: IComment[]; // لیستی از پاسخ‌ها
  show: boolean;
}

interface ICourseReview extends Document {
  userId: mongoose.Schema.Types.ObjectId; // استفاده از ObjectId برای ارتباط با مدل User
  courseId: mongoose.Schema.Types.ObjectId; // ارتباط با مدل Course
  comment: string;
  show: boolean;
  commentsReplies?: IComment[]; // لیستی از نظرات پاسخ
}

// تعریف اسکیمای کامنت (با توجه به خودارجاع بودن)
const commentSchema = new Schema<IComment>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, // ارتباط با User
    comment: { type: String, required: true },
    commentsReplies: [{ type: mongoose.Schema.Types.Mixed }], // آرایه‌ای از پاسخ‌ها
    show: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// تعریف اسکیمای نظرات دوره
const courseReviewSchema = new Schema<ICourseReview>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ارتباط با User
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true }, // ارتباط با Course
    show: { type: Boolean, default: false },
    comment: { type: String, required: true },
    commentsReplies: [commentSchema], // آرایه‌ای از اسکیمای کامنت برای پاسخ‌ها
  },
  { timestamps: true }
);

const CourseReviewModel: Model<ICourseReview> = mongoose.model("CourseReview", courseReviewSchema);

export default CourseReviewModel;
