import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import CategoryModel from "../models/category.model.js";
import AcademyModel from "../models/academy.model.js";
import TeacherModel from "../models/teacher.model.js";

const getCat_Ac_Teach = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
     

        const academies = await AcademyModel.aggregate([
            {
                $lookup: {
                    from: 'teachers', // اتصال به جدول Teacher
                    localField: 'teachers',
                    foreignField: '_id',
                    as: 'teacherData'
                }
            },
            {
                $addFields: {
                    courseCount: { $size: "$courses" }, // تعداد دوره‌ها
                    teacherCount: { $size: "$teachers" }, // تعداد مدرسین
                    totalStudents: { $sum: "$teacherData.students" } // مجموع دانشجویان مدرسین
                }
            },
            {
                $sort: {
                    rates: -1,           // امتیاز از بالا به پایین
                    courseCount: -1,     // تعداد دوره‌ها از بالا به پایین
                    teacherCount: -1,    // تعداد مدرسین از بالا به پایین
                    totalStudents: -1    // مجموع دانشجویان از بالا به پایین
                }
            },
            {
                $project: {
                    engName: 1,
                    faName: 1,
                    imageUrl: "$avatar.imageUrl", // فقط imageUrl را برمی‌گردانیم
                    _id: 0 // حذف فیلد _id از خروجی
                }
            }
        ]);
        const totalAcademyCount = await AcademyModel.countDocuments();

        const teachers = await TeacherModel.aggregate([
            {
                $addFields: {
                    courseCount: { $size: "$courses" }, // تعداد دوره‌ها
                    studentCount: "$students", // تعداد دانشجویان
                    rateCount: "$rates" // امتیاز معلم
                }
            },
            {
                $sort: {
                    rateCount: -1,      // امتیاز از بالا به پایین
                    courseCount: -1,    // تعداد دوره‌ها از بالا به پایین
                    studentCount: -1    // تعداد دانشجویان از بالا به پایین
                }
            },
            {
                $project: {
                    engName: 1,
                    faName: 1,
                    imageUrl: "$avatar.imageUrl", // فقط imageUrl را برمی‌گردانیم
                    _id: 0 // حذف فیلد _id از خروجی
                }
            }
        ]);
        const totalTeacherCount = await TeacherModel.countDocuments();


        const categories = await CategoryModel.find({}).select('name _id parentCategoryId');

        const data = {
            academyObject: {
                academyList: academies,
                total: totalAcademyCount
            },
            teacherObject: {
                teacherList: teachers,
                total: totalTeacherCount
            },

            categoryObject: {
                categoryList: categories
            }

        };

        res.status(201).json({
            success: true,
            data
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

export {
    getCat_Ac_Teach
}