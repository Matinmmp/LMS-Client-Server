import { Request, Response, NextFunction } from 'express';
import CourseModel from '../models/course.model';
import userModel from '../models/user.model';
import { CatchAsyncError } from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import CourseReviewModel from '../models/courseReview..model';
import mongoose, { Mongoose } from 'mongoose';




const getCourseComments = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.params;
    const { page = 1, limit = 10 } = req.query; // صفحه و محدودیت تعداد کامنت‌ها
    const currentPage = parseInt(page as string, 10);
    const limitPerPage = parseInt(limit as string, 10);


    try {

        // const course = await CourseModel.findOne({ urlName: name }).select('_id').lean();
        // if (!course) {
        //     return next(new ErrorHandler('دوره‌ای با این نام یافت نشد.', 404));
        // }



        // // محاسبه تعداد کامنت‌های والد
        // const totalParentComments = await CourseReviewModel.countDocuments({ courseId: `${course._id}`, show: true });

        // const parentComments = await CourseReviewModel.aggregate([
        //     { $match: { courseId: `${course._id}`, show: true } },
        //     { $sort: { createdAt: -1 } }, // مرتب‌سازی بر اساس تاریخ ایجاد
        //     { $skip: (currentPage - 1) * limitPerPage }, // رد کردن کامنت‌های صفحه‌های قبل
        //     { $limit: limitPerPage }, // محدود کردن تعداد کامنت‌ها
        //     {
        //         $lookup: {
        //             from: 'users', // اتصال به مجموعه کاربران
        //             localField: 'userId',
        //             foreignField: '_id',
        //             as: 'user',
        //         },
        //     },
        //     // { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        //     {
        //         $project: {
        //             user: 1,
        //             comment: 1,
        //             commentsReplies: 1,
        //             createdAt: 1,
        //         },
        //     },
        // ])



        // // پردازش ریپلای‌ها
        // const processedComments = await Promise.all(
        //     parentComments.map(async (parentComment) => {
        //         const replies = parentComment.commentsReplies.map(async (reply: any) => {
        //             const user = await userModel.findById(reply.userId).select('name avatar.imageUrl role').lean();
        //             return {
        //                 user: user || { name: 'Unknown', avatar: '', role: '' },
        //                 comment: reply.comment,
        //                 createdAt: reply.createdAt,
        //             };
        //         });

        //         return {
        //             user: parentComment.user,
        //             comment: parentComment.comment,
        //             createdAt: parentComment.createdAt,
        //             commentsReplies: await Promise.all(replies),
        //         };
        //     })
        // );


        // res.status(200).json({
        //     success: true,
        //     comments: processedComments,
        //     totalPage: Math.ceil(totalParentComments / limitPerPage),
        //     currentPage,
        // });




        const course = await CourseModel.findOne({ urlName: name });
        if (!course) {
            return res.status(404).json({ message: "دوره پیدا نشد." });
        }

        // دریافت کامنت‌ها مرتبط با دوره
        const comments = await CourseReviewModel.find({ courseId: course._id, show: true })
            .populate({
                path: "userId",
                select: "name avatar.imageUrl role",
                model: userModel,
            })
            .populate({
                path: "commentsReplies.userId",
                select: "name avatar.imageUrl role",
                model: userModel,
            })
            .skip((currentPage - 1) * limitPerPage)
            .limit(limitPerPage);

        // محاسبه تعداد کل صفحات
        const totalComments = await CourseReviewModel.countDocuments({ courseId: course._id, show: true });
        const totalPage = Math.ceil(totalComments / limitPerPage);


        // ساختاردهی خروجی
        const response: any = {
            comments: comments.map((comment: any) => ({
                user: {
                    name: comment.userId?.name || "",
                    imageUrl: comment.userId?.avatar?.imageUrl || "",
                    role: comment.userId?.role || "",
                },
                comment: comment.comment,
                createAt: comment.createdAt,
                id: comment._id,
                commentsReplies: (comment.commentsReplies || []).map((reply: any) => ({
                    user: {
                        name: reply.userId?.name || "",
                        imageUrl: reply.userId?.avatar?.imageUrl || "",
                        role: reply.userId?.role || "",
                    },
                    comment: reply.comment,
                    createAt: reply.createdAt,
                })),
            })),
            currentPage,
            totalPage,
        };

        res.status(200).json({
            success: true,
            ...response,
        });

    } catch (error: any) {
        next(new ErrorHandler(error.message, 500));
    }
});


const createComment = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id || "";

        const { courseId, commentId, comment } = req.body;

        if (!courseId || !comment) {
            return next(new ErrorHandler("آیدی دوره و متن کامنت الزامی است", 400));
        }

        if (commentId) {
            const parentComment: any = await CourseReviewModel.findById(commentId);
            if (!parentComment) {
                return next(new ErrorHandler("کامنت والد یافت نشد", 404));
            }

            // اطمینان از وجود commentsReplies
            if (!parentComment.commentsReplies) {
                parentComment.commentsReplies = [];
            }

            // اضافه کردن ریپلای
            parentComment?.commentsReplies.push({
                userId,
                comment,
                show: false,
            });

            await parentComment.save();
            return res.status(201).json({
                success: true,
                message: "ریپلای با موفقیت ثبت شد",
            });
        }

        const newComment = await CourseReviewModel.create({
            userId,
            courseId,
            comment,
            show: false,
            commentsReplies: [],
        });

        res.status(201).json({
            success: true,
            message: "کامنت با موفقیت ثبت شد",
            comment: newComment,
        });

    } catch (error: any) {
        console.log(error.message)
        next(new ErrorHandler(error.message, 500));
    }
});



export {
    getCourseComments,
    createComment
};

