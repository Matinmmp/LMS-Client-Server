import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import TeacherModel from "../models/teacher.model";
import AcademyModel from "../models/academy.model";
import CourseModel from "../models/course.model";


const CACHE_EXPIRATION = 86400; // 24 ساعت (86400 ثانیه)


const getTeachers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // const cacheKey = 'teachers_all';

        // const cachedTeachers = await redis.get(cacheKey);
        // if (cachedTeachers) {
        //     return res.status(200).json({ teachers: JSON.parse(cachedTeachers), success: true });
        // }


        const teachers = await TeacherModel.aggregate([
            {
                $lookup: {
                    from: 'academies',
                    localField: 'academies',
                    foreignField: '_id',
                    as: 'academyData'
                }
            },
            {
                $addFields: {
                    academyNames: "$academyData.engName", // ایجاد فیلد جدید فقط با `engName` از آکادمی‌ها
                    totalStudents: { $ifNull: ["$totalStudents", 0] }, // اگر مقدار `totalStudents` وجود نداشت، مقدار `0` جایگزین شود
                    totalCourses: { $ifNull: ["$totalCourses", 0] }, // اگر مقدار `totalCourses` وجود نداشت، مقدار `0` جایگزین شود
                    rating: { $ifNull: ["$rating", 0] }, // مقدار پیش‌فرض `rating` برابر `0`
                    ratingNumber: { $ifNull: ["$ratingNumber", 0] } // مقدار پیش‌فرض `ratingNumber` برابر `0`
                }
            },
            {
                $sort: { totalStudents: -1 }
            },
            {
                $project: {
                    engName: 1, // انتخاب فیلدهای مورد نیاز
                    faName: 1,
                    description: 1,
                    "avatar.imageUrl": 1,
                    rating: 1,
                    ratingNumber: 1,
                    totalStudents: 1,
                    totalCourses: 1,
                    academyNames: 1 // نمایش لیست نام آکادمی‌ها
                }
            }
        ]);




        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teachers));

        res.status(200).json({ teachers, success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

const getTeacherByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teacherEngName = req.params.name;

        // const cacheKey = `teacher:${teacherEngName}`;
        // const cachedTeacher = await redis.get(cacheKey);
        // if (cachedTeacher) {
        //     return res.status(200).json({ success: true, teacher: JSON.parse(cachedTeacher) });
        // }

        const teacher = await TeacherModel.findOne({ engName: teacherEngName }, {
            engName: 1, // انتخاب فیلدهای مورد نیاز
            faName: 1,
            description: 1,
            longDescription:1,
            "avatar.imageUrl": 1,
            rating: 1,
            ratingNumber: 1,
            totalStudents: 1,
            totalCourses: 1,
            totalAcademies: 1,
            seoMeta: 1,

        }).sort({ totalStudents: -1 }).limit(3);


        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teacher));

        res.status(200).json({ success: true, teacher });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const getTeachersAcademiesByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teacherEngName = req.params.name;

        // const cacheKey = `teacher:${teacherEngName}:academies`; 

        // const cachedAcademies = await redis.get(cacheKey);
        // if (cachedAcademies) {
        //     return res.status(200).json({ success: true, academies: JSON.parse(cachedAcademies) });
        // }

        const teacher = await TeacherModel.findOne({ engName: teacherEngName }).lean();

        if (!teacher) {
            return res.status(404).json({ success: false, message: "Teacher not found" });
        }

        // const teachers = await TeacherModel.find({  academies: academy._id  }
        const academies = await AcademyModel.find({ teachers: teacher._id }, {

            engName: 1,
            faName: 1,
            description: 1,
            "avatar.imageUrl": 1,
            rating: 1,
            ratingNumber: 1,
            totalStudents: 1,
            totalTeachers: 1,
            totalCourses: 1,
        })

        if (!academies.length) {
            return res.status(404).json({ success: false, message: "No academies found for this teacher" });
        }

        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(academies));

        res.status(200).json({ success: true, academies });

    } catch (error: any) {

        return next(new ErrorHandler(error.message, 500));
    }
});

const getTeacherCoursesByEngName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teacherEngName = req.params.name;

        // const cacheKey = `teacher:${teacherEngName}:topCourses`; 

        // const cachedCourses = await redis.get(cacheKey);
        // if (cachedCourses) {
        //     return res.status(200).json({ success: true, courses: JSON.parse(cachedCourses) });
        // }
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
                    teacher: 1,
                    academy: 1,
                    courseLength: 1,
                    price: 1,
                    totalLessons: 1,
                    urlName: 1,
                }
            }
        ]);

        if (!courses.length) {
            return res.status(404).json({ success: false, message: "No courses found for this teacher" });
        }

        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(courses));

        res.status(200).json({ success: true, courses });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


const getAllTeachersName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // const cacheKey = 'teachers_name_all';

        // const cachedTeachers = await redis.get(cacheKey);
        // if (cachedTeachers) {
        //     return res.status(200).json({ teachersName: JSON.parse(cachedTeachers), success: true });
        // }

        const teachersName = await TeacherModel.find({}).select("engName -_id")

        // await redis.setex(cacheKey, CACHE_EXPIRATION, JSON.stringify(teachersName));

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