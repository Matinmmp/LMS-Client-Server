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
                        previewVideoUrl: '$previewVideoUrl'
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



function encodeText(text: string) {
    return btoa(text);
};

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
        const course: any = await CourseModel.findOne({ name }).lean();
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
                const sectionFiles =
                    section.sectionFiles?.length ? await Promise.all(
                        section.sectionFiles.map(async (file) => isFree || section.isFree ?
                            {
                                fileTitle: file.fileTitle,
                                fileName: await generateS3Url(`Courses/${folderName}CourseFiles/${file.fileName}`, !(isFree || section.isFree), file.fileName),
                            }
                            : true
                        )
                    ) : false;

                const sectionLinks = section.sectionLinks?.length
                    ?
                    await Promise.all(section.sectionLinks.map(async (link) => section.isFree || isFree ? { title: link.title, url: link.url } : true)
                    ) : false;

                // دریافت درس‌های مربوط به سکشن
                const lessons = await LessonModel.find({ courseSectionId: section._id }).sort({ order: 1 }).lean();

                // پردازش درس‌ها
                const processedLessons = await Promise.all(
                    lessons.map(async (lesson, lessonIndex) => {
                        const lessonFile = lesson.lessonFile
                            ?
                            isFree || lesson.isFree
                                ? {
                                    fileTitle: lesson.lessonFile.fileTitle,
                                    fileName: await generateS3Url(`Courses/${course?.folderName}/CourseLessons/${lesson.lessonFile.fileName}`, !(isFree || lesson.isFree), `section_${sectionIndex + 1}_lesson_${lessonIndex + 1}_${lesson.lessonFile.fileName}`),
                                    fileDescription: lesson.lessonFile.fileDescription,
                                }
                                : true
                            : false;

                        // فایل‌های پیوست‌شده
                        const attachedFiles = lesson.attachedFile?.length
                            ? await Promise.all(
                                lesson.attachedFile.map(async (file) =>
                                    lesson.isFree || isFree
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
                        const lessonLinks = lesson.links?.length
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


        const courseFiles = course.courseFiles?.length ? await Promise.all(
            course.courseFiles.map(async (file: any) => isFree ?
                {
                    fileTitle: file.fileTitle,
                    fileName: await generateS3Url(`Courses/${folderName}CourseFiles/${file.fileName}`, !(isFree), file.fileName),
                }
                : true
            )
        ) : false;

        const courseLinks = course.links?.length ?
            await Promise.all(course.links.map(async (link: any) => isFree ? { title: link.title, url: link.url } : true)
            ) : false;



        res.status(200).json({
            success: true,
            isCourseFree: course.price == 0,
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

// const getCourseDataByNameLoged = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const { name } = req.params;
//         const userId = req.user?._id;
//         let hasPurchased = false;

//         const course: any = await CourseModel.findOne({ name }).lean();
//         if (!course) {
//             return res.status(404).json({ success: false, message: "دوره‌ای با این نام یافت نشد" });
//         }

//         if (userId)
//             try {
//                 // بررسی خرید دوره
//                 const user = await userModel.findById(userId).select("courses").lean();
//                 if (user?.courses.find((courseId) => courseId == course?._id)) {
//                     hasPurchased = true;
//                 }
//             } catch (err) {
//                 return res.status(401).json({ success: false, message: "توکن نامعتبر است" });
//             }


//         const folderName = course.folderName;

//         // پردازش courseData
//         const processedCourseData = await Promise.all(
//             course.courseData.map(async (data: any) => {
//                 // ساخت لینک ویدیو
//                 const videoUrl =
//                     hasPurchased || data.isFree
//                         ? await generateS3Url(`Courses/${folderName}/CourseVideos/${data.videoName}`, !data.isFree)
//                         : "true";

//                 // ساخت لینک فایل‌های ویدیو
//                 const videoFiles =
//                     hasPurchased || data.isFree
//                         ? await generateS3Url(`Courses/${folderName}/CourseFiles/${data.videoFiles}`, !data.isFree)
//                         : "true";

//                 // ساخت لینک فایل‌های سکشن
//                 const sectionFiles =
//                     hasPurchased || data.isFree
//                         ? await generateS3Url(`Courses/${folderName}/CourseFiles/${data.sectionFiles}`, !data.isFree)
//                         : "true";

//                 // ساخت لینک‌های عمومی برای ویدیوها و سکشن‌ها
//                 const videoLinks = data.videoLinks
//                     ? await Promise.all(
//                         data.videoLinks.map(async (link: any) => ({
//                             title: link.title,
//                             url: hasPurchased || data.isFree ? await generateS3Url(link.url, !data.isFree) : "true"
//                         }))
//                     )
//                     : null;

//                 const sectionLinks = data.sectionLinks
//                     ? await Promise.all(
//                         data.sectionLinks.map(async (link: any) => ({
//                             title: link.title,
//                             url: hasPurchased || data.isFree ? await generateS3Url(link.url, !data.isFree) : "true"
//                         }))
//                     )
//                     : null;

//                 return {
//                     isFree: data.isFree,
//                     title: data.title,
//                     description: data.description,
//                     videoSection: data.videoSection,
//                     videoLength: data.videoLength,
//                     videoLinks: videoLinks || undefined,
//                     sectionLinks: sectionLinks || undefined,
//                     videoFiles: videoFiles || undefined,
//                     sectionFiles: sectionFiles || undefined,
//                     videoUrl: videoUrl
//                 };
//             })
//         );

//         // پردازش courseFiles
//         const courseFiles = course.courseFiles
//             ? await Promise.all(
//                 course.courseFiles.map((file: string) =>
//                     hasPurchased
//                         ? generateS3Url(`Courses/${folderName}/CourseFiles/${file}`, true) // لینک پرایویت
//                         : null // فایل‌ها ارسال نشود
//                 )
//             )
//             : undefined;

//         // حذف فایل‌های null از courseFiles
//         const filteredCourseFiles = courseFiles?.filter((file) => file !== null);

//         // پردازش courseLinks
//         const courseLinks = course?.courseLinks
//             ? await Promise.all(
//                 course?.courseLinks?.map(async (link: any) => ({
//                     title: link.title,
//                     url: link.url
//                 }))
//             )
//             : undefined;

//         // ارسال پاسخ
//         res.status(200).json({
//             success: true,
//             isPurchased: hasPurchased,
//             courseData: processedCourseData,
//             courseFiles: filteredCourseFiles || undefined,
//             courseLinks: courseLinks || undefined
//         });
//     } catch (error: any) {
//         return next(error);
//     }
// });


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
    getCourseDataByNameNoLoged,
    // getCourseDataByNameLoged,
    searchCourses

}

const s = [
    {
        "isFree": false,
        "title": "video title 1",
        "description": "video Description",
        "videoSection": "Section1",
        "videoLength": "7111",
        "videoLinks": [
            {
                "title": "Link ",
                "url": "true"
            }
        ],
        "sectionLinks": [
            {
                "title": "link1",
                "url": "true"
            },
            {
                "title": "link2",
                "url": "true"
            }
        ],
        "videoFiles": "true",
        "sectionFiles": "true",
        "videoUrl": "true"
    },
    {
        "isFree": false,
        "title": "video title 2",
        "description": "video Description",
        "videoSection": "Section1",
        "videoLength": "5111",
        "videoLinks": [
            {
                "title": "Link ",
                "url": "true"
            }
        ],
        "videoFiles": "true",
        "sectionFiles": "true",
        "videoUrl": "true"
    },
    {
        "isFree": true,
        "title": "video title 3",
        "description": "video Description",
        "videoSection": "Section2",
        "videoLength": "2323",
        "videoLinks": [
            {
                "title": "Link ",
                "url": "https://buckettest.storage.c2.liara.space/Link "
            }
        ],
        "sectionLinks": [
            {
                "title": "link1",
                "url": "https://buckettest.storage.c2.liara.space/https://nextui.org/blog/v2.6.0"
            },
            {
                "title": "link2",
                "url": "https://buckettest.storage.c2.liara.space/https://nextui.org/blog/v2.6.0"
            }
        ],
        "videoFiles": "https://buckettest.storage.c2.liara.space/Courses/TestCourse1/CourseFiles/video3file.rar",
        "sectionFiles": "https://buckettest.storage.c2.liara.space/Courses/TestCourse1/CourseFiles/section2file.rar",
        "videoUrl": "https://buckettest.storage.c2.liara.space/Courses/TestCourse1/CourseVideos/next3.mp4"
    },
    {
        "isFree": false,
        "title": "video title 4",
        "description": "video Description",
        "videoSection": "Section3",
        "videoLength": "7777",
        "videoLinks": [
            {
                "title": "Link ",
                "url": "true"
            }
        ],
        "sectionLinks": [
            {
                "title": "link1",
                "url": "true"
            },
            {
                "title": "link2",
                "url": "true"
            }
        ],
        "videoFiles": "true",
        "sectionFiles": "true",
        "videoUrl": "true"
    }
]

const list = [
    {
        "isFree": false,
        "sectionName": "Section1",
        "sectionLinks": [{ "title": "link1", "url": true }, { "title": "link2", "url": true }],
        "sectionFiles": [{ fileTitle: "file title", fileName: "file name", }],
        "totalLessons": 2,
        "totalLength": "12222",
        "additionalInfo": '',
        "notice": "",
        "lessonsList": [
            {
                lessonType: "",
                lessonTitle: "",

                //اینا مربوط به خوده درس هستن
                lessonFile: {
                    fileTitle: "",
                    fileName: "",
                    fileDescription: ""
                },//چه ویدیو چه فایل باشه میره این

                //اینا مربوط به اینه که اگه درس همزمان فایلی هم داشت
                attachedFile: [{
                    fileTitle: "",
                    fileName: "",
                    fileDescription: ""
                }],


                //اگه این درس لینکی داره
                links: [{ "title": "link1", "url": true }, { "title": "link2", "url": true }],

                lessonLength: 400,

                isFree: false,

                additionalInfo: "",
                notice: "",
            }
        ]
    },
]

const sample = {
    "_id": {
        "$oid": "66ca02117a3cf2a90b4ee655"
    },
    "name": "100 Days of Code: The Complete Python Pro Bootcamp",
    "description": "حیف نیست محبوب ترین زبان برنامه نویسی دنیا رو  ناقص و بی هدف یادبگیری؟ آموزش پایتون از زیر صفر و پایه ترین مبحث شروع میشه تا تخصصی ترین و پیشرفته ترین مباحث، هر قسمت کلی پروژه و تمرین حل می کنیم، برات تکلیف مشخص می کنیم، کاربردشو تو دنیای واقعی نشون میدیم و در آخرحیف نیست محبوب ترین زبان برنامه نویسی دنیا رو  ناقص و بی هدف یادبگیری؟ آموزش پایتون از زیر صفر و پایه ترین مبحث شروع میشه تا تخصصی ترین و پیشرفته ترین مباحث، هر قسمت کلی پروژه و تمرین حل می کنیم، برات تکلیف مشخص می کنیم، کاربردشو تو دنیای واقعی نشون میدیم و در آخر",
    "price": 0,
    "estimatedPrice": 0,
    "thumbnail": {
        "imageName": "TJDEJAUHTPUdEUuVGziR-Course Name.png",
        "imageUrl": "https://buckettest.storage.c2.liara.space/trash/21752382117.png"
    },
    "tags": "1 2 3 react ",
    "level": "1",
    "benefits": [
        {
            "title": "what are benefites1",
            "_id": {
                "$oid": "66ca1a2a3269ab9acf626c2b"
            }
        }
    ],
    "prerequisites": [
        {
            "title": "what are prerequisites1",
            "_id": {
                "$oid": "66ca1a2a3269ab9acf626c2a"
            }
        }
    ],
    "courseData": [
        {
            "title": "Downloadable Resources and Tips for Taking the Course",
            "videoSection": "فصل اول : اموزش پایتون بصورت کاربردی با دیدگاه یک هکر",
            "description": "video Description",
            "videoLength": "7111",
            "isFree": true,
            "videoName": "next1.mp4",
            "_id": {
                "$oid": "66ca1a293269ab9acf626c26"
            },
            "sectionLinks": [
                {
                    "title": "link1",
                    "url": "https://nextui.org/blog/v2.6.0"
                },
                {
                    "title": "link2",
                    "url": "https://nextui.org/blog/v2.6.0"
                }
            ],
            "videoLinks": [
                {
                    "title": "Link ",
                    "url": "Link ",
                    "_id": {
                        "$oid": "66ca1a293269ab9acf626c27"
                    }
                }
            ],
            "sectionFiles": "section1file.rar",
            "videoFiles": "video1file.rar"
        },
        {
            "title": "video title 2",
            "videoSection": "فصل اول : اموزش پایتون بصورت کاربردی با دیدگاه یک هکر",
            "description": "video Description",
            "videoLength": "5111",
            "isFree": true,
            "videoName": "next2.mp4",
            "_id": {
                "$oid": "66ca1a293269ab9acf626f27"
            },
            "videoLinks": [
                {
                    "title": "Link ",
                    "url": "Link ",
                    "_id": {
                        "$oid": "66ca1a293269ab9acf626c28"
                    }
                }
            ],
            "videoFiles": "video2file.rar"
        },
        {
            "title": "video title 3",
            "videoSection": "فصل دوم : کلی مینی پروژه سناریو محور",
            "description": "video Description",
            "videoLength": "2323",
            "isFree": true,
            "videoName": "next3.mp4",
            "_id": {
                "$oid": "66ca1a293269ab9acf626c37"
            },
            "sectionLinks": [
                {
                    "title": "link1",
                    "url": "https://nextui.org/blog/v2.6.0"
                },
                {
                    "title": "link2",
                    "url": "https://nextui.org/blog/v2.6.0"
                }
            ],
            "videoLinks": [
                {
                    "title": "Link ",
                    "url": "Link ",
                    "_id": {
                        "$oid": "66ca1a293269ab9acf626c27"
                    }
                }
            ],
            "sectionFiles": "section2file.rar",
            "videoFiles": "video3file.rar"
        },
        {
            "title": "video title 4",
            "videoSection": "فصل سوم : نوشتن ابزار استورم بریکر",
            "description": "video Description",
            "videoLength": "7777",
            "isFree": true,
            "videoName": "next4.mp4",
            "_id": {
                "$oid": "66ca1a293269ab9acf626c37"
            },
            "sectionLinks": [
                {
                    "title": "link1",
                    "url": "https://nextui.org/blog/v2.6.0"
                },
                {
                    "title": "link2",
                    "url": "https://nextui.org/blog/v2.6.0"
                }
            ],
            "videoLinks": [
                {
                    "title": "Link ",
                    "url": "Link ",
                    "_id": {
                        "$oid": "66ca1a293269ab9acf626c27"
                    }
                }
            ],
            "sectionFiles": "section3file.rar",
            "videoFiles": "video4file.rar"
        }
    ],
    "ratings": 0,
    "purchased": 0,
    "status": 1,
    "academyId": {
        "$oid": "66dffd45b979073314e6ef61"
    },
    "teacherId": {
        "$oid": "66dffc41b979073314e6ef58"
    },
    "discount": {
        "percent": 100,
        "usageCount": 40,
        "expireTime": {
            "$date": "2024-12-21T15:47:58.002Z"
        }
    },
    "links": [
        {
            "title": "Link 1",
            "url": "Link 1",
            "_id": {
                "$oid": "66ca02117a3cf2a90b4ee65c"
            }
        }
    ],
    "categoryIds": [
        {
            "$oid": "66e06ec8b979073314e6efa1"
        },
        {
            "$oid": "66e06f52b979073314e6efcb"
        }
    ],
    "releaseDate": {
        "$date": "2024-08-24T15:46:30.324Z"
    },
    "folderName": "TestCourse1",
    "isInVirtualPlus": false,
    "showCourse": true,
    "totalVideos": 2,
    "createdAt": {
        "$date": "2024-08-24T15:53:53.313Z"
    },
    "updatedAt": {
        "$date": "2024-08-24T17:36:41.999Z"
    },
    "__v": 0,
    "lastContentUpdate": "2024-08-24T15:46:30.324+00:00",
    "holeCourseVideos": 75,
    "longDescription": "<div class=\"relative overflow-hidden\">\n\t\t\t\t\t\t\t<div class=\"course-content wp-content max-h-[800px]\" style=\"max-height: 100%;\">\n\t\t\t\t\t\t\t\t\n<meta charset=\"utf8\"><p>قبل از اینکه بخواین این دوره رو ببینید اگر دوره <strong><a href=\"https://sabzlearn.ir/course/python/\">آموزش پایتون</a></strong> رو ندیدین حتما دوره رو ببینید که خیلی خیلی بهتون کمک خواهد کرد.</p>\n<p><img decoding=\"async\" loading=\"lazy\" class=\"alignnone size-full wp-image-3590\" src=\"https://sabzlearn.ir/wp-content/uploads/2024/01/%D9%BE%D8%A7%DB%8C%D8%AA%D9%88%D9%86-%D8%B3%DB%8C%D8%A7%D9%87.webp\" alt=\"آموزش پایتون با گرایش امنیت\" width=\"1920\" height=\"1080\"></p>\n<p><span style=\"font-weight: 400\">اگر به کار کردن در زمینه امنیت سایبری علاقه دارید، آشنایی با زبان‎‌های برنامه‎‌نویسی مختلف و شرکت در دوره‎‌هایی مانند دوره آموزشی هک با پایتون به پیشرفت شما کمک زیادی می‌کند. پایتون فقط یک راه سریع و آسان برای تجزیه و تحلیل داده‌‎ها، برنامه‎‌نویسی وب و توسعه اپلیکیشن‎‌ها نیست، بلکه برای موفقیت در حوزه هک و امنیت نیز باید کدنویسی با حداقل یک زبان برنامه‌نویسی مانند پایتون را بلد باشید. معمولا افراد تازه کار در حوزه امنیت سایبری به‌جای تقویت دانش خود در زمینه برنامه‎نویسی به سراغ یادگیری مباحث مرتبط با نفوذ می‌‎روند و از ضعف دانش خود در برنامه‌‎نویسی غافل هستند!</span></p>\n<p><span style=\"font-weight: 400\">درحالی‌‌که لازمه موفقیت در حوزه امنیت، درک منطق آن چیزی است که قصد نفوذ به آن را دارید و این موضوع فقط با یادگیری زبان‎‌های برنامه‎‌نویسی حاصل می‌‎شود. یادگیری و استفاده از پایتون به شما کمک می‌‌کند تا خلاقیت و توانایی حل مسئله خود در مباحث امنیتی را افزایش دهید و درک عمیق‌‎تری از برنامه‎‌ها برای جلوگیری از نفوذ یا هک داشته باشید. با شرکت در دوره آموزشی پایتون سیاه سبزلرن علاوه‌‎بر یادگیری مفاهیم ابتدایی زبان برنامه‌‎نویسی پایتون، این فرصت را دارید تا دانش لازم برای شناخت بهتر ذهنیت هکرها و راه‌‎های نفوذ به سیستم‎‌ها مختلف را با مثال‌‎های کاربردی به‌‎دست آورید.</span></p>\n<h2 id=\"h_1\"><b>دوره آموزش هک با پایتون برای چه کسانی مناسب است؟</b></h2>\n<p><span style=\"font-weight: 400\">پایتون یکی از زبان‎های ساده برنامه‌‎نویسی است که امکان یادگیری آن در کوتاه مدت وجود دارد. در دنیای دیجیتال بسیاری از اپلیکیشن‌‎ها و سیستم‎‌ها به واسطه برنامه‌‌‎نویسی با زبان پایتون طراحی می‌شوند، بنابراین تا وقتی که به‎‌عنوان یک فرد علاقه‎‌مند به حوزه امنیت دانش برنامه‌‎نویسی خود را تقویت نکنید، در این حوزه موفق نخواهید شد.</span></p>\n<p><span style=\"font-weight: 400\">خرید دوره آموزش هک با پایتون به کسانی توصیه می‎‌شود که در زمینه امنیت فعالیت می‌‎کنند یا قصد شناخت باگ‎‌های امنیتی سیستم‎‌های مختلف برای جلوگیری از نفوذ را دارند. همچنین می‎‌توان شرکت در دوره پایتون سیاه را به افراد زیر نیز برای کسب درآمد یا پیشرفت شغلی توصیه کرد:</span></p>\n<ul>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">علاقه‌‌‌مندان به مباحث مربوط به امنیت سایبری؛</span></li>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">دانشجویان و افراد جویای کار در حوزه امنیت سایبری؛</span></li>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">هکرهای کلاه‌‌سفید و افرادی که در حوزه تست نفوذ فعالیت می‌‌کنند و می‌‌خواهند ابزارها و اسکریپت‌‌های اختصاصی خود را بسازند.</span></li>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">افرادی که به دنبال افزایش مهارت‌‌های خود در حوزه برنامه‌‌نویسی و امنیت هستند.</span></li>\n</ul>\n<h2 id=\"h_2\"><b>چرا دوره سبزلرن بهترین گزینه برای یادگیری هک با پایتون است؟</b></h2>\n<p><span style=\"font-weight: 400\">در این دوره همه مباحث به‌‎صورت کاملا کاربردی تدریس می‌‎شود و مدرس دوره به‌جای پرداختن به مثال‌‌های تئوری که ممکن است برای دانشجویان جذاب نباشد، آموزش‌‌های خود را بر روی مثال‌‌های واقعی ارائه می‌‎کند. بنابراین دانشجویان می‎‌توانند به‌‎سرعت مهارت‌‌های لازم را به‌‎صورت عملی یاد بگیرند و از آن‌‌ها در شرایط واقعی استفاده کنند.</span></p>\n<p><span style=\"font-weight: 400\">این تمرکز خاص بر مثال‎‌های کاربردی که براساس سال‎‌ها تجربه مدرس دوره به‎ دست آمده است، باعث می‌‌شود که دانشجویان به‌جای یادگیری کلیات زبان پایتون با ابزارها و سناریوهای مرتبط با امنیت سایبری بیشتر آشنا شوند و بتوانند آن‌‌ها را در پروژه‌های خود به کار گیرند. همچنین در فصل نهایی این دوره یکی از ابزارهای اختصاصی مدرس دوره جناب آقای «یلمه» در گیت هاب که در حال حاضر ۲ هزار و ۹۰۰ استار در گیت هاب دارد به‌‎عنوان پروژه عملی تدریس خواهد شد. به‌‎صورت کلی مزایای شرکت در دوره «پایتون سیاه» بر اساس توضیحات ارائه‌ شده به شرح زیر است:</span></p>\n<ul>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">آموزش کاربردی و واقع‌‌گرایانه؛</span></li>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">تمرکز بر مفاهیم امنیتی؛</span></li>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">آموزش مباحث با زبانی ساده؛</span></li>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">افزایش مهارت برنامه‌‌نویسی از طریق پروژه‌های واقعی؛</span></li>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">آموزش مطابق با الگوی ذهنی علاقه‌مندان به هک و امنیت؛</span></li>\n<li style=\"font-weight: 400\"><span style=\"font-weight: 400\">ارتقای خلاقیت و توانایی توسعه ابزارهای هک؛</span></li>\n</ul>\n<h2 id=\"h_3\"><b>نتایج شرکت در دوره آموزش هک با پایتون چیست؟</b></h2>\n<p><span style=\"font-weight: 400\">در پایان این دوره دانشجویان می‎‌توانند علاوه‎‌بر برنامه‎‌نویسی به زبان پایتون، از ترکیب کدهای این زبان برنامه‎‌نویسی با زبان‌‎های دیگر مانند پی اچ پی (PHP) و جاوا اسکریپت (js) برای ارائه راهکارهای ابتکاری مقابله با نفوذ استفاده کنند. همچنین بعد از گذراندن دوره آموزش هک با پایتون، دانشجو به سطحی می‌‌رسد که توانایی‌‌های زیر را خواهد داشت:</span></p>\n<ul>\n<li style=\"font-weight: 400\"><b>درک پایه از برنامه‌‌نویسی:</b><span style=\"font-weight: 400\"> افرادی که در دوره شرکت می‌‎کنند، اصول برنامه‌‌نویسی را درک کرده و می‎توانند از زبان پایتون در پروژه‌‌های مختلف استفاده کنند.</span></li>\n<li style=\"font-weight: 400\"><b>ترکیب زبان‌‌های مختلف با پایتون:</b><span style=\"font-weight: 400\"> با شرکت در این دوره دانشجو می‎تواند زبان‌های برنامه‌نویسی مختلفی مانند “PHP” و “JavaScript” را با پایتون ترکیب کرده و ابزارهای چند منظوره را توسعه دهد. همچنین به‌‌دلیل تجربه عملی که در این دوره برای دانشجویان حاصل می‎‌شود، یادگیری زبان‌‌های برنامه‌نویسی دیگر برای توسعه انواع اپلیکیشن‌‌ها برای آن‌‌‌ها ساده‌‌تر خواهد بود.</span></li>\n<li style=\"font-weight: 400\"><b>توسعه ابزار و انتشار:</b><span style=\"font-weight: 400\"> دانشجویان توانایی نوشتن و توسعه ابزارهای کاربردی را خواهند داشت و می‌‌توانند این ابزارها را در گیت‌هاب خود منتشر کرده و اعتبار کسب کنند.</span></li>\n<li style=\"font-weight: 400\"><b>آمادگی برای ورود به حوزه‌های جدید:</b><span style=\"font-weight: 400\"> دانشجویان به‌‌دلیل تمرین و دست‌ به‌ کد شدن در طول دوره، در ورود به حوزه‌‌های مختلف مانند وب هکینگ، توسعه اسکریپت‌‌های مختلف و یادگیری زبان‌‌های مرتبط با وب، با چالش‌‌های کمتری مواجه می‌‎شوند و اعتماد به نفس بالاتری برای گرفتن پروژه‎‌‌های مختلف خواهند داشت.</span></li>\n</ul>\n<h2 id=\"h_4\"><b>با شرکت نکردن در دوره پایتون سیاه چه چیزی را از دست می‎دهید؟</b></h2>\n<p><span style=\"font-weight: 400\">با شرکت نکردن در دوره «پایتون سیاه» فرصت مهمی برای کسب دانش برنامه‌‌نویسی که در مسیر هک و امنیت بسیار حیاتی است را از دست می‌دهید. شرکت در این دوره می‌‌تواند به میزان قابل توجهی زاویه دید شما در یادگیری پایتون و کاربرد آن در امنیت سایبری تقویت کند و باعث پیشرفت شغلی شما در این زمینه شود.</span></p>\n<p><span style=\"font-weight: 400\">اگرچه دیدن این دوره ضروری نیست و ممکن است زبان برنامه‌نویسی دیگری را برای یادگیری انتخاب کنید، اما اگر به‌‏‎دنبال مسیری سریع و آسان برای یادگیری هک در پایتون هستید، شرکت در این دوره به شدت توصیه می‌‌شود. زیرا در دوره‎‌های آکادمی سبزلرن صفر تا صد مطالب به‌صورت کاملا کاربردی و با مثال‌‎های واقعی تدریس می‎‌شود تا دانشجویان بتوانند به‎‌راحتی در دنیای واقعی از مطالب دوره برای پیاده‎‌سازی سیستم‎‌های امنیتی استفاده کنند.</span></p>\n<h2 id=\"h_5\"><b>آیا با شرکت در دوره پایتون سیاه می‌‌توان به درآمد رسید؟</b></h2>\n<p><span style=\"font-weight: 400\">اگر شما پیش‌نیاز‌هایی مانند شبکه، لینوکس، هکر قانونمند (CEH) و تست نفوذ با کالی لینوکس را گذرانده باشید و در این دوره نیز شرکت کنید، بدون شک می‌‌توانید بلافاصله وارد بازار کار شوید و به پیشرفت چشمگیری در این حوزه دست پیدا کنید. این دوره به شما مهارت‌‌های توسعه ابزارهای امنیتی را می‌‌آموزد که در دنیای واقعی بسیار ارزشمند است و می‌‌تواند مسیر حرفه‌‌ای شما را به طرز چشمگیری ارتقا دهد.</span><span style=\"font-weight: 400\"> همچنین می‎توانید برای کسب درآمد یا ارزیابی و رفع ایرادات پروژه‌‌های خود با کارشناسان سبزلرن ارتباط بگیرید تا همکاران ما در اسرع وقت شما را در این زمینه راهنمایی کنند.</span></p>\n<h2 id=\"h_6\"><b>چطور می‌‌‎توان از این دوره بهترین نتیجه را گرفت؟</b></h2>\n<p><span style=\"font-weight: 400\">دانشجو زمانی می‌‎تواند از دوره پایتون سیاه بهترین نتیجه را بگیرند که برای تمرین و مرور مباحث زمان کافی بگذارد، بر روی مطالب تمرکز کند. تعامل مستمر با مدرس دوره و پیگیری دقیق مباحث، به دانشجویان کمک می‌‌کند تا بتوانند از آموزش‌‌های کاربردی لذت ببرند و به نتیجه مطلوب دست یابند. ثبات در یادگیری، پشتکار و تمرین مستمر اصلی‌‎ترین نکاتی است که با رعایت آن‌‎ها می‎‌توان از شرکت در این دوره به نتیجه مطلوب یعنی کسب درآمد رسید.</span></p>\n<h2 id=\"h_7\"><b>مدرس دوره آموزش هک با پایتون کیست؟</b></h2>\n<p><span style=\"font-weight: 400\">مدرس دوره آموزش هک با پایتون جناب آقای «قدیر یلمه» هستند که از سال ۲۰۱۷ وارد عرصه هک و امنیت شده‎‌اند. آقای یلمه فردی علاقه‌‌مند به این حوزه پرچالش است و در محتوا‌های دوره نیز همواره سعی می‌‌کند تجربیات شخصی خود را به‌‎صورت کاملا شفاف با دانشجویان به اشتراک بگذارد. مدرس دوره معتقد است که اصل هر محتوایی برای آموزش مباحث مختلف را می‌توان به آسانی در اینترنت پیدا کرد، اما دانشجویان دوره‌های سبزلرن برای کسب تجربه متفاوت هزینه می‌‌کنند و به‌ همین دلیل بیان تجربیات در حین تدریس برای وی اهمیت ویژه‌‌ای دارد.</span></p>\n<h2 id=\"h_8\"><b>پیش نیاز دوره آموزش هک با پایتون</b></h2>\n<p><span style=\"font-weight: 400\">پیش‌نیازهای دوره آموزش هک با پایتون شامل تسلط پایه به زبان انگلیسی و گذراندن مباحثی همچون شبکه، لینوکس، دوره هکر قانونمند (CEH) و تست نفوذ با کالی لینوکس است. پیش نیازهای این دوره صرفا برای درک بهتر مطالب پیشرفته‌‌تر دوره ضروری هستند و به دانشجویان کمک می‌‌کنند تا درک بهتری نسبت به آموزش‎‌های این دوره داشته باشند.</span></p>\n<h2 id=\"h_9\"><b>جمع‌بندی دوره آموزش هک با پایتون</b></h2>\n<p><span style=\"font-weight: 400\">دوره آموزش هک با پایتون در سبزلرن یک دوره جامع و کاربردی است که دانشجویان را با مفاهیم پایه‌‌ای و پیشرفته برنامه‌نویسی پایتون در زمینه هک و امنیت آشنا می‌‌کند. این دوره شامل سناریوهای واقعی، پروژه‌‌های عملی و توسعه ابزارهای امنیتی است که با دانشجویان با گذراندن آن می‌‎توانند مهارت‌‌های خود را به سطحی برسانند که در اسرع وقت وارد بازار کار شوند یا ابزارهای خود را برای کسب درآمد توسعه دهند. با گذراندن دوره پایتون سیاه دانشجویان نه تنها به درک عمیقی از پایتون و امنیت اطلاعات می‌‌رسند، بلکه توانایی ترکیب آن با دیگر زبان‌‌های برنامه‌نویسی و توسعه ابزارهای کاربردی را نیز کسب می‌‌کنند.</span></p>\n\n\t\t\t\t\t\t\t</div>\n\t\t\t\t\t\t\t<div class=\"course-content-shadow absolute bottom-0 right-0 left-0 h-[160px] bg-gradient-to-t from-white dark:from-darker from-0% via-white/[55%] dark:via-darker/[55%] via-70% to-white/0 dark:to-darker/0 to-100% hidden\"></div>\n\t\t\t\t\t\t</div>",
    "courseFiles": [
        "CourseFile1.rar",
        "CourseFile2.rar"
    ]
}