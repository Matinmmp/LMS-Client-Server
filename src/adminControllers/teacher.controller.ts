import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import TeacherModel from "../models/teacher.model";
import randomLetterGenerator from '../utils/randomName';
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import AcademyModel from "../models/academy.model";
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


interface ITeacherBody {
    engName: string;
    faName: string;
    tags: string;
    description?: string;
    longDescription: string;
    avatar: string;
    seoMeta: { title: string; description: string; keywords: string[] };

}

const getTeachers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const teachers = await TeacherModel.find({}).populate('academies', 'name');

        res.status(200).json({ teachers, success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

const createTeacher = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { engName, description, longDescription, avatar, faName, tags ,seoMeta} = req.body as ITeacherBody;

        if (!engName)
            return next(new ErrorHandler('نام مربی را وارد کنید', 400))

        const imageName = `${randomLetterGenerator()}-${engName}.png`

        const buffer = Buffer.from(avatar.split(',')[1], 'base64');

        const params = {
            Body: buffer,
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `teacher/${imageName}`,
            ACL: 'public-read'
        };



        try {
            await client.send(new PutObjectCommand(params));

        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }

        const data: any = {
            engName, description, longDescription, faName, tags,seoMeta,
            avatar: {
                imageName: imageName,
                imageUrl: `https://images.vc-virtual-learn.com/teacher/${imageName}`,
            }
        }



        const teacher = await TeacherModel.create(data)

        res.status(201).json({ success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

const deleteTeacher = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;

        const teacher: any = await TeacherModel.findById(id);

        if (!teacher) {
            return next(new ErrorHandler('معلم پیدا نشد', 404));
        }

        const params = {
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `teacher/${teacher.imageName}`,
        }

        await client.send(new DeleteObjectCommand(params), async (error: any, data: any) => {
            if (error) {
                return next(new ErrorHandler(error.message, 400));
            } else {
                // حذف معلم از مدل‌های آکادمی
                await AcademyModel.updateMany({ teachers: id }, { $pull: { teachers: id } });

                // حذف معلم از مدل معلم
                await teacher.deleteOne();

                res.status(200).json({ success: true });
            }
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

const editTeacherAcademyList = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const teacherId = req.params.id;
        const { academiesId } = req.body

        const teacher: any = await TeacherModel.findById(teacherId);

        if (!teacher) {
            return next(new ErrorHandler('معلم پیدا نشد', 404));
        }

        await TeacherModel.findByIdAndUpdate(teacherId, { academies: academiesId }, { new: true });

        // به‌روزرسانی لیست مدرسین در آکادمی‌ها
        for (const academyId of academiesId) {
            // اضافه کردن معلم به لیست مدرسین آکادمی
            await AcademyModel.findByIdAndUpdate(academyId, { $addToSet: { teachers: teacherId } }, { new: true });
        }

        // حذف معلم از لیست مدرسین آکادمی‌هایی که دیگر در academiesId نیستند
        await AcademyModel.updateMany({ teachers: teacherId, _id: { $nin: academiesId } }, { $pull: { teachers: teacherId } });


        res.status(200).json({ success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export {
    getTeachers,
    createTeacher,
    deleteTeacher,
    editTeacherAcademyList
}