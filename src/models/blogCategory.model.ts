import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICategory extends Document {
    name: string;
    slug: string;
    avatar: { imageName: string; imageUrl: string };
}

const blogCategorySchema: Schema<ICategory> = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // نام دسته‌بندی باید منحصر به فرد باشد
        index: true, // ایندکس برای جستجوهای سریع‌تر
    },
    slug: {
        type: String,
        required: true,
        unique: true, // نام دسته‌بندی باید منحصر به فرد باشد
        index: true, // ایندکس برای جستجوهای سریع‌تر
    },
    avatar: {
        imageName: {
            type: String,
            default: '',
            validate: {
                validator: function (v: string) {
                    return /\.(jpg|jpeg|png|gif)$/i.test(v);
                },
                message: 'فرمت فایل تصویر نامعتبر است!'
            }
        },
        imageUrl: { type: String, default: '' },
    },
}, { timestamps: true });

// اضافه کردن ایندکس‌های ترکیبی برای جستجوهای پیشرفته
blogCategorySchema.index({ name: 1, }); // جستجو بر اساس نام و دسته‌بندی والد

const BlogCategoryModel: Model<ICategory> = mongoose.model('BlogCategory', blogCategorySchema);

export default BlogCategoryModel;


