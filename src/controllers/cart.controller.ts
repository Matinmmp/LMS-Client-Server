import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";

const getCoursesByIds = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { courseIds } = req.body;

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return next(new ErrorHandler("لطفاً آرایه‌ای از آیدی‌های دوره‌ها ارسال کنید", 400));
    }

    // بررسی معتبر بودن آیدی‌ها
    const validIds = courseIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
        return next(new ErrorHandler("هیچ آیدی معتبری یافت نشد", 400));
    }

    // واکشی اطلاعات دوره‌ها
    const courses = await CourseModel.find(
        { _id: { $in: validIds } },
        {
            urlName: 1,
            name: 1,
            faName: 1,
            price: 1,
            discount: 1,
            "thumbnail.imageUrl": 1, // انتخاب فیلدهای مورد نیاز
        }
    ).lean();
    // console.log(courses)
    res.status(200).json({
        success: true,
        courses,
    });
});

export {
    getCoursesByIds
}