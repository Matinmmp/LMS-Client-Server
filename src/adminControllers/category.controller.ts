import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CategoryModel from "../models/category.model";


interface ICreateCategory {
    name: string,
    parentCategoryId?: string
}


const createCategory = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { name, parentCategoryId } = req.body as ICreateCategory;

        if (!name)
            return next(new ErrorHandler('نام دسته بندی را وارد کنید', 400))

        let data: ICreateCategory = { name }

        if (parentCategoryId)
            data.parentCategoryId = parentCategoryId

        const category = await CategoryModel.create(data)

        res.status(201).json({ success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

const getCategories = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const categories = await CategoryModel.find({})
        
        res.status(200).json({ categories, success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

const deleteCategory = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
     
        // تابع بازگشتی برای پیدا کردن و حذف زیرمجموعه‌ها
        const deleteSubCategories = async (categoryId: string) => {
            // پیدا کردن تمامی زیرمجموعه‌ها
            const subCategories: any[] = await CategoryModel.find({ parentCategoryId: categoryId });
            // بازگشت برای هر زیرمجموعه و حذف آن‌ها
            for (const subCategory of subCategories) {
                await deleteSubCategories(subCategory._id.toString());
                await subCategory.deleteOne();
            }
        };

        // پیدا کردن دسته‌بندی اصلی
        const category: any = await CategoryModel.findById(id);

        if (!category) {
            return next(new ErrorHandler('دسته بندی پیدا نشد', 404));
        }

        // حذف زیرمجموعه‌های مرتبط
        await deleteSubCategories(category._id.toString());
       
        // حذف دسته‌بندی اصلی
        await category.deleteOne();
        
        res.status(200).json({ success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export {
    createCategory,
    getCategories,
    deleteCategory
}