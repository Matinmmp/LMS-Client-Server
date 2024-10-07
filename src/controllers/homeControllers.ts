import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import TeacherModel from "../models/teacher.model";
import AcademyModel from "../models/academy.model";
import CourseModel from "../models/course.model";
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
import Fuse from "fuse.js";
import _ from "lodash";
import CategoryModel from "../models/category.model";



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


const fuseOptions = {
    includeScore: true,
    shouldSort: true,
    threshold: 0.5, // سطح تطابق، عدد کمتر یعنی جستجوی دقیق‌تر
    keys: [
        "engName", // برای معلمین و آکادمی‌ها
        "faName",  // برای معلمین و آکادمی‌ها
        "tags",    // برای دوره‌ها و آکادمی‌ها
        "name",    // برای دوره‌ها و دسته‌بندی‌ها
        "description", // توضیحات
    ]
};

 const homeSearch = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== "string") {
            return res.status(400).json({ success: false, message: "Query is required" });
        }

        // 1. دریافت تمام داده‌ها از مدل‌های موردنظر
        const [teachers, academies, courses, categories] = await Promise.all([
            TeacherModel.find({}).lean(),
            AcademyModel.find({}).lean(),
            CourseModel.find({}).lean(),
            CategoryModel.find({}).lean(),
        ]);

        // 2. استفاده از Fuse.js برای جستجوی فازی
        const fuse = new Fuse([...teachers, ...academies, ...courses, ...categories], fuseOptions);
        const searchResults = fuse.search(query);
        console.log(searchResults);

        // 3. مرتب‌سازی نتایج براساس محبوبیت (به‌عنوان مثال براساس تعداد دانشجویان یا امتیازات)
        const sortedResults = _.orderBy(searchResults, (result:any) => {
            const item:any = result.item;
            if (item.students) return item.students;  // محبوبیت براساس تعداد دانشجویان
            if (item.rates) return item.rates;        // یا براساس امتیاز
            return 0;
        }, ['desc']);

        // 4. جدا کردن نتایج در سه لیست: معلمین، دوره‌ها و آکادمی‌ها
        const teacherResults = sortedResults.filter((result) => result.item.engName || result.item.faName);
        const academyResults = sortedResults.filter((result) => result.item.tags && result.item.courses);
        const courseResults = sortedResults.filter((result) => result.item.name && result.item.academyId);

        // 5. ارسال نتایج به کاربر
        res.status(200).json({
            success: true,
            teachers: teacherResults.map(result => result.item),
            academies: academyResults.map(result => result.item),
            courses: courseResults.map(result => result.item),
        });
    } catch (error:any) {
        res.status(500).json({ success: false, message: error.message });
    }
});



export {
    getHomeFavoritAcadmy,
    getHomeLastCourses,
    getHomeFavoritCourses,
    getHomeFavoritTeachers,
    homeSearch
}