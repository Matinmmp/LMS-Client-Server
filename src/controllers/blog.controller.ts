import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import CourseModel from "../models/course.model.js";
import BlogModel from "../models/blog.model.js";




const getRelatedBlogsByCourseName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseName = req.params.name;

        // یافتن دوره با نام مشخص
        const course:any = await CourseModel.findOne({ urlName: courseName }).lean();

        if (!course) {
            return res.status(404).json({ success: false, message: 'دوره‌ای با این نام یافت نشد' });
        }

        // بررسی خالی بودن فیلد relatedBlogs
        if (!course.relatedBlogs || course.relatedBlogs.length === 0) {
            return res.status(404).json({ success: false, message: 'بلاگی مرتبط با این دوره یافت نشد' });
        }


        const relatedBlogs = await BlogModel.find({ _id: { $in: course.relatedBlogs } })
            .select('title slug lastUpdated publishDate likes views thumbnail')
            .sort({ publishDate: -1 });

        // ارسال پاسخ
        res.status(200).json({
            success: true,
            blogs: relatedBlogs
        });
    } catch (error: any) {

        return next(new ErrorHandler(error.message, 500));
    }
});


export {
    getRelatedBlogsByCourseName
}