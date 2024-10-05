import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import TeacherModel from "../models/teacher.model";
import randomLetterGenerator from '../utils/randomName';
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import AcademyModel from "../models/academy.model";
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




const getAcademies = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const academies = await AcademyModel.find({})

        res.status(200).json({ academies, success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

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
                    totalTeachers: -1  // مرتب‌سازی بر اساس تعداد مدرسین
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


        res.status(200).json({ academies, success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})


export {
    getAcademies,
    getHomeFavoritAcadmy
}