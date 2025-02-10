import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import sendMail from "../utils/sendMail";
import { createToken, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import randomLetterGenerator from "../utils/randomName";
import InvoiceModel from "../models/Invoice.model";
import CourseModel from "../models/course.model";

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const client = new S3Client({
    region: "default",
    endpoint: process.env.LIARA_ENDPOINT || "",
    credentials: {
        accessKeyId: process.env.LIARA_ACCESS_KEY || "",
        secretAccessKey: process.env.LIARA_SECRET_KEY || ""
    }
})

interface IRegistrationUserBody {
    name: string,
    email: string,
    password: string,
    avatar?: string,

}

interface IActivationToken {
    token: string,
    activationCode: string
}

interface IActivationRequest {
    activation_token: string,
    activation_code: string,
    special_code?: string
}

interface ILoginRequest {
    email: string;
    password: string
}

interface IUpdateUserInfo {
    name?: string,
    phone?: string
}

// Controllers

const registrationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;
        const isEmailExist = await userModel.findOne({ email })

        if (!name || !email || !password)
            return next(new ErrorHandler('یکی از فیلد ها خالی هست', 400))

        if (isEmailExist)
            return next(new ErrorHandler('این ایمیل قبلا ثبت نام کرده است', 400))

        const user: IRegistrationUserBody = { name, email, password }

        const activationObject = createActivationToken(user);

        const activationCode = activationObject?.activationCode;

        const data = { user: { name: user.name }, activationCode };



        // const html = await ejs.renderFile(path.join('../mails/activation-mail.ejs'), data)

        try {
            await sendMail({
                email: user.email,
                subject: 'فعال سازی حساب',
                template: 'activation-mail.ejs',
                data
            });

            res.status(201).json({
                success: true,
                message: `لطفا ایمیل خود را بررسی کنید : ${user.email}`,
                activationToken: activationObject.token
            })

        } catch (error: any) {

            return next(new ErrorHandler(error.message, 400))
        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

const acitvateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token, activation_code, special_code } = req.body as IActivationRequest;

        const newUser: { user: IUser; activationCode: string } =
            jwt.verify(activation_token, process.env.ACTIVATION_SECRET as string) as { user: IUser; activationCode: string }

        if (newUser.activationCode !== activation_code)
            return next(new ErrorHandler('کد فعال سازی اشتباه است', 400))
 
        const { name, email, password } = newUser.user;

        const existUser = await userModel.findOne({ email })

        if (existUser)
            return next(new ErrorHandler('این ایمیل قبلا ثبت نام کرده است', 400))


        if (special_code && special_code == process.env.SPECIAL_CODE_ADMIN) {
            const user = await userModel.create({ name, email, password, role: 'admin' })
        } else {
            const user = await userModel.create({ name, email, password, role: 'user' })
        }

        res.status(201).json({ success: true })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
})

const forgetPassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        const { email } = req.body;

        // بررسی وجود ایمیل
        if (!email) {
            return next(new ErrorHandler('ایمیل الزامی است', 400));
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            return next(new ErrorHandler('کاربری با این ایمیل وجود ندارد', 404));
        }


        const newPassword = crypto.randomBytes(4).toString('hex').slice(0, 8);

        user.password = newPassword;
        await user.save();


        try {
            await sendMail({
                email: user.email,
                subject: 'بازیابی رمز عبور',
                template: 'forget-email.ejs',
                data: {
                    email: user.email,
                    password: newPassword,
                },
            });

            res.status(200).json({
                success: true,
                message: 'رمز عبور جدید به ایمیل شما ارسال شد',
            });
        } catch (error: any) {
            return next(new ErrorHandler('ارسال ایمیل با خطا مواجه شد', 500));
        }
    } catch (error: any) {

        return next(new ErrorHandler(error.message, 400))
    }
});


