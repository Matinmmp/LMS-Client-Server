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

export const app = express();

// cors => cross origin rsourse sharing
// app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));

app.use(cors({
    origin: ['http://localhost:3000'], // دامنه‌های مجاز
    credentials: true, // اجازه ارسال کوکی‌ها
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // متدهای مجاز
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // هدرهای مجاز
}));


app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200); // پاسخ سریع برای درخواست‌های OPTIONS
    }
    next();
});

 


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




app.use(ErrorMiddelware)