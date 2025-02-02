import { NextFunction, Request, Response } from "express";
import userRouter from "./routes/user.route";
import categoryRouter from "./routes/category.route";
import teacherRouter from "./routes/teacher.route";
import academyRouter from "./routes/academy.route";
import courseRouter from "./routes/course.route";
import dashboardRoute from "./routes/dashboard.route";
import homeRouter from "./routes/home.route";
import blogRouter from "./routes/blog.route";
import courseReviewRoute from "./routes/courseReview.route";
import cartRouter from "./routes/cart.route";
import formRoute from "./routes/form.route";

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import invoiceRouter from "./routes/invoice.route";
import { ErrorMiddelware } from "./middleware/error";

export const app = express();

// cors => cross origin rsourse sharing
// app.use(cors({ origin: ['http://localhost:3000'], credentials: true }));
app.use(cors({ origin: ['https://vc-virtual-learn.com','https://www.vc-virtual-learn.com'], credentials: true }));


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
app.use('/api/v1', invoiceRouter);




// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: 'API is working'
    })
})

app.use(ErrorMiddelware)