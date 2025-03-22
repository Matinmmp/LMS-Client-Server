import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
// import { redis } from "../utils/redis";
import randomLetterGenerator from "../utils/randomName";
import AcademyModel from "../models/academy.model";
import TeacherModel from "../models/teacher.model";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import CourseSectionModel from "../models/courseSection.model";
import mongoose from "mongoose";
import LessonModel from "../models/sectionLesson.model";
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


// upload course
const uploadCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body;
        const thumbnail = body.thumbnail;

        const imageName = `${randomLetterGenerator()}-${body.name}.png`;

        const buffer = Buffer.from(thumbnail.split(',')[1], 'base64');

        const params = {
            Body: buffer,
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `CoursesImages/${imageName}`,
            ACL: 'public-read',
        };

        try {
            await client.send(new PutObjectCommand(params));
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }

        const data: any = {
            ...body,
            thumbnail: {
                imageName: imageName,
                imageUrl: `https://images.vc-virtual-learn.com/CoursesImages/${imageName}`,
            },
        };

        // ایجاد دوره
        const course = await CourseModel.create(data);

        // اضافه کردن course._id به لیست courses در آکادمی مربوطه
        if (body.academyId) {
            await AcademyModel.findByIdAndUpdate(
                body.academyId,
                { $push: { courses: course._id } },
                { new: true, useFindAndModify: false }
            );
        }

        // اضافه کردن course._id به لیست courses در تیچر مربوطه
        if (body.teacherId) {
            await TeacherModel.findByIdAndUpdate(
                body.teacherId,
                { $push: { courses: course._id } },
                { new: true, useFindAndModify: false }
            );
        }

        res.status(201).json({
            success: true,
            course,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// get all courses
const getAllCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const courses = await CourseModel.find().select('name folderName rating purchased totalLessons thumbnail');


        res.status(201).json({
            success: true,
            courses
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})


// Delete Course --- only for admin
const deleteCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const course = await CourseModel.findById(id);

        if (!course)
            return next(new ErrorHandler('دوره پیدا نشد', 404))

        await course.deleteOne({ id });


        res.status(200).json({
            success: true,
            message: 'دوره با موفقیت حذف شد',
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// get single course --- without purchasing
const getCourseById = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseId = req.params.id;

        const course = await CourseModel.findById(courseId);

        res.status(201).json({
            success: true,
            course
        })
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 500));

    }
})

