import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import randomLetterGenerator from "../utils/randomName";
import { error } from "console";
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



// get all courses
const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {


        const courses = await CourseModel.find().select('name folderName ratings purchased totalVideos');



        res.status(201).json({
            success: true,
            courses
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})



// get single course --- without purchasing
const getCourseById = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;

        const course = await CourseModel.findById(courseId);

        res.status(201).json({
            success: true,
            course
        })


    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 500));

    }
})

// edit course
const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const data = req.body;
        const thumbnail = data.thumbnail;
        const courseId = req.params.id;
        const courseData = await CourseModel.findById(courseId) as any;


        const course = await CourseModel.findByIdAndUpdate(courseId, { $set: data }, { new: true });


        res.status(201).json({
            success: true,
            course
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
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

        res.status(200).json({
            success: true,
            courses
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

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

        res.status(200).json({
            success: true,
            courses
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})

export {
    getAllCourses,
    getCourseById,
    editCourse,
    getHomeLastCourses,
    getHomeFavoritCourses
}