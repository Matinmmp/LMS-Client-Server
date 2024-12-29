import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import TeacherModel from "../models/teacher.model";
import AcademyModel from "../models/academy.model";
import CourseModel from "../models/course.model";
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
import Fuse from "fuse.js";
import _ from "lodash";

import { redis } from "../utils/redis";



// قابل کش

const getHomeFavoritAcadmy = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const academies = await AcademyModel.find({}, {
            engName: 1, // انتخاب فیلدهای مورد نیاز
            faName: 1,
            description: 1,
            "avatar.imageUrl": 1,
            rating: 1,
            ratingNumber: 1,
            totalStudents: 1,
            totalTeachers: 1,
            totalCourses: 1,
        }).sort({ totalStudents: -1 }).limit(9);

        res.status(200).json({
            success: true,
            academies
        });

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
                $limit: 12 // محدود به 16 دوره
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
                    totalLessons: 1,
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
                    urlName: 1,

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
                $limit: 12
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
                    totalLessons: 1,
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
                    urlName: 1

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

// قابل کش
const getHomeFavoritTeachers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const teachers = await TeacherModel.find({}, {
            engName: 1, // انتخاب فیلدهای مورد نیاز
            faName: 1,
            description: 1,
            "avatar.imageUrl": 1,
            rating: 1,
            ratingNumber: 1,
            totalStudents: 1,
            totalCourses: 1,
        }).sort({ totalStudents: -1 }).limit(9);


        res.status(200).json({
            success: true,
            teachers
        });


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})


// const CACHE_EXPIRATION = 5 * 60 * 60; // به ثانیه (۲ ساعت)

// const getOrSetCache = async (key: string, fetchFunction: () => Promise<any>) => {
//     const cachedData = await redis.get(key);
//     if (cachedData) {
//         return JSON.parse(cachedData);
//     }

//     const freshData = await fetchFunction();
//     await redis.setex(key, CACHE_EXPIRATION, JSON.stringify(freshData));

//     return freshData;
// };

// const fuseOptions = {
//     includeScore: true,
//     shouldSort: true,
//     threshold: 0.3, // سطح تطابق، عدد کمتر یعنی جستجوی دقیق‌تر
//     keys: [
//         "engName", // برای معلمین و آکادمی‌ها
//         "faName",  // برای معلمین و آکادمی‌ها
//         "tags",    // برای دوره‌ها و آکادمی‌ها
//         "name",    // برای دوره‌ها و دسته‌بندی‌ها
//     ]
// };


// // Endpoint جستجو
// const homeSearch = async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const { query } = req.query;

//         if (!query || typeof query !== "string") {
//             return res.status(400).json({ success: false, message: "Query is required" });
//         }

//         // 1. بررسی cache برای جستجو
//         const cacheKey = `search:${query}`;
//         const cachedResults = await redis.get(cacheKey);
//         if (cachedResults) {
//             return res.status(200).json({ success: true, ...JSON.parse(cachedResults) });
//         }

//         // 2. کش کردن داده‌های teachers, academies و courses
//         const [teachers, academies, courses] = await Promise.all([
//             getOrSetCache("teachersforhomesearch", () => TeacherModel.find({}, 'faName engName avatar.imageUrl').lean()),
//             getOrSetCache("academiesforhomesearch", () => AcademyModel.find({}, 'faName engName avatar.imageUrl').lean()),
//             getOrSetCache("coursesforhomesearch", () => CourseModel.find({}, 'name thumbnail.imageUrl tags').lean())
//         ]);

//         // 3. استفاده از Fuse.js برای جستجوی فازی
//         const fuse = new Fuse([...teachers, ...academies, ...courses], fuseOptions);
//         let searchResults = fuse.search(query);

//         // 4. مرتب‌سازی نتایج بر اساس محبوبیت (تعداد دانشجویان، امتیاز)
//         const sortedResults = _.orderBy(searchResults, (result: any) => {
//             const item: any = result.item;
//             if (item.students) return item.students;
//             if (item.rates) return item.rates;
//             return 0;
//         }, ['desc']);

//         // 5. جدا کردن نتایج و محدود کردن هر لیست به 5 نتیجه
//         const teacherResults = sortedResults.filter(result => result.item.fName || result.item.engName).slice(0, 5);
//         const academyResults = sortedResults.filter(result => result.item.engName || result.item.faName).slice(0, 5);
//         const courseResults = sortedResults.filter(result => result.item.name).slice(0, 5);

