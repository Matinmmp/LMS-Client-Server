import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import BlogModel from "../models/blog.model";
import mongoose from "mongoose";
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config();

const client = new S3Client({
    region: "default",
    endpoint: process.env.LIARA_ENDPOINT,
    credentials: {
        accessKeyId: process.env.LIARA_ACCESS_KEY,
        secretAccessKey: process.env.LIARA_SECRET_KEY
    }
})


const getRelatedBlogsByCourseName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseName = req.params.name;

        // یافتن دوره با نام مشخص
        const course = await CourseModel.findOne({ urlName: courseName }).lean();

        if (!course) {
            return res.status(404).json({ success: false, message: 'دوره‌ای با این نام یافت نشد' });
        }

        // بررسی خالی بودن فیلد relatedBlogs
        if (!course.relatedBlogs || course.relatedBlogs.length === 0) {
            return res.status(404).json({ success: false, message: 'بلاگی مرتبط با این دوره یافت نشد' });
        }
        

        const relatedBlogs = await BlogModel.find({ _id: { $in: course.relatedBlogs } })
            .select('title slug lastUpdated publishDate likes views thumbnail') 
            .sort({ publishDate: -1 }); 

        // ارسال پاسخ
        res.status(200).json({
            success: true,
            blogs: relatedBlogs
        });
    } catch (error: any) {
 
        return next(new ErrorHandler(error.message, 500));
    }
});


export{
    getRelatedBlogsByCourseName
}