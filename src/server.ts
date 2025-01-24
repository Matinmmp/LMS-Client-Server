import { app } from "./app";
import connectDB from './utils/db';

// import AdminJS from 'adminjs'
// import AdminJSExpress from '@adminjs/express'
// import MongoStore from 'connect-mongo'
// import * as AdminJSMongoose from "@adminjs/mongoose"
// import AdminOptions from "./adminPanel/AdminOptions.js";
// import { componentLoader } from "./adminPanel/components/Components.js";

import dotenv from 'dotenv';

dotenv.config();


// AdminJS.registerAdapter({
//     Resource: AdminJSMongoose.Resource,
//     Database: AdminJSMongoose.Database,
// })


// const DEFAULT_ADMIN = {
//     email: 'matinmmp1381@gmail.com',
//     password: 'Matin.m.m.p.1381',
// }

// const authenticate = async (email: string, password: string) => {
//     if (email === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password) {
//         return Promise.resolve(DEFAULT_ADMIN)
//     }
//     return null
// }


const start = async () => {
    // const admin = new AdminJS({...AdminOptions,componentLoader,});
    // admin.watch()
    connectDB();

    // const sessionStore = MongoStore.create({
    //     client: mongoose.connection.getClient(),
    //     collectionName: "session",
    //     stringify: false,
    //     autoRemove: "interval",
    //     autoRemoveInterval: 1
    // });



    // const adminRouter = AdminJSExpress.buildAuthenticatedRouter(admin,
    //     {
    //         authenticate,
    //         cookieName: 'adminjs',
    //         cookiePassword: 'sessionsecret',
    //     },
    //     null,
    //     {
    //         store: sessionStore,
    //         resave: true,
    //         saveUninitialized: true,
    //         secret: 'sessionsecret',
    //         cookie: {
    //             httpOnly: process.env.NODE_ENV === 'production',
    //             secure: process.env.NODE_ENV === 'production',
    //         },
    //         name: 'adminjs',
    //     }
    // )

    // app.use(admin.options.rootPath, adminRouter);



    app.listen(process.env.PORT, () => {
        console.log(`run`);
    })
    
}

start()






