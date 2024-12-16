import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import AcademyModel from "../models/academy.model";
import { redis } from "../utils/redis";
import CourseModel from "../models/course.model";
import TeacherModel from "../models/teacher.model";

require('dotenv').config();


const CACHE_EXPIRATION = 86400; // 24 ساعت (86400 ثانیه)

const getAcademies = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = 'academies_all';

        const cachedAcademies = await redis.get(cacheKey);
        if (cachedAcademies) {
            return res.status(200).json({ academies: JSON.parse(cachedAcademies), success: true });
        }

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
                    longDescriptions: 1,
                    "avatar.imageUrl": 1,
                    rates: 1,
                    totalStudents: 1,
                    totalTeachers: 1,
                    totalCourses: 1,

                }
            }
        ]);

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academies));

        res.status(200).json({ academies, success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

const getAcademyByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const academyEngName = req.params.name;
        const cacheKey = `academy:${academyEngName}`;

        const cachedAcademy = await redis.get(cacheKey);
        if (cachedAcademy) {
            return res.status(200).json({ success: true, academy: JSON.parse(cachedAcademy) });
        }

        const academies = await AcademyModel.aggregate([
            {
                $match: { engName: academyEngName }, // پیدا کردن آکادمی بر اساس engName
            },
            {
                $lookup: {
                    from: 'teachers', // نام مجموعه مرتبط با مدرسین
                    localField: '_id', // ارتباط با آکادمی از طریق _id
                    foreignField: 'academies', // ارتباط با فیلد academies در Teacher
                    as: 'teacherData', // داده‌های مدرسین را در teacherData قرار می‌دهیم
                }
            },
            {
                $lookup: {
                    from: 'courses', // نام مجموعه مرتبط با دوره‌ها
                    localField: '_id',
                    foreignField: 'academyId', // ارتباط با فیلد academyId در Course
                    as: 'courseData', // داده‌های دوره‌ها را در courseData قرار می‌دهیم
                }
            },
            {
                $addFields: {
                    totalTeachers: { $size: "$teacherData" }, // شمارش تعداد مدرسین
                    totalStudents: { $sum: "$courseData.students" }, // جمع تعداد دانشجویان در دوره‌ها
                    totalCourses: { $size: "$courseData" }, // شمارش تعداد دوره‌ها
                }
            },
            {
                $project: {
                    engName: 1, // انتخاب فیلدهای مورد نیاز برای بازگشت
                    faName: 1,
                    description: 1,
                    longDescription: 1,
                    "avatar.imageUrl": 1,
                    rates: 1,
                    totalStudents: 1,
                    totalTeachers: 1,
                    totalCourses: 1,
                }
            }
        ]);

        const academy = academies[0];

        if (!academy) {
            return res.status(404).json({ success: false, message: "Academy not found" });
        }

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academy));

        res.status(200).json({ success: true, academy });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const getAcademyCoursesByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const academyEngName = req.params.name;
        const cacheKey = `academy:${academyEngName}:topCourses`;

        const cachedCourses = await redis.get(cacheKey);
        if (cachedCourses) {
            return res.status(200).json({ success: true, courses: JSON.parse(cachedCourses) });
        }
        const academy = await AcademyModel.findOne({ engName: academyEngName }).lean();

        if (!academy) {
            return res.status(404).json({ success: false, message: "Academy not found" });
        }

        const courses = await CourseModel.aggregate([
            {
                $match: { showCourse: true, academyId: academy._id }
            },
            {
                $sort: {
                    purchased: -1, // مرتب‌سازی بر اساس بیشترین purchased
                    ratings: -1    // در صورت تساوی در purchased، بر اساس بیشترین ratings مرتب‌سازی می‌شود
                }
            },
            {
                $limit: 8 
            },
            {
                $lookup: {
                    from: 'teachers', // اتصال به جدول Teacher
                    localField: 'teacherId', // فیلد مرتبط در Course
                    foreignField: '_id', // فیلد مرتبط در Teacher
                    as: 'teacherData' // اطلاعات مدرسین را در این فیلد ذخیره می‌کنیم
                }
            },
            {
                $lookup: {
                    from: 'academies', // اتصال به جدول Academy
                    localField: 'academyId', // فیلد مرتبط در Course
                    foreignField: '_id', // فیلد مرتبط در Academy
                    as: 'academyData' // اطلاعات آکادمی‌ها را در این فیلد ذخیره می‌کنیم
                }
            },
            {
                $addFields: {

                    teacher: {
                        teacherEngName: { $arrayElemAt: ["$teacherData.engName", 0] },
                        teacherId: { $arrayElemAt: ["$teacherData._id", 0] },
                    },
                    academy: {
                        academyEngName: { $arrayElemAt: ["$academyData.engName", 0] },
                        academyId: { $arrayElemAt: ["$academyData._id", 0] },
                    }
                }
            },
            {
                $project: {
                    totalVideos: 1,
                    isInVirtualPlus: 1,
                    "discount.percent": 1,
                    "discount.expireTime": 1,
                    status: 1,
                    ratings: 1,
                    level: 1,
                    "thumbnail.imageUrl": 1,
                    description: 1,
                    name: 1,
                    teacher: 1,
                    academy: 1,
                    courseLength: 1,
                    price: 1,
                    totalLessons:1,

                }
            }
        ]);

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(courses));

        res.status(200).json({ success: true, courses });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500)); // مدیریت خطا
    }
});

const getAcademyTeachersByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const academyEngName = req.params.name;
        const cacheKey = `academy:${academyEngName}:topTeachers`;

        const cachedTeachers = await redis.get(cacheKey);
        if (cachedTeachers) {
            return res.status(200).json({ success: true, teachers: JSON.parse(cachedTeachers) });
        }

        const academy = await AcademyModel.findOne({ engName: academyEngName }).lean();

        if (!academy) {
            return res.status(404).json({ success: false, message: "Academy not found" });
        }

        const teachers = await TeacherModel.aggregate([
            { $match: { academies: academy._id } },
            {
                $lookup: {
                    from: 'courses', // اتصال به جدول دوره‌ها
                    localField: '_id', // از teacherId در جدول teachers
                    foreignField: 'teacherId', // اتصال به teacherId در جدول courses
                    as: 'courseData'
                }
            },
            {
                $addFields: {
                    totalCourses: { $size: "$courseData" }, // محاسبه تعداد دوره‌ها برای هر مدرس
                    totalStudents: { $sum: "$courseData.students" } // محاسبه مجموع دانشجویان از دوره‌ها
                }
            },
            {
                $sort: {
                    totalStudents: -1, // مرتب‌سازی بر اساس تعداد دانشجویان (بیشترین به کمترین)
                    totalCourses: -1   // مرتب‌سازی بر اساس تعداد دوره‌ها (بیشترین به کمترین)
                }
            },
            { $limit: 6 },
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

        if (!teachers.length) {
            return res.status(404).json({ success: false, message: "No teachers found for this academy" });
        }
        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teachers));
        res.status(200).json({ success: true, teachers });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const getAllAcademyNames = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = 'academies_name_all';

        const cachedAcademies = await redis.get(cacheKey);
        if (cachedAcademies) {
            return res.status(200).json({ academiesName: JSON.parse(cachedAcademies), success: true });
        }

        const academiesName = await AcademyModel.find({}).select("engName -_id")

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academiesName));

        res.status(200).json({ academiesName, success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export {
    getAcademies,
    getAcademyByEngName,
    getAcademyCoursesByEngName,
    getAcademyTeachersByEngName,
    getAllAcademyNames

}