// login user
const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { email, password } = req.body as ILoginRequest;


        if (!email || !password)
            return next(new ErrorHandler('لطفا ایمیل و رمز عبور خود را وارد کنید', 400))

        const user = await userModel.findOne({ email }).select('+password name email avatar.imageUrl phone');


        if (!user)
            return next(new ErrorHandler('ایمیل یا رمز عبور اشتباه است', 400))

        if (!user.password)
            return next(new ErrorHandler('شما با استفاده از ورود با جیمیل حساب خود را ساخته اید برای همین رمزعبوری ندارید. لطفا از همان روش وارد سایت شده و برای حساب خود رمز بگذارید.', 400))

        const isPasswordMatch = await user.comparePassword(password)

        if (!isPasswordMatch)
            return next(new ErrorHandler('ایمیل یا رمز عبور اشتباه است', 400))

        user.password = '1';

        sendToken(user, 200, res, req);


    } catch (error: any) {
        // console.log(error)
        return next(new ErrorHandler(error.message, 400))
    }
})

// logout user
const logoutUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

            const accessTokenOptions:any = {
                maxAge: 1,
                httpOnly: false, // اکسس توکن می‌تواند در فرانت خوانده شود
                sameSite: 'none', // برای پشتیبانی از ساب‌دامنه
                secure: true, // باید فعال باشد چون sameSite=none است
                path: '/',
                domain: '.vc-virtual-learn.com',
            };
        
            const refreshTokenOptions:any = {
                maxAge: 1, // day
                httpOnly: false, // 👈 باید فعال باشد تا از XSS محافظت شود
                sameSite: 'none', // برای ارسال بین ساب‌دامنه‌ها
                secure: true, // برای sameSite=none ضروری است
                path: '/',
                domain: '.vc-virtual-learn.com',
            };

        res.cookie("access_token", "", accessTokenOptions);
        res.cookie("refresh_token", "", refreshTokenOptions);

        const userId = req.user?._id || "";

        redis.del(userId as string)


        res.status(200).json({
            success: true,
            message: "با موفقیت خارج شدید"
        })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// update access token
const updateAccessToken = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token as string;


        if (!refresh_token)
            return next(new ErrorHandler('رفرش توکن نا معتبر است', 400))

        const decode = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload
        const session = await redis.get(decode.id as string)

        if (!session)
            return next(new ErrorHandler('لطفا وارد حساب خود شوید', 400))


        const user = JSON.parse(session);

        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, { expiresIn: '5m' });
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, { expiresIn: '7d' });

        req.user = user;
        await createToken(res, req, accessToken, refreshToken, user);

        res.status(200).json({
            success: true,
            accessToken
        })

        next()


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
})

// get user info
const getUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id as string;

        // دریافت کاربر با اطلاعات کامل از دیتابیس
        const user: any = await userModel.findById(userId).select('+password').populate("courses.courseId", "price").lean();
        if (!user) return next(new ErrorHandler('کاربر یافت نشد', 404));

        // تاریخ عضویت
        const registrationDate = user.createdAt;

        // // محاسبه دوره‌های پولی و رایگان
        // const paidCourses = user.courses.filter((course: any) => course.price && course.price > 0).length;
        // const freeCourses = user.courses.filter((course: any) => course.price === 0).length;

        // // آمار اضافی - تعداد دوره‌های علاقه‌مندی
        // const totalFavoriteCourses = user.favoritCourses ? user.favoritCourses.length : 0;


        const newUser = {
            name: user.name,
            email: user.email,
            imageUrl: user?.avatar?.imageUrl,
            registrationDate,
            phone: user?.phone,
            password: ''
        }
        if (user?.password) newUser.password = '1';

        res.status(200).json({
            success: true,
            user: newUser
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});


// social auth
const socialAuth = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { token } = req.body as { token: string }; // تغییر نام متغیر برای جلوگیری از تداخل
        if (!token) {
            return next(new ErrorHandler("Token is required", 400));
        }

        // دیکد کردن توکن
        const decodedUser = jwt.decode(token) as JwtPayload;


        if (!decodedUser || !decodedUser.email) {
            return next(new ErrorHandler("Invalid token payload", 400));
        }


        // بررسی کاربر در دیتابیس
        const user = await userModel.findOne({ email: decodedUser.email });


        if (!user) {

            // اگر کاربر وجود نداشت، کاربر جدید ایجاد کنید
            const newUser = await userModel.create({
                email: decodedUser.email,
                name: decodedUser.name || "Unknown",
                avatar: {
                    imageUrl: decodedUser.picture || null,
                },
            });
            sendToken(newUser, 200, res, req);
        } else {

            // اگر کاربر وجود داشت، توکن ارسال کنید
            sendToken(user, 200, res, req);
        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message || "Something went wrong", 500));
    }
});

