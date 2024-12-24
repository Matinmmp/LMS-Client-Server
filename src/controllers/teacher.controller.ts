import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import TeacherModel from "../models/teacher.model";
import { redis } from "../utils/redis";
import AcademyModel from "../models/academy.model";
import CourseModel from "../models/course.model";


const CACHE_EXPIRATION = 86400; // 24 ساعت (86400 ثانیه)


const getTeachers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = 'teachers_all';

        const cachedTeachers = await redis.get(cacheKey);
        if (cachedTeachers) {
            return res.status(200).json({ teachers: JSON.parse(cachedTeachers), success: true });
        }


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
                $lookup: {
                    from: 'academies', // اتصال به جدول آکادمی‌ها
                    localField: 'academies',
                    foreignField: '_id',
                    as: 'academyData'
                }
            },
            {
                $addFields: {
                    academyNames: "$academyData.engName" // ایجاد فیلد جدید فقط با `engName` از آکادمی‌ها
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
                    totalCourses: 1,
                    academyNames: 1 // نمایش لیست نام آکادمی‌ها
                }
            }
        ]);

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teachers));

        res.status(200).json({ teachers, success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

const getTeacherByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teacherEngName = req.params.name; 
        console.log(teacherEngName);
        const cacheKey = `teacher:${teacherEngName}`;

        const cachedTeacher = await redis.get(cacheKey);
        if (cachedTeacher) {
            return res.status(200).json({ success: true, teacher: JSON.parse(cachedTeacher) });
        }

        const teachers = await TeacherModel.aggregate([
            {
                $match: { engName: teacherEngName }, // پیدا کردن مدرس بر اساس engName
            },
            {
                $lookup: {
                    from: 'academies', // اتصال به جدول آکادمی‌ها
                    localField: 'academies', // آیدی‌های آکادمی در آرایه `academies` مدرس
                    foreignField: '_id', // ارتباط با فیلد `_id` در آکادمی‌ها
                    as: 'academyData' // داده‌های آکادمی‌ها در `academyData`
                }
            },
            {
                $lookup: {
                    from: 'courses', // اتصال به جدول دوره‌ها
                    localField: '_id', // از `_id` مدرس
                    foreignField: 'teacherId', // ارتباط با فیلد `teacherId` در دوره‌ها
                    as: 'courseData' // داده‌های دوره‌ها در `courseData`
                }
            },
            {
                $addFields: {
                    totalAcademies: { $size: "$academyData" }, // شمارش تعداد آکادمی‌ها
                    totalStudents: { $sum: "$courseData.students" }, // جمع تعداد دانشجویان از دوره‌ها
                    totalCourses: { $size: "$courseData" } // شمارش تعداد دوره‌ها
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
                    totalAcademies: 1,
                    totalCourses: 1
                }
            }
        ]);

        const teacher = teachers[0];

        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teacher));

        res.status(200).json({ success: true, teacher });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const getTeachersAcademiesByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teacherEngName = req.params.name; 
        const cacheKey = `teacher:${teacherEngName}:academies`; 

        const cachedAcademies = await redis.get(cacheKey);
        if (cachedAcademies) {
            return res.status(200).json({ success: true, academies: JSON.parse(cachedAcademies) });
        }

        const teacher = await TeacherModel.findOne({ engName: teacherEngName }).lean();

        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        const academies = await AcademyModel.aggregate([
            {
                $match: { _id: { $in: teacher.academies } }
            },
            {
                $lookup: {
                    from: 'teachers', // نام مجموعه مرتبط
                    localField: '_id', // ارتباط با آکادمی از طریق _id
                    foreignField: 'academies', // ارتباط آکادمی‌ها در جدول Teacher
                    as: 'teacherData' // داده‌های مدرسین در آکادمی
                }
            },
            {
                $lookup: {
                    from: 'courses', // اتصال به مجموعه دوره‌ها
                    localField: '_id',
                    foreignField: 'academyId', // اتصال به academyId در جدول Course
                    as: 'courseData' // داده‌های دوره‌های هر آکادمی
                }
            },
            {
                $addFields: {
                    totalTeachers: { $size: "$teacherData" }, // شمارش تعداد مدرسین
                    totalStudents: { $sum: "$courseData.students" }, // محاسبه تعداد کل دانشجویان
                    totalCourses: { $size: "$courseData" }, // شمارش تعداد کل دوره‌ها
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
                    totalTeachers: 1,
                    totalCourses: 1
                }
            }
        ]);

        if (!academies.length) {
            return res.status(404).json({ success: false, message: "No academies found for this teacher" });
        }

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academies));

        res.status(200).json({ success: true, academies });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const getTeacherCoursesByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teacherEngName = req.params.name; 
        const cacheKey = `teacher:${teacherEngName}:topCourses`; 

        const cachedCourses = await redis.get(cacheKey);
        if (cachedCourses) {
            return res.status(200).json({ success: true, courses: JSON.parse(cachedCourses) });
        }
        const teacher = await TeacherModel.findOne({ engName: teacherEngName }).lean();

        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        const courses = await CourseModel.aggregate([
            {
                $match: { showCourse: true, teacherId: teacher._id } // فیلتر دوره‌ها بر اساس teacherId
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
                    urlName:1,
                }
            }
        ]);

        if (!courses.length) {
            return res.status(404).json({ success: false, message: "No courses found for this teacher" });
        }

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(courses));

        res.status(200).json({ success: true, courses });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500)); 
    }
});


const getAllTeachersName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const cacheKey = 'teachers_name_all'; 


        const cachedTeachers = await redis.get(cacheKey);
        if (cachedTeachers) {
            return res.status(200).json({ teachersName: JSON.parse(cachedTeachers), success: true });
        }

        const teachersName = await TeacherModel.find({}).select("engName -_id")

        await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teachersName));

        res.status(200).json({ teachersName, success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export {
    getTeachers,
    getTeacherByEngName,
    getTeachersAcademiesByEngName,
    getTeacherCoursesByEngName,
    getAllTeachersName
}