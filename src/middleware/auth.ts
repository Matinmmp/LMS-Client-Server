import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from 'jsonwebtoken'
import { redis } from "../utils/redis";
import userModel from "../models/user.model";
require('dotenv').config();

// authenticated user
export const isAuthenticated = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    const access_token = req.cookies.access_token;

    if (!access_token) {

        return next(new ErrorHandler('لطفا وارد حساب خود شوید', 401))
    }

    const decode = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as any;

    if (!decode)
        return next(new ErrorHandler("توکن معتبر نیست", 401))

    const user = await redis.get(decode.id)

    if (!user)
        return next(new ErrorHandler("لطفا وارد حساب خود شوید", 401))

    req.user = JSON.parse(user)

    next()

})

export const isAuthenticated2 = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    const access_token = req.cookies.access_token;
    let decode: any;
    let user: any;
 
    if (access_token)
        decode = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as any;

    if (decode)
        user = await userModel.findById(decode.id).lean()
        
    if (user)
        req.user = user

    next()

})

// validate user role
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!roles.includes(req.user?.role || '')) {
            return next(new ErrorHandler(`نقش : ${req.user?.role} اجازه ی دسترسی به این بخش را ندارد`, 403))
        }
        next();
    }
}