// update user info
const updateUserInfo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, phone } = req.body as IUpdateUserInfo;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        // if (email && user) {
        //     const isEmailExist = await userModel.findOne({ email });
        //     if (isEmailExist)
        //         return next(new ErrorHandler('این ایمیل قبلا ثبت نام کرده است', 400))

        //     user.email = email;
        // }

        if (name && user)
            user.name = name;
        if (phone && user)
            user.phone = phone;

        await user?.save();
        await redis.set(userId as string, JSON.stringify(user));

        res.status(201).json({
            success: true,
            user
        })

    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// update user password
interface IUpdatePassword {
    oldPassword: string;
    newPassword: string;
}

const updatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { oldPassword, newPassword } = req.body as IUpdatePassword;

        if (!oldPassword || !newPassword)
            return next(new ErrorHandler('لطفا پسور قدیمی و جدید را وارد کنید', 400))

        const userId = req.user?._id;
        const user = await userModel.findById(userId).select('+password');

        if (user?.password === undefined)
            return next(new ErrorHandler('کاربر نامعتبر', 400))


        const isPasswordMatch = await user?.comparePassword(oldPassword);

        if (!isPasswordMatch)
            return next(new ErrorHandler('رمز عبور اشتباه است', 400))

        user.password = newPassword;

        await user?.save();
        await redis.set(userId as string, JSON.stringify(user));

        // Convert user to an object and delete the password field
        // const userWithoutPassword = user.toObject() as any;
        // delete userWithoutPassword.password;

        res.status(201).json({
            success: true,
            message: 'رمز عبور با موفقیت تغییر کرد',

        })
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

const setPassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { password } = req.body;

        if (!password)
            return next(new ErrorHandler('لطفا پسور را وارد کنید', 400))

        const userId = req.user?._id;
        const user = await userModel.findById(userId)

        if (user)
            user.password = password;

        await user?.save();
        await redis.set(userId as string, JSON.stringify(user));

        res.status(201).json({
            success: true,
            message: 'رمز عبور با موفقیت تنظیم شد.',
        })
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body;

        const userId = req.user?._id;
        const user: any = await userModel.findById(userId).select('-password');

        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });

        const imageName = `${randomLetterGenerator()}-${user?.name}.png`;
        const buffer = Buffer.from(avatar.split(',')[1], 'base64');

        const uploadParams: any = {
            Body: buffer,
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `user/${imageName}`,
            ACL: 'public-read'
        };

        // اگر تصویر قبلی وجود دارد، ابتدا آن را حذف کن
        if (user?.avatar?.imageName) {
            const deleteParams = {
                Bucket: process.env.LIARA_BUCKET_NAME,
                Key: `user/${user.avatar.imageName}`
            };

            try {
                await client.send(new DeleteObjectCommand(deleteParams));
            } catch (error: any) {
                return next(new ErrorHandler(`Error deleting previous image: ${error.message}`, 400));
            }
        }

        try {
            // آپلود تصویر جدید
            await client.send(new PutObjectCommand(uploadParams));
        } catch (error: any) {
            return next(new ErrorHandler(`Error uploading new image: ${error.message}`, 400));
        }

        // به‌روزرسانی اطلاعات تصویر در دیتابیس
        user.avatar = {
            imageName: imageName,
            imageUrl: `https://buckettest.storage.c2.liara.space/user/${imageName}`,
        };


        await user.save();
        await redis.set(userId as string, JSON.stringify(user));

        // فقط فیلدهای مورد نظر را ارسال کن
        const userResponse = {
            name: user.name,
            email: user.email,
            imageUrl: user.avatar.imageUrl,
            registrationDate: user.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'تصویر پروفایل با موفقیت تغییر کرد',
            user: userResponse
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// const getUserInvoices = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
//     try {
//         const userId = req.user?._id as string;

//         // بررسی اگر userId موجود نیست
//         if (!userId) return next(new ErrorHandler('کاربر یافت نشد', 404));

//         // دریافت فاکتورها از دیتابیس و مرتب کردن بر اساس تاریخ (جدیدترین اول)
//         const invoices = await InvoiceModel.find({ userId })
//             .sort({ createdAt: -1 }) // مرتب‌سازی بر اساس جدیدترین
//             .select('courseName originalPrice discountAmount finalPrice createdAt') // فقط فیلدهای مورد نیاز
//             .lean();

//         if (!invoices || invoices.length === 0) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'هیچ فاکتوری برای این کاربر یافت نشد'
//             });
//         }

//         res.status(200).json({
//             success: true,
//             invoices
//         });

//     } catch (error: any) {
//         return next(new ErrorHandler(error.message, 400));
//     }
// });


const createInvoice = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { courseId, userId } = req.body;

        // بررسی ورودی‌ها
        if (!courseId || !userId) {
            return next(new ErrorHandler('آیدی کاربر و دوره الزامی است', 400));
        }

        // پیدا کردن کاربر
        const user = await userModel.findById(userId);
        if (!user) {
            return next(new ErrorHandler('کاربر یافت نشد', 404));
        }

        // پیدا کردن دوره
        const course = await CourseModel.findById(courseId);
        if (!course) {
            return next(new ErrorHandler('دوره یافت نشد', 404));
        }

        // محاسبه مبلغ تخفیف و قیمت نهایی
        const discountAmount = course.discount?.percent
            ? (course.price * course.discount.percent) / 100
            : 0;
        const finalPrice = course.price - discountAmount;

        // ساخت فاکتور
        const invoice = await InvoiceModel.create({
            userId: user._id,
            courseId: course._id,
            courseName: course.name,
            originalPrice: course.price,
            discountAmount,
            finalPrice,
            paymentMethod: "online", // به صورت پیش‌فرض
            paymentStatus: "pending", // به صورت پیش‌فرض
        });

        res.status(201).json({
            success: true,
            message: "فاکتور با موفقیت ثبت شد",
            invoice,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


const getUserPaidCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id as string;

        // پیدا کردن کاربر و دریافت لیست آیدی دوره‌ها
        const user = await userModel.findById(userId).select('courses').lean();
        if (!user || !user.courses || user.courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'هیچ دوره‌ای برای این کاربر یافت نشد'
            });
        }



        // استخراج آیدی دوره‌ها از فیلد courses
        const courseIds = user.courses

        // واکشی اطلاعات دوره‌های پولی
        const paidCourses = await CourseModel.find({ _id: { $in: courseIds }, price: { $gt: 0 } })
            .select('name thumbnail.imageUrl updatedAt urlName')
            .sort({ createdAt: -1 })
            .lean();
        // console.log(paidCourses)

        if (paidCourses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'هیچ دوره پولی برای این کاربر یافت نشد'
            });
        }

        res.status(200).json({
            success: true,
            courses: paidCourses
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


const getUserFreeCourses = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?._id as string;

        // پیدا کردن کاربر و دریافت لیست آیدی دوره‌ها
        const user = await userModel.findById(userId).select('courses').lean();
        if (!user || !user.courses || user.courses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'هیچ دوره‌ای برای این کاربر یافت نشد'
            });
        }

        // استخراج آیدی دوره‌ها از فیلد courses
        const courseIds = user.courses;

        // واکشی اطلاعات دوره‌های رایگان
        const freeCourses = await CourseModel.find({ _id: { $in: courseIds }, price: 0 })
            .select('name thumbnail.imageUrl updatedAt urlName') // فیلدهای مورد نظر
            .sort({ createdAt: -1 }) // مرتب‌سازی بر اساس جدیدترین
            .lean();

        if (freeCourses.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'هیچ دوره رایگانی برای این کاربر یافت نشد'
            });
        }

        res.status(200).json({
            success: true,
            courses: freeCourses
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});



const createActivationToken = (user: IRegistrationUserBody): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({ user, activationCode }, process.env.ACTIVATION_SECRET as Secret, { expiresIn: '5m' });

    return { token, activationCode }
}

export {
    setPassword,
    registrationUser,
    forgetPassword,
    acitvateUser,
    loginUser,
    logoutUser,
    updateAccessToken,
    getUserInfo,
    socialAuth,
    updateUserInfo,
    updatePassword,
    updateProfilePicture,
    createActivationToken,
    // getUserInvoices,
    createInvoice,
    getUserPaidCourses,
    getUserFreeCourses
}