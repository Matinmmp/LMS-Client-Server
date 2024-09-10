import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICategory extends Document {
    name: string;
    parentCategoryId?: mongoose.Schema.Types.ObjectId; // اشاره به دسته‌بندی والد
}

const categorySchema: Schema<ICategory> = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    parentCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category', // اشاره به دسته‌بندی والد
        default: null,
    }
}, { timestamps: true });

const CategoryModel: Model<ICategory> = mongoose.model('Category', categorySchema);

export default CategoryModel;
