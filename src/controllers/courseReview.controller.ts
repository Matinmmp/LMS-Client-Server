import { Request, Response, NextFunction } from 'express';
import CourseModel from '../models/course.model';
import userModel from '../models/user.model';
import { CatchAsyncError } from '../middleware/catchAsyncErrors';
import ErrorHandler from '../utils/ErrorHandler';
import CourseReviewModel from '../models/blogReview..model';



const getCourseComments = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const { name } = req.params;
    const { page = 1, limit = 10 } = req.query; // صفحه و محدودیت تعداد کامنت‌ها
    const currentPage = parseInt(page as string, 10);
    const limitPerPage = parseInt(limit as string, 10);

    try {
        // یافتن دوره با نام یکتا
        const course = await CourseModel.findOne({ urlName: name }).select('_id').lean();
        if (!course) {
            return next(new ErrorHandler('دوره‌ای با این نام یافت نشد.', 404));
        }

        

        // محاسبه تعداد کامنت‌های والد
        const totalParentComments = await CourseReviewModel.countDocuments({ courseId: `${course._id}`, show: true });
 
        const parentComments = await CourseReviewModel.aggregate([ 
            { $match: { courseId: `${course._id}`, show: true } },
            { $sort: { createdAt: -1 } }, // مرتب‌سازی بر اساس تاریخ ایجاد
            { $skip: (currentPage - 1) * limitPerPage }, // رد کردن کامنت‌های صفحه‌های قبل
            { $limit: limitPerPage }, // محدود کردن تعداد کامنت‌ها
            {
                $lookup: {
                    from: 'users', // اتصال به مجموعه کاربران
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    user: { name: 1, 'avatar.imageUrl': 1, role: 1 },
                    comment: 1,
                    commentsReplies: 1,
                    createdAt: 1,
                },
            },
        ])

   

        // پردازش ریپلای‌ها
        const processedComments = await Promise.all(
            parentComments.map(async (parentComment) => {
                const replies = parentComment.commentsReplies.map(async (reply: any) => {
                    const user = await userModel.findById(reply.userId).select('name avatar.imageUrl role').lean();
                    return {
                        user: user || { name: 'Unknown', avatar: '', role: '' },
                        comment: reply.comment,
                        createdAt: reply.createdAt,
                    };
                });

                return {
                    user: parentComment.user,
                    comment: parentComment.comment,
                    createdAt: parentComment.createdAt,
                    commentsReplies: await Promise.all(replies),
                };
            })
        );

 

        res.status(200).json({
            success: true,
            comments: processedComments,
            totalPage: Math.ceil(totalParentComments / limitPerPage),
            currentPage,
        });
    } catch (error: any) {
        next(new ErrorHandler(error.message, 500));
    }
});

export { getCourseComments };
