import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import userModel, { IUser } from "../models/user.model";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import sendMail from "../utils/sendMail";
import { createToken, ITokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.service";

require('dotenv').config();

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
    email?: string
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

        const user = await userModel.findOne({ email }).select('name email +password avatar.imageUrl');
        // const user = await userModel.findOne({ email }).select('name password');

        if (!user)
            return next(new ErrorHandler('ایمیل یا رمز عبور اشتباه است', 400))

        const isPasswordMatch = await user.comparePassword(password)

        if (!isPasswordMatch)
            return next(new ErrorHandler('ایمیل یا رمز عبور اشتباه است', 400))

        user.password = '';

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

        // دریافت کاربر با اطلاعات کامل از دیتابیس
        const user: any = await userModel.findById(userId).populate("courses.courseId", "price").lean();
        if (!user) return next(new ErrorHandler('کاربر یافت نشد', 404));

        // تاریخ عضویت
        const registrationDate = user.createdAt;

        // // محاسبه دوره‌های پولی و رایگان
        // const paidCourses = user.courses.filter((course: any) => course.price && course.price > 0).length;
        // const freeCourses = user.courses.filter((course: any) => course.price === 0).length;

        // // آمار اضافی - تعداد دوره‌های علاقه‌مندی
        // const totalFavoriteCourses = user.favoritCourses ? user.favoritCourses.length : 0;

        res.status(200).json({
            success: true,
            user: {
                name: user.name,
                email: user.email,
                registrationDate,
            }
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
        const { name } = req.body as IUpdateUserInfo;
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
        const userWithoutPassword = user.toObject() as any;
        delete userWithoutPassword.password;

        res.status(201).json({
            success: true,
            message: 'رمز عبور با موفقیت تغییر کرد',
            userWithoutPassword
        })
    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400))
    }
})

interface IUpdateProfilePicture {
    avatar: string
}

// update profile picture
const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body;

        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        //cloudinary
        // if (avatar && user) {

        //     if (user?.avatar?.public_id) {
        //         await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
        //         const myCloud = await cloudinary.v2.uploader.upload(avatar, { folder: 'avatar', width: 150 });
        //         user.avatar = { public_id: myCloud.public_id, url: myCloud.secure_url }
        //     }
        //     else {
        //         const myCloud = await cloudinary.v2.uploader.upload(avatar, { folder: 'avatar', width: 150 });
        //         user.avatar = { public_id: myCloud.public_id, url: myCloud.secure_url }
        //     }
        // }

        await user?.save();
        await redis.set(userId as string, JSON.stringify(user));

        // Convert user to an object and delete the password field
        const userWithoutPassword = user?.toObject() as any;
        delete userWithoutPassword.password;

        res.status(201).json({ success: true, message: 'تصویر پروفایل با موفقیت تغییر کرد', user })


    }
    catch (error: any) {
        return next(new ErrorHandler(error.message, 400))

    }
})

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