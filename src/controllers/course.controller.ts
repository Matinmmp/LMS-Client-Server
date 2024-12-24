import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
const { S3Client } = require("@aws-sdk/client-s3");
import Fuse from "fuse.js";
import AcademyModel from "../models/academy.model";
import TeacherModel from "../models/teacher.model";
import CategoryModel from "../models/category.model";
import { CopyObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import userModel from "../models/user.model";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import CourseSectionModel from "../models/courseSection.model";
import LessonModel from "../models/sectionLesson.model";

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
    },
})

const getCourseByName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseName = req.params.name;
        // const cacheKey = `course:${courseName}`; // کلید کش مخصوص این دوره
        console.log(courseName)

        // بررسی کش Redis برای داده‌های موجود
        // const cachedCourse = await redis.get(cacheKey);
        // if (cachedCourse) {
        //     return res.status(200).json({ success: true, courseData: JSON.parse(cachedCourse) });
        // }

        // واکشی اطلاعات دوره
        const courseData = await CourseModel.aggregate([
            {
                $match: { urlName: courseName }
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
                        faName: "$faName",
                        description: "$description",
                        longDescription: "$longDescription",
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
                        lastContentUpdate: "$lastContentUpdate",
                        holeCourseVideos: "$holeCourseVideos",
                        releaseDate: "$releaseDate",
                        isInVirtualPlus: "$isInVirtualPlus",
                        totalVideos: "$totalVideos",
                        createdAt: "$createdAt",
                        updatedAt: "$updatedAt",
                        courseLength: "$courseLength",
                        totalLessons: '$totalLessons',
                        previewVideoUrl: '$previewVideoUrl',
                        urlName: '$urlName',
                    }
                }
            }
        ]);

        if (!courseData || courseData.length === 0) {
            return res.status(404).json({ success: false, message: 'دوره‌ای با این نام یافت نشد' });
        }

        // ذخیره داده‌ها در کش با انقضای 24 ساعت
        // await redis.setex(cacheKey, 86400, JSON.stringify(courseData[0]));

        // ارسال پاسخ
        res.status(200).json({ success: true, courseData: courseData[0] });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


const generateS3Url = async (key: string, isPrivate: boolean, fileName: string): Promise<string> => {
    const command = new GetObjectCommand({
        Bucket: process.env.LIARA_BUCKET_NAME,
        Key: key,
        ResponseContentDisposition: 'attachment; filename="' + fileName + '"' // تنظیم هدر Content-Disposition 
    });

    if (!isPrivate) {

        // return `https://${process.env.LIARA_BUCKET_NAME}.storage.c2.liara.space/${key}`; 
        // return encodeText(await getSignedUrl(client, command, { expiresIn: 86400 * 5 }));
        return await getSignedUrl(client, command, { expiresIn: 86400 * 5 });

    }

    // const signedUrl = encodeText(await getSignedUrl(client, command, { expiresIn: 86400 }));
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 86400 }); // لینک یک روزه 
    // لینک یک روزه 
    return signedUrl;
};


