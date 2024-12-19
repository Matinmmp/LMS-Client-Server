import { NextFunction, Request, Response } from "express";
import { ErrorMiddelware } from "./middleware/error";
import userRouter from "./routes/user.route";
import categoryRouter from "./routes/category.route";
import teacherRouter from "./routes/teacher.route";
import academyRouter from "./routes/academy.route";
import courseRouter from "./routes/course.route";
import dashboardRoute from "./routes/dashboard.route";
import homeRouter from "./routes/home.route";
import { CopyObjectCommand } from "@aws-sdk/client-s3";
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config();

import fs from 'fs'
import axios from "axios";
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

export const app = express();

// cors => cross origin rsourse sharing
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));


// body parser
app.use(express.json({ limit: '50mb' }))

// cookie parser
app.use(cookieParser())



app.use('/api/v1', userRouter);
app.use('/api/v1', categoryRouter);
app.use('/api/v1', teacherRouter);
app.use('/api/v1', academyRouter);
app.use('/api/v1', courseRouter);
app.use('/api/v1/dashboard', dashboardRoute);
app.use('/api/v1', homeRouter);








// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: 'API is working'
    })
})


//unknown route
// app.all('*', (req: Request, res: Response, next: NextFunction) => {
//     const err = new Error(`Route ${req.originalUrl} not found`) as any;
//     err.statusCode = 404;
//     next(err)
// })





const client = new S3Client({
    region: "default",
    endpoint: process.env.LIARA_ENDPOINT,
    credentials: {
        accessKeyId: process.env.LIARA_ACCESS_KEY,
        secretAccessKey: process.env.LIARA_SECRET_KEY,
    },
});


// app.get("/download", async (req: Request, res: Response) => {
//     const { key } = req.query as any;

//     if (!key) {
//         return res.status(400).send("Key is required");
//     }

//     const command = new GetObjectCommand({
//         Bucket: process.env.LIARA_BUCKET_NAME,
//         Key: key,
//     });

//     const signedUrl = await getSignedUrl(client, command, { expiresIn: 86400 });

//     res.setHeader("Content-Disposition", `attachment; filename="${key.split("/").pop()}"`);
//     res.redirect(signedUrl); // یا به طور مستقیم فایل را دانلود کنید
// });


const setHeadersForFile = async (key: string) => {
    const command = new CopyObjectCommand({
        Bucket: process.env.LIARA_BUCKET_NAME,
        CopySource: `${process.env.LIARA_BUCKET_NAME}/${key}`, // منبع فایل
        Key: key,
        MetadataDirective: "REPLACE", // بازنویسی متادیتا
        ContentDisposition: "attachment", // تنظیم هدر موردنظر
    });

    await client.send(command);
    console.log(`Headers updated for ${key}`);
}



app.get("/download", async (req: Request, res: Response) => {

    try {
        const { key } = req.query;
        const s = `https://buckettest.storage.c2.liara.space/${key}`
        const response = await axios.get(s, {
            responseType: 'stream' // دریافت داده‌ها به صورت استریم
        });
       
        res.redirect(s); 

  
        res.setHeader('Content-Disposition', `attachment; filename="next1.mp4"`);
        res.setHeader('Content-Type', `response.headers['content-type']`);

     
        response.data.pipe(res);
 
    } catch {
        res.json({
            success: false
        })
    }

});





app.use(ErrorMiddelware)