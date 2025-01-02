import mongoose, { Document, Model, Schema } from "mongoose";
 

interface IComment extends Document {
    userId: mongoose.Schema.Types.ObjectId; // استفاده از ObjectId برای ارتباط با مدل User
    comment: string;
    commentsReplies?: IComment[];
    show: boolean;
}

interface ICourseReview extends Document {
    userId: mongoose.Schema.Types.ObjectId; // استفاده از ObjectId برای ارتباط با مدل User
    blogId: mongoose.Schema.Types.ObjectId; // ارتباط با مدل Course
    comment: string;
    show: boolean;
    commentsReplies?: IComment[];
}


const commentSchema = new Schema<IComment>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ارتباط با User
    comment: { type: String, required: true },
    commentsReplies: [this] ,// ارتباط خودارجاع برای پاسخ‌ها
    show: { type: Boolean,default: false},

})

const courseReviewSchema = new Schema<ICourseReview>({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ارتباط با User
    blogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true }, // ارتباط با Blog
    show: { type: Boolean,default: false},
    comment: { type: String, required: true },
    commentsReplies: [commentSchema] // آرایه‌ای از نظرات پاسخ
}, { timestamps: true })

const BlogReviewModel: Model<ICourseReview> = mongoose.model('BlogReview', courseReviewSchema);

export default BlogReviewModel;