const getCourseDataByNameNoLoged = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.params;
        // دریافت دوره
        const course: any = await CourseModel.findOne({ urlName: name }).lean();
        if (!course) {
            return res.status(404).json({ success: false, message: "دوره‌ای با این نام یافت نشد" });
        }
        const isFree = course.price == 0;
        const folderName = course.folderName;

        // دریافت سکشن‌های مربوط به دوره
        const sections = await CourseSectionModel.find({ courseId: course._id }).sort({ order: 1 }).lean();

        // پردازش سکشن‌ها
        const processedSections = await Promise.all(
            sections.map(async (section, sectionIndex) => {

                // پردازش فایل‌ها و لینک‌های سکشن
                let sectionFiles: any = section.sectionFiles?.length ? true : false;

                if (section.sectionFiles?.length && section.isFree)
                    sectionFiles = section.sectionFiles?.length ?
                        await Promise.all(section.sectionFiles.map(async (file) =>
                            section.isFree ?
                                {
                                    fileTitle: file.fileTitle,
                                    fileName: await generateS3Url(`Courses/${folderName}CourseFiles/${file.fileName}`, !(section.isFree), file.fileName),
                                }
                                : true
                        )
                        ) : false;


                let sectionLinks: any = section.sectionLinks?.length ? true : false;
                if (section.sectionLinks?.length && section.isFree)
                    sectionLinks = section.sectionLinks?.length
                        ?
                        await Promise.all(section.sectionLinks.map(async (link) => section.isFree ? { title: link.title, url: link.url } : true)
                        ) : false;

                // دریافت درس‌های مربوط به سکشن
                const lessons = await LessonModel.find({ courseSectionId: section._id }).sort({ order: 1 }).lean();

                // پردازش درس‌ها
                const processedLessons = await Promise.all(
                    lessons.map(async (lesson, lessonIndex) => {
                        const lessonFile = lesson.lessonFile
                            ?
                            lesson.isFree
                                ? {
                                    fileTitle: lesson.lessonFile.fileTitle,
                                    fileName: await generateS3Url(`Courses/${course?.folderName}/CourseLessons/${lesson.lessonFile.fileName}`, !(lesson.isFree), `section_${sectionIndex + 1}_lesson_${lessonIndex + 1}_${lesson.lessonFile.fileName}`),
                                    fileDescription: lesson.lessonFile.fileDescription,
                                }
                                : true
                            : false;


                        // فایل‌های پیوست‌شده
                        let attachedFiles: any = lesson.attachedFile?.length ? true : false;

                        if (lesson.attachedFile?.length && lesson.isFree)
                            attachedFiles = lesson.attachedFile?.length
                                ? await Promise.all(
                                    lesson.attachedFile.map(async (file) =>
                                        lesson.isFree
                                            ? {
                                                fileTitle: file.fileTitle,
                                                fileName: await generateS3Url(`Courses/${course?.folderName}/CourseFiles/${file.fileName}`, !(lesson.isFree), file.fileName),
                                                fileDescription: file.fileDescription,
                                            }
                                            : true
                                    )
                                )
                                : false;


                        // لینک‌های مرتبط با درس
                        let lessonLinks: any = lesson.links?.length ? true : false;

                        if (lesson.links?.length && lesson.isFree)
                            lessonLinks = lesson.links?.length
                                ? await Promise.all(lesson.links.map(async (link) => lesson.isFree || isFree ? { title: link.title, url: link.url } : true))
                                : false;

                        return {
                            lessonType: lesson.lessonType,
                            lessonTitle: lesson.lessonTitle,
                            lessonFile: lessonFile,
                            attachedFile: attachedFiles,
                            links: lessonLinks,
                            lessonLength: lesson.lessonLength || 0,
                            isFree: lesson.isFree,
                            error: lesson.error || "",
                            warning: lesson.warning || "",
                            info: lesson.info || "",

                        };
                    })
                );

                return {
                    isFree: section.isFree,
                    sectionName: section.sectionName,
                    sectionLinks: sectionLinks || false,
                    sectionFiles: sectionFiles || false,
                    totalLessons: section.totalLessons || 0,
                    totalLength: section.totalLength || 0,
                    error: section.error || "",
                    warning: section.warning || "",
                    info: section.info || "",
                    lessonsList: processedLessons,
                };
            })
        );


        const courseFiles = course.courseFiles?.length ? true : false;


        const courseLinks = course.links?.length ? true : false;

        // const courseLinks = course.links?.length ?
        //     await Promise.all(course.links.map(async (link: any) => isFree ? { title: link.title, url: link.url } : true)
        //     ) : false;

        // const courseFiles = course.courseFiles?.length ? await Promise.all(
        //     course.courseFiles.map(async (file: any) => isFree ?
        //         {
        //             fileTitle: file.fileTitle,
        //             fileName: await generateS3Url(`Courses/${folderName}CourseFiles/${file.fileName}`, !(isFree), file.fileName),
        //         }
        //         : true
        //     )
        // ) : false;


        res.status(200).json({
            success: true,
            // isCourseFree: course.price == 0,
            isPurchased: false,
            courseData: processedSections,
            courseFiles,
            courseLinks,
            error: course.error || "",
            warning: course.warning || "",
            info: course.info || "",
        });
    } catch (error: any) {
        next(error);
    }
});


