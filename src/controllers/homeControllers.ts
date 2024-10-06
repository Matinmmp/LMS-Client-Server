import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import TeacherModel from "../models/teacher.model";
import randomLetterGenerator from '../utils/randomName';
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import AcademyModel from "../models/academy.model";
import CourseModel from "../models/course.model";
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// قابل کش

const getHomeFavoritAcadmy = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const academies = await AcademyModel.aggregate([
            {
                $limit: 9 // Limiting the result to 12 academies
            },
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


        setTimeout(() => {
            res.status(200).json({
                success: true,
                academies
            });
        }, 2000)

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

// قابل کش
const getHomeLastCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courses = await CourseModel.aggregate([
            {
                $match: { showCourse: true }
            },
            {
                $sort: { updatedAt: -1 } // مرتب‌سازی بر اساس آخرین آپدیت
            },
            {
                $limit: 16 // محدود به 16 دوره
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
                    courseLength: {
                        $sum: {
                            $map: {
                                input: "$courseData", // فیلد courseData که شامل ویدیوها است
                                as: "courseItem",
                                in: { $toInt: "$$courseItem.videoLength" } // جمع کردن طول ویدیوها
                            }
                        }
                    },

                    teacher: {
                        teacherFaName: { $arrayElemAt: ["$teacherData.faName", 0] },
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

                }
            }
        ]);

        setTimeout(() => {
            res.status(200).json({
                success: true,
                courses
            });
        }, 2000)

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

// قابل کش
const getHomeFavoritCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const courses = await CourseModel.aggregate([
            {
                $match: { showCourse: true }
            },
            {
                $sort: {
                    purchased: -1, // مرتب‌سازی بر اساس بیشترین purchased
                    ratings: -1    // در صورت تساوی در purchased، بر اساس بیشترین ratings مرتب‌سازی می‌شود
                }
            },
            {
                $limit: 16 // محدود به 16 دوره
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
                    courseLength: {
                        $sum: {
                            $map: {
                                input: "$courseData", // فیلد courseData که شامل ویدیوها است
                                as: "courseItem",
                                in: { $toInt: "$$courseItem.videoLength" } // جمع کردن طول ویدیوها
                            }
                        }
                    },

                    teacher: {
                        teacherFaName: { $arrayElemAt: ["$teacherData.faName", 0] },
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

                }
            }
        ]);

        setTimeout(() => {
            res.status(200).json({
                success: true,
                courses
            });
        }, 2000)


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

// قابل کش
const getHomeFavoritTeachers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const teachers = await TeacherModel.aggregate([
            {
                $limit: 9 // Limiting the result to 12 academies
            },
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


        setTimeout(() => {
            res.status(200).json({
                success: true,
                teachers
            });
        }, 2000)

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

export {
    getHomeFavoritAcadmy,
    getHomeLastCourses,
    getHomeFavoritCourses,
    getHomeFavoritTeachers
}