// edit course
const editCourse = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params; // آیدی دوره‌ای که قراره ویرایش بشه
        const data = req.body;

        // پیدا کردن دوره فعلی
        const existingCourse = await CourseModel.findById(id);
        if (!existingCourse) {
            return next(new ErrorHandler("دوره مورد نظر یافت نشد.", 404));
        }

        console.log(data?.thumbnail !== existingCourse?.thumbnail?.imageUrl)
        

        // بررسی تغییرات عکس
        if (data?.thumbnail && data?.thumbnail !== existingCourse?.thumbnail?.imageUrl) {
            // حذف عکس قدیمی از باکت
            const deleteParams = {
                Bucket: process.env.LIARA_BUCKET_NAME,
                Key: `CoursesImages/${existingCourse.thumbnail.imageName}`,
            };

            try {
                await client.send(new DeleteObjectCommand(deleteParams));
            } catch (error: any) {
                return next(new ErrorHandler("خطا در حذف عکس قدیمی.", 500));
            }

            // آپلود عکس جدید
            const imageName = `${randomLetterGenerator()}-${data.name}.png`;
            const buffer = Buffer.from(data.thumbnail.split(',')[1], 'base64');

            const uploadParams = {
                Body: buffer,
                Bucket: process.env.LIARA_BUCKET_NAME,
                Key: `CoursesImages/${imageName}`,
                ACL: 'public-read',
            };

            try {
                await client.send(new PutObjectCommand(uploadParams));
            } catch (error: any) {
                return next(new ErrorHandler("خطا در آپلود عکس جدید.", 500));
            }

            // اضافه کردن اطلاعات عکس جدید به دیتا
            data.thumbnail = {
                imageName: imageName,
                imageUrl: `https://images.vc-virtual-learn.com/CoursesImages/${imageName}`,
            };
        }
        else{
            data.thumbnail = {
                imageName: existingCourse?.thumbnail?.imageName,
                imageUrl: existingCourse?.thumbnail?.imageUrl,
            };
        }

        // بررسی تغییرات academyId
        if (data.academyId && data.academyId !== existingCourse.academyId.toString()) {
            // حذف course._id از آکادمی قدیمی
            await AcademyModel.findByIdAndUpdate(
                existingCourse.academyId,
                { $pull: { courses: existingCourse._id } },
                { new: true, useFindAndModify: false }
            );

            // اضافه کردن course._id به آکادمی جدید
            await AcademyModel.findByIdAndUpdate(
                data.academyId,
                { $push: { courses: existingCourse._id } },
                { new: true, useFindAndModify: false }
            );
        }

        // بررسی تغییرات teacherId
        if (data.teacherId && data.teacherId !== existingCourse.teacherId.toString()) {
            // حذف course._id از تیچر قدیمی
            await TeacherModel.findByIdAndUpdate(
                existingCourse.teacherId,
                { $pull: { courses: existingCourse._id } },
                { new: true, useFindAndModify: false }
            );

            // اضافه کردن course._id به تیچر جدید
            await TeacherModel.findByIdAndUpdate(
                data.teacherId,
                { $push: { courses: existingCourse._id } },
                { new: true, useFindAndModify: false }
            );
        }

        // به‌روزرسانی lastContentUpdate
        data.lastContentUpdate = new Date();

        // به‌روزرسانی دوره
        const updatedCourse = await CourseModel.findByIdAndUpdate(id, data, {
            new: true, // برگرداندن سند به‌روزرسانی‌شده
            runValidators: true, // اعتبارسنجی فیلدها
        });

        res.status(200).json({
            success: true,
            course: updatedCourse,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const addSection = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params; // آیدی دوره‌ای که سکشن به آن اضافه می‌شود
        const data = req.body;

        // بررسی وجود دوره
        const course: any = await CourseModel.findById(id);
        console.log(course.academyId)
        if (!course) {
            return next(new ErrorHandler("دوره مورد نظر یافت نشد.", 404));
        }

        // ایجاد سکشن جدید
        const newSection = await CourseSectionModel.create({ ...data, courseId: id });

        // به‌روزرسانی lastContentUpdate در دوره
        course.lastContentUpdate = new Date();
        course.totalSections += 1;
        course.teacherId = course.teacherId;
        course.academyId = course.academyId;
        await course.save();

        res.status(201).json({
            success: true,
            section: newSection,
        });

    } catch (error: any) {
        // console.log(error)
        return next(new ErrorHandler(error.message, 500));
    }
});

