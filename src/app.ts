import { NextFunction, Request, Response } from "express";
import { ErrorMiddelware } from "./middleware/error";
import userRouter from "./routes/user.route";
import categoryRouter from "./routes/category.route";
import teacherRouter from "./routes/teacher.route";
import academyRouter from "./routes/academy.route";
import courseRouter from "./routes/course.route";
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
require('dotenv').config();


export const app = express();

// cors => cross origin rsourse sharing
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));


// body parser
app.use(express.json({ limit: '50mb' }))

// cookie parser
app.use(cookieParser())



app.use('/api/v1', userRouter);
app.use('/api/v1', categoryRouter);
app.use('/api/v1', teacherRouter);
app.use('/api/v1', academyRouter);
app.use('/api/v1', courseRouter);






// testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: 'API is working'
    })
})


//unknown route
app.all('*', (req: Request, res: Response, next: NextFunction) => {
    const err = new Error(`Route ${req.originalUrl} not found`) as any;
    err.statusCode = 404;
    next(err)
})



app.use(ErrorMiddelware)