const getCourseDataByNameLoged = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name } = req.params;
        const userId = req.user?._id;
        let hasPurchased = false;

        // دریافت اطلاعات دوره
        const course: any = await CourseModel.findOne({ urlName: name }).lean();
        if (!course) {
            return res.status(404).json({ success: false, message: "دوره‌ای با این نام یافت نشد" });
        }

        if (userId) {
            try {
                // بررسی خرید دوره
                const user = await userModel.findById(userId).select("courses").lean();
                if (user?.courses.find((courseId) => courseId.toString() === course?._id.toString())) {
                    hasPurchased = true;
                }
            } catch (err) {
                return res.status(401).json({ success: false, message: "توکن نامعتبر است" });
            }
        }

        const folderName = course.folderName;

        // دریافت سکشن‌های دوره
        const sections = await CourseSectionModel.find({ courseId: course._id }).sort({ order: 1 }).lean();

        // پردازش سکشن‌ها
        const processedSections = await Promise.all(
            sections.map(async (section, sectionIndex) => {

                let sectionFiles: any = section.sectionFiles?.length ? true : false;
                if (section.sectionFiles?.length)
                    sectionFiles = await Promise.all(section.sectionFiles.map(async (file) => ({
                        fileTitle: file.fileTitle,
                        fileName: await generateS3Url(
                            `Courses/${folderName}/CourseFiles/${file.fileName}`,
                            !hasPurchased,
                            file.fileName
                        ),

                    })));


                let sectionLinks: any = section.sectionLinks?.length ? true : false;
                if (section.sectionLinks?.length)
                    sectionLinks = section.sectionLinks.map((link) => ({
                        title: link.title,
                        url: link.url,
                    }));

                // دریافت درس‌های سکشن
                const lessons = await LessonModel.find({ courseSectionId: section._id }).sort({ order: 1 }).lean();

                // پردازش درس‌ها
                const processedLessons = await Promise.all(
                    lessons.map(async (lesson, lessonIndex) => {
                        const lessonFile = lesson.lessonFile
                            ? {
                                fileTitle: lesson.lessonFile.fileTitle,
                                fileName: await generateS3Url(
                                    `Courses/${folderName}/CourseLessons/${lesson.lessonFile.fileName}`, !hasPurchased,
                                    `section_${sectionIndex + 1}_lesson_${lessonIndex + 1}_${lesson.lessonFile.fileName}`),
                                fileDescription: lesson.lessonFile.fileDescription,
                            }
                            : false;

                        let attachedFiles: any = lesson.attachedFile?.length ? true : false;
                        if (lesson.attachedFile?.length)
                            attachedFiles = await Promise.all(
                                lesson.attachedFile.map(async (file) => ({
                                    fileTitle: file.fileTitle,
                                    fileName: await generateS3Url(`Courses/${folderName}/CourseFiles/${file.fileName}`, !hasPurchased, file.fileName),
                                    fileDescription: file.fileDescription,
                                }))
                            );

                        let lessonLinks: any = lesson.links?.length ? true : false;
                        if (lesson.links?.length)
                            lessonLinks = lesson.links.map((link) => ({
                                title: link.title,
                                url: link.url,
                            }));

                        return {
                            lessonType: lesson.lessonType,
                            lessonTitle: lesson.lessonTitle,
                            lessonFile: lessonFile,
                            attachedFile: attachedFiles,
                            links: lessonLinks,
                            lessonLength: lesson.lessonLength || 0,
                            isFree: lesson.isFree,
                            error: lesson.error || "",
                            warning: lesson.warning || "",
                            info: lesson.info || "",
                        };
                    })
                );

                return {
                    isFree: section.isFree,
                    sectionName: section.sectionName,
                    sectionLinks: sectionLinks || false,
                    sectionFiles: sectionFiles || false,
                    totalLessons: section.totalLessons || 0,
                    totalLength: section.totalLength || 0,
                    error: section.error || "",
                    warning: section.warning || "",
                    info: section.info || "",
                    lessonsList: processedLessons,
                };
            })
        );


        // پردازش courseFiles
        let courseFiles: any = course.courseFiles?.length ? true : false;

        if (hasPurchased)
            courseFiles = course.courseFiles?.length
                ? await Promise.all(
                    course.courseFiles.map(async (file: any) => ({
                        fileTitle: file.fileTitle,
                        fileName: await generateS3Url(`Courses/${folderName}/CourseFiles/${file.fileName}`, !hasPurchased, file.fileName),
                    }))
                )
                : false;


        // پردازش courseLinks
        let courseLinks: any = course.links?.length ? true : false;

        if (hasPurchased)
            courseLinks = course.links?.length
                ? course.links.map((link: any) => ({
                    title: link.title,
                    url: link.url,
                }))
                : false;

        // ارسال پاسخ
        res.status(200).json({
            success: true,
            isPurchased: hasPurchased,
            courseData: processedSections,
            courseFiles: courseFiles || undefined,
            courseLinks: courseLinks || undefined,
            notice: course.notice || "",
            courseLength: course.courseLength || 0,
        });
    } catch (error: any) {
        return next(error);
    }
});

type searchCoursesTypes = {
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
                        teacher: {
                            teacherEngName: { $arrayElemAt: ["$teacherData.engName", 0] },
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
                        purchased: 1,
                        totalLessons: 1,
                        urlName: 1,
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

    getCourseByName,
    getCourseDataByNameNoLoged,
    getCourseDataByNameLoged,
    searchCourses

}
