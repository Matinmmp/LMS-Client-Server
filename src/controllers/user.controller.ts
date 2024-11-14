import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import sendMail from "../utils/sendMail";
import { createToken, ITokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.service";
import randomLetterGenerator from "../utils/randomName";
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

require('dotenv').config();

const client = new S3Client({
    region: "default",
    endpoint: process.env.LIARA_ENDPOINT,
    credentials: {
        accessKeyId: process.env.LIARA_ACCESS_KEY,
        secretAccessKey: process.env.LIARA_SECRET_KEY
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
            const user = await userModel.create({ name, email, password })
        }

        res.status(201).json({ success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
})

// login user
const loginUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { email, password } = req.body as ILoginRequest;


        if (!email || !password)
            return next(new ErrorHandler('لطفا ایمیل و رمز عبور خود را وارد کنید', 400))

        const user = await userModel.findOne({ email }).select('name email +password avatar.imageUrl +phone');
        // const user = await userModel.findOne({ email }).select('name password');

        if (!user)
            return next(new ErrorHandler('ایمیل یا رمز عبور اشتباه است', 400))

        const isPasswordMatch = await user.comparePassword(password)

        if (!isPasswordMatch)
            return next(new ErrorHandler('ایمیل یا رمز عبور اشتباه است', 400))

        user.password = '1';

        sendToken(user, 200, res, req);


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// logout user
const logoutUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 });
        res.cookie("refresh_token", "", { maxAge: 1 });

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
        console.log(userId);
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
        console.log(user);
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
        const { email, name, avatar } = req.body as IRegistrationUserBody;
        const user = await userModel.findOne({ email });

        if (!user) {
            const newUser = await userModel.create({ email, name, avatar });
            sendToken(newUser, 200, res, req);
        }
        else
            sendToken(user, 200, res, req);


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

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
        console.log(req.body)
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

interface IUpdateProfilePicture {
    avatar: string
}

const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body;

        const userId = req.user?._id;
        const user: any = await userModel.findById(userId).select('-password');

        if (!user)
            return res.status(404).json({ success: false, message: "User not found" });

        const imageName = `${randomLetterGenerator()}-${user?.name}.png`;
        const buffer = Buffer.from(avatar.split(',')[1], 'base64');

        const uploadParams = {
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

        console.log(user.avatar);
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



// get all user -- noly admin
const getAllUsers = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await getAllUsersService();
        res.status(200).json({
            success: true,
            users
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

// update user role --- only for admin
const updateUserRole = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id, role } = req.body;
        const updatedUser = await updateUserRoleService(id, role);
        res.status(200).json({
            success: true,
            user: updatedUser,
            message: 'رول کاربر با موفقیت تغییر کرد',
        })
    } catch (error: any) {

    }
})

// Delete User --- only for admin
const deleteUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id;
        const user = await userModel.findById(id);

        if (!user)
            return next(new ErrorHandler('کاربر پیدا نشد', 404))

        await user.deleteOne({ id });

        await redis.del(id);

        res.status(200).json({
            success: true,
            message: 'کاربر با موفقیت حذف شد',
        })


    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})


const createActivationToken = (user: IRegistrationUserBody): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({ user, activationCode }, process.env.ACTIVATION_SECRET as Secret, { expiresIn: '5m' });

    return { token, activationCode }
}

export {
    setPassword,
    registrationUser,
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
    getAllUsers,
    updateUserRole,
    deleteUser
}