import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import TeacherModel from "../models/teacher.model";
import { redis } from "../utils/redis";


 
const CACHE_EXPIRATION = 86400; // 24 ساعت (86400 ثانیه)

const getTeachers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = 'teachers_all'; // کلید کش برای نگهداری اطلاعات مدرسین

        // 1. بررسی کش Redis برای داده‌های موجود
        const cachedTeachers = await redis.get(cacheKey);
        if (cachedTeachers) {
            return res.status(200).json({ teachers: JSON.parse(cachedTeachers), success: true });
        }

        // 2. واکشی داده‌ها از MongoDB در صورت نبودن کش
        const teachers = await TeacherModel.aggregate([
            {
                $lookup: {
                    from: 'courses', // اتصال به جدول دوره‌ها
                    localField: '_id',
                    foreignField: 'teacherId',
                    as: 'courseData'
                }
            },
            {
                $addFields: {
                    totalCourses: { $size: "$courseData" }, // تعداد دوره‌ها
                    totalStudents: { $sum: "$courseData.students" } // مجموع دانشجویان از دوره‌ها
                }
            },
            {
                $sort: {
                    totalStudents: -1, // مرتب‌سازی بر اساس تعداد دانشجویان از بیشترین به کمترین
                    totalCourses: -1   // مرتب‌سازی بر اساس تعداد دوره‌ها از بیشترین به کمترین
                }
            },
            {
                $project: {
                    engName: 1,
                    faName: 1,
                    description: 1,
                    "avatar.imageUrl": 1,
                    rates: 1,
                    totalStudents: 1,
                    totalCourses: 1
                }
            }
        ]);


        // 3. ذخیره داده‌ها در Redis با انقضای 24 ساعت
        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teachers));

        
        res.status(200).json({ teachers, success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});




export {
    getTeachers,

}