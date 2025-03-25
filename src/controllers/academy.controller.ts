import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import AcademyModel from "../models/academy.model";
import CourseModel from "../models/course.model";
import TeacherModel from "../models/teacher.model";



const CACHE_EXPIRATION = 86400 ; // 24 ساعت (86400 ثانیه)

const getAcademies = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // const cacheKey = 'academies_all';

        // const cachedAcademies = await redis.get(cacheKey);
        // if (cachedAcademies) {
        //     return res.status(200).json({ academies: JSON.parse(cachedAcademies), success: true });
        // }
 
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
        }).sort({ totalStudents: -1 });

        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academies));

        res.status(200).json({ academies, success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

const getAcademyByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const academyEngName = req.params.name;
        // const cacheKey = `academy:${academyEngName}`;

        // const cachedAcademy = await redis.get(cacheKey);
        // if (cachedAcademy) {
        //     return res.status(200).json({ success: true, academy: JSON.parse(cachedAcademy) });
        // }

        const academy = await AcademyModel.findOne({ engName: academyEngName }, {
            engName: 1, // انتخاب فیلدهای مورد نیاز
            faName: 1,
            description: 1,
            longDescription:1,
            "avatar.imageUrl": 1,
            rating: 1,
            ratingNumber: 1,
            totalStudents: 1,
            totalTeachers: 1,
            totalCourses: 1,
            seoMeta:1,
        });


        if (!academy) {
            return res.status(404).json({ success: false, message: "Academy not found" });
        }

        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academy));
   
        res.status(200).json({ success: true, academy });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const getAcademyCoursesByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const academyEngName = req.params.name;
        // const cacheKey = `academy:${academyEngName}:topCourses`;

        // const cachedCourses = await redis.get(cacheKey);
        // if (cachedCourses) {
        //     return res.status(200).json({ success: true, courses: JSON.parse(cachedCourses) });
        // }
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
                    rating: -1    // در صورت تساوی در purchased، بر اساس بیشترین ratings مرتب‌سازی می‌شود
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
                    _id: 0,
                    "academy.academyEngName": 1,
                    "teacher.teacherEngName": 1,
                    totalVideos: 1,
                    isInVirtualPlus: 1,
                    "discount.percent": 1,
                    "discount.expireTime": 1,
                    status: 1,
                    rating: 1,
                    level: 1,
                    "thumbnail.imageUrl": 1,
                    description: 1,
                    name: 1,
                    faName: 1,
                    courseLength: 1,
                    price: 1,
                    totalLessons: 1,
                    urlName: 1
                }
            }
        ]);


        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(courses));
        
        res.status(200).json({ success: true, courses });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500)); // مدیریت خطا
    }
});

const getAcademyTeachersByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const academyEngName = req.params.name;
        // const cacheKey = `academy:${academyEngName}:topTeachers`;

        // const cachedTeachers = await redis.get(cacheKey);
        // if (cachedTeachers) {
        //     return res.status(200).json({ success: true, teachers: JSON.parse(cachedTeachers) });
        // }

        const academy = await AcademyModel.findOne({ engName: academyEngName }).lean();

        if (!academy) {
            return res.status(404).json({ success: false, message: "Academy not found" });
        }
        const teachers = await TeacherModel.find({  academies: academy._id  }, {
            engName: 1, // انتخاب فیلدهای مورد نیاز
            faName: 1,
            description: 1,
            "avatar.imageUrl": 1,
            rating: 1,
            ratingNumber: 1,
            totalStudents: 1,
            totalCourses: 1,
        }).limit(3);



        if (!teachers.length) {
            return res.status(404).json({ success: false, message: "No teachers found for this academy" });
        }
        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teachers));
        res.status(200).json({ success: true, teachers });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const getAllAcademyNames = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // const cacheKey = 'academies_name_all';

        // const cachedAcademies = await redis.get(cacheKey);
        // if (cachedAcademies) {
        //     return res.status(200).json({ academiesName: JSON.parse(cachedAcademies), success: true });
        // }

        const academiesName = await AcademyModel.find({}).select("engName -_id")

        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academiesName));

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