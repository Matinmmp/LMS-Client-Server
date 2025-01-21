import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICategory extends Document {
    name: string;
    parentCategoryId?: mongoose.Schema.Types.ObjectId; // اشاره به دسته‌بندی والد
}

const categorySchema: Schema<ICategory> = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true, // نام دسته‌بندی باید منحصر به فرد باشد
        index: true, // ایندکس برای جستجوهای سریع‌تر
    },
    parentCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // اشاره به دسته‌بندی والد
        default: null,
        index: true, // ایندکس برای جستجوهای سریع‌تر
        validate: {
            validator: async function (value: mongoose.Schema.Types.ObjectId) {
                if (!value) return true; // اگر مقدار خالی بود، مشکلی نیست
                const category = await mongoose.model('Category').findById(value);
                return !!category; // بررسی وجود دسته‌بندی با این شناسه
            },
            message: "دسته‌بندی والد معتبر نیست.",
        },
    }
}, { timestamps: true });

// اضافه کردن ایندکس‌های ترکیبی برای جستجوهای پیشرفته
categorySchema.index({ name: 1, parentCategoryId: 1 }); // جستجو بر اساس نام و دسته‌بندی والد

const CategoryModel: Model<ICategory> = mongoose.model('Category', categorySchema);

export default CategoryModel;