//         // 6. اگر هیچ دوره‌ای پیدا نشد، جستجو در دسته‌بندی‌ها (Category)
//         if (courseResults.length === 0) {
//             const categoryMatch = await CategoryModel.findOne({ name: new RegExp(query, 'i') });
//             if (categoryMatch) {
//                 const relatedCourses = await CourseModel.find({ categoryIds: categoryMatch._id }, 'name thumbnail.imageUrl').lean();
//                 const relatedTeachers = await TeacherModel.find({ _id: { $in: relatedCourses.map(course => course.teacherId) }}, 'faName engName avatar.imageUrl').lean();
//                 const relatedAcademies = await AcademyModel.find({ _id: { $in: relatedCourses.map(course => course.academyId) }}, 'faName engName avatar.imageUrl').lean();

//                 const resultData = {
//                     teachers: relatedTeachers.slice(0, 5),
//                     academies: relatedAcademies.slice(0, 5),
//                     courses: relatedCourses.slice(0, 5),
//                 };

//                 // ذخیره نتایج در cache
//                 await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(resultData));

//                 return res.status(200).json({ success: true, ...resultData });
//             }
//         }

//         // 7. ذخیره نتایج در cache برای جستجو
//         const resultData = {
//             teachers: teacherResults.map(result => result.item),
//             academies: academyResults.map(result => result.item),
//             courses: courseResults.map(result => result.item),
//         };

//         await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(resultData));

//         // 8. ارسال نتایج به کاربر
//         res.status(200).json({ success: true, ...resultData });

//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };


const CACHE_EXPIRATION = 2 * 60 * 60; // ۲ ساعت

// تابع کمکی برای ذخیره داده در cache با کلید و مدت زمان مشخص
const getOrSetCache = async (key: string, fetchFunction: () => Promise<any>) => {
    const cachedData = await redis.get(key);
    if (cachedData) {
        return JSON.parse(cachedData);
    }

    const freshData = await fetchFunction();
    await redis.setex(key, CACHE_EXPIRATION, JSON.stringify(freshData));

    return freshData;
};

const homeSearch = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== "string") {
            return res.status(400).json({ success: false, message: "Query is required" });
        }

        // 1. بررسی cache برای جستجوی دوره‌ها
        // const cacheKey = `courses:search:${query}`;
        // const cachedCourses = await redis.get(cacheKey);
        // if (cachedCourses) {
        //     return res.status(200).json({ success: true, courses: JSON.parse(cachedCourses) });
        // }

        // 2. کش کردن داده‌های دوره‌ها با اطلاعات مربی و فیلد tags برای جستجو
        const courses = await getOrSetCache("courses_for_home_search", () =>
            CourseModel.find({}, 'name urlName thumbnail.imageUrl tags ratings teacherId') // انتخاب tags برای جستجو و teacherId برای مربی
                .populate('teacherId', 'engName faName') // اضافه کردن اطلاعات مربی بدون _id
                .lean()
        );

        // 3. استفاده از Fuse.js برای جستجوی فازی
        const fuse = new Fuse(courses, { keys: ['name', 'tags', 'teacher.engName', 'teacher.faName'], includeScore: true }); // استفاده از tags در جستجو
        const searchResults = fuse.search(query);

        // 4. مرتب‌سازی نتایج بر اساس محبوبیت (تعداد دانشجویان، امتیاز)
        const sortedResults = _.orderBy(searchResults, (result: any) => {
            const item: any = result.item;
            if (item.students) return item.students; // فرض کنید اینجا تعداد دانشجویان را دارید
            if (item.ratings) return item.ratings; // فرض کنید اینجا امتیاز را دارید
            return 0;
        }, ['desc']);

        // 5. جدا کردن نتایج نهایی، حذف فیلدهای `tags` و `_id` از دوره و اطلاعات مربی
        const resultData = sortedResults.map(result => {
            const item = { ...result.item };

            // حذف فیلد tags از خروجی
            delete item.tags;

            // حذف فیلد _id از دوره
            delete item._id;

            // حذف فیلد _id از اطلاعات مربی (teacherId)
            if (item.teacherId) {
                delete item.teacherId._id; // حذف _id از داخل teacherId
            }

            return item;
        });

        // 6. ذخیره نتایج در cache فقط در صورتی که نتایج خالی نباشند
        // if (resultData.length > 0) {
        //     await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(resultData));
        // }

        // 7. ارسال نتایج به کاربر
        res.status(200).json({ success: true, courses: resultData });

    } catch (error: any) {
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