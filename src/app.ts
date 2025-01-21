import { NextFunction, Request, Response } from "express";
import { ErrorMiddelware } from "./middleware/error.js";
import userRouter from "./routes/user.route.js";
import categoryRouter from "./routes/category.route.js";
import teacherRouter from "./routes/teacher.route.js";
import academyRouter from "./routes/academy.route.js";
import courseRouter from "./routes/course.route.js";
import dashboardRoute from "./routes/dashboard.route.js";
import homeRouter from "./routes/home.route.js";
import blogRouter from "./routes/blog.route.js";
import courseReviewRoute from "./routes/courseReview.route.js";
import cartRouter from "./routes/cart.route.js";
import formRoute from "./routes/form.route.js";

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

export const app = express();

// cors => cross origin rsourse sharing
app.use(cors({ origin: ['http://localhost:3000', 'http://192.168.1.18:3000'], credentials: true }));


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
app.use('/api/v1', blogRouter);
app.use('/api/v1', courseReviewRoute);
app.use('/api/v1', cartRouter);
app.use('/api/v1', formRoute);




// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: 'API is working'
    })
})


// app.use(ErrorMiddelware)