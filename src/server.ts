import { app } from "./app";
import connectDB from './utils/db';
require('dotenv').config();
import AdminJS from 'adminjs'
import AdminJSExpress from '@adminjs/express'
import CourseModel from "./models/course.model";
import AcademyModel from "./models/academy.model";
import TeacherModel from "./models/teacher.model";
import CategoryModel from "./models/category.model";
import InvoiceModel from "./models/Invoice.model";
import CourseSectionModel from "./models/courseSection.model";
import LessonModel from "./models/sectionLesson.model";
import userModel from "./models/user.model";

import MongoStore from 'connect-mongo'
import session from 'express-session'
import mongoose from "mongoose";
import * as AdminJSMongoose from "@adminjs/mongoose"

AdminJS.registerAdapter({
    Resource: AdminJSMongoose.Resource,
    Database: AdminJSMongoose.Database,
})

 

const DEFAULT_ADMIN = {
    email: 'matinmmp1381@gmail.com',
    password: 'Matin.m.m.p.1381',
}

const authenticate = async (email: string, password: string) => {
    if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
        return Promise.resolve(DEFAULT_ADMIN)
    }
    return null
}

const adminOptions = {
    resources: [
        {
            resource: CourseModel,
            options: {
                navigation: {
                    name: 'Courses',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
        {
            resource: AcademyModel,
            options: {
                navigation: {
                    name: 'Academies',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
        {
            resource: TeacherModel,
            options: {
                navigation: {
                    name: 'Teachers',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
        {
            resource: CategoryModel,
            options: {
                navigation: {
                    name: 'Categories',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
        {
            resource: InvoiceModel,
            options: {
                navigation: {
                    name: 'Invoices',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
        {
            resource: CourseSectionModel,
            options: {
                navigation: {
                    name: 'Section',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
        {
            resource: LessonModel,
            options: {
                navigation: {
                    name: 'leccons',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
        {
            resource: userModel,
            options: {
                navigation: {
                    name: 'users',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
    ],

    rootPath: '/admin',
};

const start = async () => {
    const admin = new AdminJS(adminOptions);
    connectDB();

    const sessionStore = MongoStore.create({
        client: mongoose.connection.getClient(),
        collectionName: "session",
        stringify: false,
        autoRemove: "interval",
        autoRemoveInterval: 1
    });



    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin,
        {
            authenticate,
            cookieName: 'adminjs',
            cookiePassword: 'sessionsecret',
        },
        null,
        {
            store: sessionStore,
            resave: true,
            saveUninitialized: true,
            secret: 'sessionsecret',
            cookie: {
                httpOnly: process.env.NODE_ENV === 'production',
                secure: process.env.NODE_ENV === 'production',
            },
            name: 'adminjs',
        }
    )

    app.use(admin.options.rootPath, adminRouter);



    app.listen(process.env.PORT, () => {
        console.log(`AdminJS started on http://localhost:${process.env.PORT}${admin.options.rootPath}`);
    })
}

start()




