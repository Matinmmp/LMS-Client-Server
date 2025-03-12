import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import CourseRatingModel from "../models/courseRating.model";
import AcademyModel from "../models/academy.model";
import TeacherModel from "../models/teacher.model";
import CourseSectionModel from "../models/courseSection.model";
import LessonModel from "../models/sectionLesson.model";

// Update course ratings and rating numbers
const updateCourseRatings = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // دریافت تمام دوره‌ها
        const courses = await CourseModel.find();

        // برای هر دوره، امتیاز و تعداد رای‌دهندگان را محاسبه و ذخیره کنید
        for (const course of courses) {
            // دریافت تمام ریتینگ‌های مربوط به این دوره
            const ratings = await CourseRatingModel.find({ courseId: course._id });

            // محاسبه میانگین امتیاز
            const totalRating = ratings.reduce((sum, rating) => sum + rating.rating, 0);
            const averageRating = ratings.length > 0 ? totalRating / ratings.length : 0;

            // محاسبه تعداد رای‌دهندگان
            const ratingNumber = ratings.length;

            // به‌روزرسانی فیلدهای rating و ratingNumber در دوره
            course.rating = averageRating;
            course.ratingNumber = ratingNumber;
            course.academyId = course.academyId;
            course.teacherId = course.teacherId;

            await course.save();
        }

        res.status(200).json({
            success: true,
            message: "امتیاز و تعداد رای‌دهندگان تمام دوره‌ها به‌روزرسانی شد.",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Update academy ratings and related fields
const updateAcademyRatings = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // دریافت تمام آکادمی‌ها
        const academies = await AcademyModel.find();

        // برای هر آکادمی، امتیاز و اطلاعات مربوطه را محاسبه و ذخیره کنید
        for (const academy of academies) {
            // دریافت تمام دوره‌های مرتبط با این آکادمی
            const courses = await CourseModel.find({ academyId: academy._id });

            // محاسبه امتیاز و تعداد رای‌دهندگان
            let totalRating = 0;
            let totalRatingNumber = 0;
            let totalStudents = 0;

            for (const course of courses) {
                // دریافت تمام ریتینگ‌های مربوط به این دوره
                const ratings = await CourseRatingModel.find({ courseId: course._id });

                // محاسبه مجموع امتیاز و تعداد رای‌دهندگان
                totalRating += ratings.reduce((sum, rating) => sum + rating.rating, 0);
                totalRatingNumber += ratings.length;

                // جمع تعداد دانشجویان دوره
                totalStudents += course.purchased || 0;
            }

            // محاسبه میانگین امتیاز
            const averageRating = totalRatingNumber > 0 ? totalRating / totalRatingNumber : 0;

            // به‌روزرسانی فیلدهای آکادمی
            academy.rating = averageRating;
            academy.ratingNumber = totalRatingNumber;
            academy.totalStudents = totalStudents;
            academy.totalTeachers = academy.teachers?.length || 0;
            academy.totalCourses = academy.courses?.length || 0;
            await academy.save();
        }

        res.status(200).json({
            success: true,
            message: "امتیاز و اطلاعات تمام آکادمی‌ها به‌روزرسانی شد.",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

const updateTeacherRatings = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // دریافت تمام مدرسین
        const teachers = await TeacherModel.find();

        // برای هر مدرس، امتیاز و اطلاعات مربوطه را محاسبه و ذخیره کنید
        for (const teacher of teachers) {
            // دریافت تمام دوره‌های مرتبط با این مدرس
            const courses = await CourseModel.find({ teacherId: teacher._id });

            // محاسبه امتیاز و تعداد رای‌دهندگان
            let totalRating = 0;
            let totalRatingNumber = 0;
            let totalStudents = 0;

            for (const course of courses) {
                // دریافت تمام ریتینگ‌های مربوط به این دوره
                const ratings = await CourseRatingModel.find({ courseId: course._id });

                // محاسبه مجموع امتیاز و تعداد رای‌دهندگان
                totalRating += ratings.reduce((sum, rating) => sum + rating.rating, 0);
                totalRatingNumber += ratings.length;

                // جمع تعداد دانشجویان دوره
                totalStudents += course.purchased || 0;
            }

            // محاسبه میانگین امتیاز
            const averageRating = totalRatingNumber > 0 ? totalRating / totalRatingNumber : 0;

            // به‌روزرسانی فیلدهای مدرس
            teacher.rating = averageRating;
            teacher.ratingNumber = totalRatingNumber;
            teacher.totalStudents = totalStudents;
            teacher.totalCourses = teacher.courses?.length || 0;
            teacher.totalAcademies = teacher.academies?.length || 0;
            await teacher.save();
        }

        res.status(200).json({
            success: true,
            message: "امتیاز و اطلاعات تمام مدرسین به‌روزرسانی شد.",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// Update course sections and lessons information
const updateCourseDetails = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // دریافت تمام دوره‌ها
        const courses = await CourseModel.find();

        // برای هر دوره، سکشن‌ها و درس‌ها را بررسی و فیلدها را به‌روزرسانی کنید
        for (const course of courses) {
            // دریافت تمام سکشن‌های مربوط به این دوره
            const sections = await CourseSectionModel.find({ courseId: course._id });

            // متغیرهای موقت برای محاسبه فیلدهای دوره
            let totalLessons = 0;
            let totalSections = sections.length;
            let courseLength = 0;

            // برای هر سکشن، درس‌ها را بررسی و فیلدهای سکشن را به‌روزرسانی کنید
            for (const section of sections) {
                // دریافت تمام درس‌های مربوط به این سکشن
                const lessons = await LessonModel.find({ courseSectionId: section._id });

                // محاسبه totalLessons و totalLength برای سکشن
                section.totalLessons = lessons.length;
                section.totalLength = lessons.reduce((sum, lesson) => sum + (lesson.lessonLength || 0), 0);

                // ذخیره تغییرات سکشن
                await section.save();

                // اضافه کردن به متغیرهای موقت دوره
                totalLessons += lessons.length;
                courseLength += section.totalLength;
            }

            // به‌روزرسانی فیلدهای دوره
            course.totalLessons = totalLessons;
            course.totalSections = totalSections;
            course.courseLength = courseLength;
            course.academyId = course.academyId;
            course.teacherId = course.teacherId;
            await course.save();
        }

        res.status(200).json({
            success: true,
            message: "اطلاعات سکشن‌ها و درس‌های تمام دوره‌ها به‌روزرسانی شد.",
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});



export { updateCourseRatings, updateAcademyRatings, updateTeacherRatings, updateCourseDetails };