const getSectionsByCourseId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params; // آیدی دوره

        // بررسی وجود دوره
        const course = await CourseModel.findById(id);
        if (!course) {
            return next(new ErrorHandler("دوره مورد نظر یافت نشد.", 404));
        }

        // دریافت سکشن‌های دوره بر اساس order به‌صورت صعودی
        const sections = await CourseSectionModel.find({ courseId: id })
            .sort({ order: 1 }) // مرتب‌سازی بر اساس order به‌صورت صعودی
            .exec();

        res.status(200).json({
            success: true,
            sections,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const editSectionBySectionId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: sectionId } = req.params; // آیدی سکشن
        const { courseId } = req.body; // آیدی کورس
        const data = req.body; // داده‌های جدید برای به‌روزرسانی

        // بررسی وجود کورس
        const course: any = await CourseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("دوره مورد نظر یافت نشد.", 404));
        }

        // بررسی وجود سکشن
        const section = await CourseSectionModel.findById(sectionId);
        if (!section) {
            return next(new ErrorHandler("سکشن مورد نظر یافت نشد.", 404));
        }

        // بررسی مالکیت سکشن (مطمئن شوید سکشن متعلق به کورس است)
        if (section.courseId.toString() !== courseId) {
            return next(new ErrorHandler("سکشن متعلق به این دوره نیست.", 400));
        }


        // به‌روزرسانی سکشن
        const updatedSection = await CourseSectionModel.findByIdAndUpdate(
            sectionId,
            data,
            { new: true, runValidators: true } // برگرداندن سند به‌روزرسانی‌شده و اعتبارسنجی فیلدها
        );

        // به‌روزرسانی lastContentUpdate در کورس
        course.lastContentUpdate = new Date();
        course.teacherId = course.teacherId;
        course.academyId = course.academyId;
        await course.save();

        res.status(200).json({
            success: true,
            section: updatedSection,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


const addLessonBySectionId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: sectionId } = req.params; // آیدی سکشن
        const data = req.body; // داده‌های درس جدید

        // بررسی وجود سکشن
        const section = await CourseSectionModel.findById(sectionId);
        if (!section) {
            return next(new ErrorHandler("سکشن مورد نظر یافت نشد.", 404));
        }

        // پیدا کردن دوره مربوطه
        const course: any = await CourseModel.findById(section.courseId);
        if (!course) {
            return next(new ErrorHandler("دوره مربوطه یافت نشد.", 404));
        }

        // ایجاد درس جدید
        const newLesson = await LessonModel.create({ ...data, courseSectionId: sectionId, courseId: section.courseId });

        // به‌روزرسانی totalLessons و totalLength در سکشن
        section.totalLessons += 1;
        section.totalLength += data.lessonLength || 0; // اگر lessonLength وجود داشت، اضافه کنید
        await section.save();



        // به‌روزرسانی totalLessons و courseLength در دوره
        course.totalLessons += 1;
        course.courseLength += data.lessonLength || 0; // اگر lessonLength وجود داشت، اضافه کنید
        course.lastContentUpdate = new Date(); // به‌روزرسانی lastContentUpdate
        course.teacherId = course.teacherId;
        course.academyId = course.academyId;
        await course.save();

        res.status(201).json({
            success: true,
            lesson: newLesson,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Get sections with lessons by courseId
const getSectionsWithLessonsByCourseId = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: courseId } = req.params; // آیدی دوره

        // بررسی وجود دوره
        const course = await CourseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler("دوره مورد نظر یافت نشد.", 404));
        }

        // دریافت سکشن‌های دوره بر اساس order به‌صورت صعودی
        const sections = await CourseSectionModel.find({ courseId }).sort({ order: 1 }) .exec();

        // برای هر سکشن، لیست درس‌ها را به ترتیب order اضافه می‌کنیم
        const sectionsWithLessons = await Promise.all(
            sections.map(async (section) => {
                const lessons = await LessonModel.find({ courseSectionId: section._id }).sort({ order: 1 }).exec();

                return {
                    ...section.toObject(), // تبدیل سکشن به آبجکت
                    lessonsList: lessons, // اضافه کردن لیست درس‌ها
                };
            })
        );

        res.status(200).json({
            success: true,
            sections: sectionsWithLessons,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


// Edit lesson by lessonId
const editLesson = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id: lessonId } = req.params; // آیدی درس
        const data = req.body; // داده‌های جدید برای ویرایش

        // بررسی وجود درس
        const lesson = await LessonModel.findById(lessonId);
        if (!lesson) {
            return next(new ErrorHandler("درس مورد نظر یافت نشد.", 404));
        }

        // ذخیره طول قدیم درس
        const oldLessonLength = lesson.lessonLength || 0;

        const updatLesson = await LessonModel.findByIdAndUpdate(
            lessonId,
            data,
            { new: true, runValidators: true } // برگرداندن سند به‌روزرسانی‌شده و اعتبارسنجی فیلدها
        );

        // ذخیره تغییرات
        await lesson.save();
        

        // اگر lessonLength تغییر کرده باشد
        if (data?.lessonLength !== undefined && data?.lessonLength !== oldLessonLength && data.lessonLength) {
            const lengthDifference = data.lessonLength - oldLessonLength;
            // به‌روزرسانی totalLength در سکشن
            const section = await CourseSectionModel.findById(lesson.courseSectionId);
            if (section) {
                section.totalLength += lengthDifference;
                await section.save();
            }

            // به‌روزرسانی courseLength در دوره
            const course = await CourseModel.findById(lesson.courseId);
            if (course) {
                course.courseLength += lengthDifference;
                course.teacherId = course.teacherId;
                course.academyId = course.academyId;

                await course.save();
            }
        }

        res.status(200).json({
            success: true,
            updatLesson,
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});



export {
    uploadCourse,
    getAllCourses,
    deleteCourse,
    getCourseById,
    editCourse,
    addSection,
    getSectionsByCourseId,
    editSectionBySectionId,
    addLessonBySectionId,
    getSectionsWithLessonsByCourseId,
    editLesson
}