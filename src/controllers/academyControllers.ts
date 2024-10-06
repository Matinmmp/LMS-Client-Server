import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
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




const getAcademies = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const academies = await AcademyModel.find({})

        res.status(200).json({ academies, success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})




export {
    getAcademies,
 
}