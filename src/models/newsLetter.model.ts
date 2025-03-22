import mongoose, { Document, Model, Schema } from "mongoose";

interface INewsletter extends Document {
    email: string;
    sendMail: boolean;
}

const newsletterSchema: Schema<INewsletter> = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        validate: {
            validator: function (v: string) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
            },
            message: "لطفاً یک ایمیل معتبر وارد کنید!"
        }
    },
    sendMail: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const NewsletterModel: Model<INewsletter> = mongoose.model("Newsletter", newsletterSchema);

export default NewsletterModel;
