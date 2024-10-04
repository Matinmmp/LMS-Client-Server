import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import randomLetterGenerator from "../utils/randomName";
import { error } from "console";
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



// قابل کش
const getHomeLastCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courses = await CourseModel.find({ showCourse: true }).sort({ updatedAt: -1 }).limit(16)
            .select("totalVideos isInVirtualPlus discount.percent discount.expireTime status ratings level thumbnail.imageUrl description name");

        setTimeout(() => {
            res.status(400).json({
                success: true,
                courses
            });
        }, 1000); 

        


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
})



export {
    getAllCourses,
    getCourseById,
    editCourse,
    getHomeLastCourses
}