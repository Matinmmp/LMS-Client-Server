import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import AcademyModel from "../models/academy.model";
import { redis } from "../utils/redis";
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

require('dotenv').config();


const client = new S3Client({
    region: "default",
    endpoint: process.env.LIARA_ENDPOINT,
    credentials: {
        accessKeyId: process.env.LIARA_ACCESS_KEY,
        secretAccessKey: process.env.LIARA_SECRET_KEY
    }
})


const CACHE_EXPIRATION = 86400; // 24 ساعت (86400 ثانیه)

const getAcademies = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = 'academies_all'; // کلید کش برای نگهداری اطلاعات مدرسین

        // 1. بررسی کش Redis برای داده‌های موجود
        const cachedAcademies = await redis.get(cacheKey);
        if (cachedAcademies) {
            return res.status(200).json({ academies: JSON.parse(cachedAcademies), success: true });
        }

        // 2. واکشی داده‌ها از MongoDB در صورت نبودن کش
        const academies = await AcademyModel.aggregate([

            {
                $lookup: {
                    from: 'teachers', // نام مجموعه (collection) مرتبط
                    localField: '_id', // ارتباط با فیلد آکادمی
                    foreignField: 'academies', // ارتباط با فیلد آکادمی در Teacher
                    as: 'teacherData' // داده‌های مدرسین
                }
            },
            {
                $lookup: {
                    from: 'courses', // Referencing the courses collection
                    localField: '_id',
                    foreignField: 'academyId', // Field in the course document that references academy
                    as: 'courseData'
                }
            },
            {
                $addFields: {
                    totalTeachers: { $size: "$teacherData" }, // Counting total teachers for each academy
                    totalStudents: { $sum: "$teacherData.students" }, // Summing the total number of students from teachers
                    totalCourses: { $size: "$courseData" }, // Counting the total number of courses
                }
            },
            {
                $sort: {
                    totalStudents: -1, // مرتب‌سازی بر اساس تعداد دانشجویان
                    totalTeachers: -1, // مرتب‌سازی بر اساس تعداد مدرسین
                    totalCourses: -1
                }
            },
            {
                $project: {
                    engName: 1, // فیلدهای مورد نیاز برای بازگشت
                    faName: 1,
                    description: 1,
                    "avatar.imageUrl": 1,
                    rates: 1,
                    totalStudents: 1,
                    totalTeachers: 1,
                    totalCourses: 1,

                }
            }
        ]);


        // 3. ذخیره داده‌ها در Redis با انقضای 24 ساعت
        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academies));


        res.status(200).json({ academies, success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});



const getAcademyByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const academyEngName = req.params.name; // دریافت engName از پارامترهای درخواست
        const cacheKey = `academy:${academyEngName}`; // کلید کش مخصوص این آکادمی

        // 1. بررسی کش Redis برای داده‌های موجود
        const cachedAcademy = await redis.get(cacheKey);
        if (cachedAcademy) {
            return res.status(200).json({ success: true, academy: JSON.parse(cachedAcademy) });
        }

        // 2. واکشی داده‌ها از MongoDB در صورت نبودن کش
        const academy = await AcademyModel.findOne({ engName: academyEngName }).lean().select('faName engName tags description avatar rates -_id');

        if (!academy) {
            return res.status(404).json({ success: false, message: "Academy not found" });
        }

        // 3. ذخیره داده‌ها در Redis با انقضای 24 ساعت
        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academy));

        // 4. ارسال داده‌ها به کاربر
        res.status(200).json({ success: true, academy });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500)); // مدیریت خطا
    }
});



export {
    getAcademies,
    getAcademyByEngName

}