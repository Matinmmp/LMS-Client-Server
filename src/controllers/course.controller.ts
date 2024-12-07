import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import randomLetterGenerator from "../utils/randomName";
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
import Fuse from "fuse.js";
import AcademyModel from "../models/academy.model";
import TeacherModel from "../models/teacher.model";
import CategoryModel from "../models/category.model";

require('dotenv').config();


const REDIS_EXPIRATION_DAY = 86400; // یک روز (ثانیه)
const REDIS_EXPIRATION_HOUR = 3600; // یک ساعت (ثانیه)
const itemsPerPage = 12;

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


const getCourseByName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseName = req.params.name;
        const cacheKey = `course:${courseName}`; // کلید کش مخصوص این دوره

        // بررسی کش Redis برای داده‌های موجود
        const cachedCourse = await redis.get(cacheKey);
        if (cachedCourse) {
            return res.status(200).json({ success: true, courseData: JSON.parse(cachedCourse) });
        }

        // واکشی اطلاعات دوره
        const courseData = await CourseModel.aggregate([
            {
                $match: { name: courseName }
            },
            {
                $lookup: {
                    from: 'teachers', // اتصال به جدول مدرسین
                    localField: 'teacherId', // ارتباط با آیدی مدرس در دوره
                    foreignField: '_id',
                    as: 'teacherData'
                }
            },
            {
                $lookup: {
                    from: 'academies', // اتصال به جدول آکادمی‌ها
                    localField: 'academyId', // ارتباط با آیدی آکادمی در دوره
                    foreignField: '_id',
                    as: 'academyData'
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
                    }
                }
            },
            {
                $project: {
                    teacher: {
                        engName: { $arrayElemAt: ["$teacherData.engName", 0] },
                        faName: { $arrayElemAt: ["$teacherData.faName", 0] },
                        description: { $arrayElemAt: ["$teacherData.description", 0] },
                        avatar: { imageUrl: { $arrayElemAt: ["$teacherData.avatar.imageUrl", 0] } }
                    },
                    academy: {
                        engName: { $arrayElemAt: ["$academyData.engName", 0] },
                        faName: { $arrayElemAt: ["$academyData.faName", 0] },
                        description: { $arrayElemAt: ["$academyData.description", 0] },
                        avatar: { imageUrl: { $arrayElemAt: ["$academyData.avatar.imageUrl", 0] } }
                    },
                    course: {
                        thumbnail: { imageUrl: "$thumbnail.imageUrl" },
                        discount: "$discount",
                        name: "$name",
                        description: "$description",
                        price: "$price",
                        estimatedPrice: "$estimatedPrice",
                        tags: "$tags",
                        level: "$level",
                        benefits: "$benefits",
                        prerequisites: "$prerequisites",
                        ratings: "$ratings",
                        purchased: "$purchased",
                        status: "$status",
                        links: "$links",
                        lastContentUpdate:"$lastContentUpdate",
                        holeCourseVideos:"$holeCourseVideos",
                        releaseDate: "$releaseDate",
                        isInVirtualPlus: "$isInVirtualPlus",
                        totalVideos: "$totalVideos",
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt",
                        courseLength: "$courseLength"
                    }
                }
            }
        ]);

        if (!courseData || courseData.length === 0) {
            return res.status(404).json({ success: false, message: 'دوره‌ای با این نام یافت نشد' });
        }

        // ذخیره داده‌ها در کش با انقضای 24 ساعت
        await redis.setex(cacheKey, 86400, JSON.stringify(courseData[0]));

        // ارسال پاسخ
        res.status(200).json({ success: true, courseData: courseData[0] });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});



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

type searchCourses = {
    searchText: string,
    order: string, //key='1'=>'جدید‌ترین' ,key= '2'=>'قدیمی‌ترین' ,key= '3'=>'تمام شده' ,key='4'=>'درحال برگزاری' ,key='5'=>'محبوبترین',key='6'=>'پرفروش ترین',can be null if was null just bring order by newst
    price: string // key='1'=>'all',key='2'=>'only free',key='3'=>'only with price',key='4'=>'first bring courses with offers then other courses but bring all of them'
    academies: [string] //will be name of one or more academy name or can be null =>if null bring all 
    teachers: [string]//will be name of one or more teacher name or can be null =>if null bring all 
    categories: [string]//will be name of one or more category name or can be null =>if null bring all 
    page: string //1
}

// تابعی برای کش کردن داده‌ها
async function getOrSetCache(key: string, expiration: number, fetchFunction: () => Promise<any>) {
    const cachedData = await redis.get(key);
    if (cachedData) return JSON.parse(cachedData);

    const freshData = await fetchFunction();
    await redis.setex(key, expiration, JSON.stringify(freshData));
    return freshData;
}

const searchCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { searchText, order, price, academies, teachers, categories, page = "1" } = req.body;

        const pageNumber = parseInt(page, 10);

        // کش برای تمام آکادمی‌ها
        const allAcademies = await getOrSetCache("all_academies", REDIS_EXPIRATION_DAY, async () =>
            await AcademyModel.find({}).select("engName _id").lean()
        );

        // کش برای تمام مدرسین
        const allTeachers = await getOrSetCache("all_teachers", REDIS_EXPIRATION_DAY, async () =>
            await TeacherModel.find({}).select("engName _id").lean()
        );

        // کش برای تمام دسته‌بندی‌ها
        const allCategories = await getOrSetCache("all_categories", REDIS_EXPIRATION_DAY, async () =>
            await CategoryModel.find({}).select("name _id").lean()
        );

        let allCourses: any = await redis.get("all_courses");
        if (allCourses) {
            allCourses = JSON.parse(allCourses);
        } else {
            allCourses = await CourseModel.aggregate([
                { $match: { showCourse: true } },
                {
                    $lookup: {
                        from: "teachers",
                        localField: "teacherId",
                        foreignField: "_id",
                        as: "teacherData"
                    }
                },
                {
                    $lookup: {
                        from: "academies",
                        localField: "academyId",
                        foreignField: "_id",
                        as: "academyData"
                    }
                },
                {
                    $lookup: {
                        from: "categories", // اتصال به مجموعه دسته‌بندی‌ها
                        localField: "categoryIds",
                        foreignField: "_id",
                        as: "categoryData"
                    }
                },
                {
                    $addFields: {
                        courseLength: {
                            $sum: {
                                $map: {
                                    input: "$courseData",
                                    as: "courseItem",
                                    in: { $toInt: "$$courseItem.videoLength" }
                                }
                            }
                        },
                        teacher: {
                            teacherFaName: { $arrayElemAt: ["$teacherData.faName", 0] },
                            teacherId: { $arrayElemAt: ["$teacherData._id", 0] }
                        },
                        academy: {
                            academyEngName: { $arrayElemAt: ["$academyData.engName", 0] },
                            academyId: { $arrayElemAt: ["$academyData._id", 0] }
                        },
                        categories: {
                            categoryNames: "$categoryData.name",
                            categoryIds: "$categoryData._id"
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
                        categories: 1, // افزودن فیلد دسته‌بندی به خروجی نهایی
                        courseLength: 1,
                        price: 1,
                        purchased: 1
                    }
                }
            ]);

            await redis.setex("all_courses", REDIS_EXPIRATION_HOUR, JSON.stringify(allCourses));
        }

        // فیلتر کردن براساس پارامترها
        let filteredCourses = allCourses;


        // فیلتر آکادمی‌ها
        if (academies && academies.length > 0) {
            const academyIds = allAcademies.filter((a: any) => academies.includes(a.engName)).map((a: any) => String(a._id));
            filteredCourses = filteredCourses.filter((course: any) => academyIds.includes(String(course.academy.academyId)));
        }

        // فیلتر مدرسین
        if (teachers && teachers.length > 0) {
            const teacherIds = allTeachers.filter((t: any) => teachers.includes(t.engName)).map((t: any) => String(t._id));
            filteredCourses = filteredCourses.filter((course: any) => teacherIds.includes(String(course.teacher.teacherId)));
        }

        // فیلتر دسته‌بندی‌ها
        if (categories && categories.length > 0) {
            const categoryIds = allCategories.filter((c: any) => categories.includes(c.name)).map((c: any) => String(c._id));
            filteredCourses = filteredCourses.filter((course: any) =>
                course.categories.categoryIds.some((catId: any) => categoryIds.includes(String(catId)))
            );
        }

        // فیلتر قیمت
        if (price === "2") filteredCourses = filteredCourses.filter((course: any) => course.price === 0);
        else if (price === "3") filteredCourses = filteredCourses.filter((course: any) => course.price > 0);
        else if (price === "4") filteredCourses = filteredCourses.filter((course: any) => course.discount && course.discount.percent > 0);

        // جستجوی فازی با Fuse.js
        if (searchText) {
            const fuse = new Fuse(filteredCourses, { keys: ["name", "tags"], includeScore: true });
            const fuseResults = fuse.search(searchText);
            filteredCourses = fuseResults.map(result => result.item);
        }

        // مرتب‌سازی بر اساس order
        if (order === "2") filteredCourses.sort((a: any, b: any) => a.releaseDate - b.releaseDate);
        else if (order === "3") filteredCourses = filteredCourses.filter((course: any) => course.status === 2);
        else if (order === "4") filteredCourses = filteredCourses.filter((course: any) => course.status === 0);
        else if (order === "5") filteredCourses.sort((a: any, b: any) => b.ratings - a.ratings);
        else if (order === "6") filteredCourses.sort((a: any, b: any) => b.purchased - a.purchased);
        else filteredCourses.sort((a: any, b: any) => b.releaseDate - a.releaseDate);

        // محاسبه صفحات کل و صفحه‌بندی
        const totalCourses = filteredCourses.length;
        const totalPages = Math.ceil(totalCourses / itemsPerPage);
        const paginatedCourses = filteredCourses.slice((pageNumber - 1) * itemsPerPage, pageNumber * itemsPerPage);

        // ارسال پاسخ

        res.status(201).json({
            success: true,
            courses: paginatedCourses,
            currentPage: pageNumber,
            totalPage: totalPages
        });



    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

export {
    getAllCourses,
    getCourseByName,
    editCourse,
    searchCourses

}