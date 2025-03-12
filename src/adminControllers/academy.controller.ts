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

const getAcademies = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const academies = await AcademyModel.find({})

        res.status(200).json({ academies, success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

const createAcademy = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { engName, description, longDescription, avatar, faName, tags, seoMeta } = req.body as ITeacherBody;
        console.log(req.body)
        if (!engName)
            return next(new ErrorHandler('نام آکادمی را وارد کنید', 400))

        const imageName = `${randomLetterGenerator()}-${engName}.png`

        const buffer = Buffer.from(avatar.split(',')[1], 'base64');

        const params = {
            Body: buffer,
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `academy/${imageName}`,
            ACL: 'public-read'
        };


        try {
            await client.send(new PutObjectCommand(params));

        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }

        const data: any = {
            engName, description, longDescription, faName, tags, seoMeta,
            avatar: {
                imageName: imageName,
                imageUrl: `${process.env.LIARA_Public_ENDPOINT}/academy/${imageName}`,
            }
        }



        const academy = await AcademyModel.create(data)

        res.status(201).json({ success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

const deleteAcademy = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;

        const academy: any = await AcademyModel.findById(id);

        if (!academy)
            return next(new ErrorHandler('آکادمی پیدا نشد', 404));


        const params = {
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `academy/${academy.imageName}`,
        }

        await client.send(new DeleteObjectCommand(params), async (error: any, data: any) => {
            if (error) {
                return next(new ErrorHandler(error.message, 400));
            } else {

            }
        });


        await TeacherModel.updateMany({ academies: id }, { $pull: { academies: id } });

        await academy.deleteOne();


        res.status(200).json({ success: true });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export {
    getAcademies,
    createAcademy,
    deleteAcademy
}