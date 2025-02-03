import { Request, Response } from "express";
import { IUser } from "../models/user.model";
import { redis } from "./redis";
import dotenv from 'dotenv';

dotenv.config();


export interface ITokenOptions {
    expires: Date;
    maxAge: number;
    httpOnly: boolean;
    sameSite: 'lax' | 'strict' | 'none' | undefined;
    secure: boolean;
    path: string;
    domain: string;
}


// used in login controller
export const sendToken = (user: IUser, statusCode: number, res: Response, req: Request) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();


    // upload session to redis
    redis.set(user._id as string, JSON.stringify(user) as any)

    createToken(res, req, accessToken, refreshToken, undefined);


    res.status(statusCode).json({
        success: true,
        user,
        accessToken,
        refreshToken
    })
}


// create and set access token and refresh token cookie
export const createToken = async (res: Response, req: Request, accessToken: string, refreshToken: string, user: any | undefined) => {

    // parse environment variables to integrates with fallback values
    const accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '300', 10);
    const refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '3', 10);

    // options for cookie
    const accessTokenOptions: ITokenOptions = {
        expires: new Date(Date.now() + accessTokenExpire * 60 * 1000),
        maxAge: accessTokenExpire * 60 * 1000,
        httpOnly: false, // اکسس توکن می‌تواند در فرانت خوانده شود
        sameSite: 'none', // برای پشتیبانی از ساب‌دامنه
        secure: true, // باید فعال باشد چون sameSite=none است
        path: '/',
        domain: '.vc-virtual-learn.com',
    };

    const refreshTokenOptions: ITokenOptions = {
        expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000), //  minute
        maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000, // day
        httpOnly: false, // 👈 باید فعال باشد تا از XSS محافظت شود
        sameSite: 'none', // برای ارسال بین ساب‌دامنه‌ها
        secure: true, // برای sameSite=none ضروری است
        path: '/',
        domain: '.vc-virtual-learn.com',
    };

    // console.log(req.headers.origin)

    // res.set('Access-Control-Allow-Origin', req.headers.origin);  
    // res.set('Access-Control-Allow-Credentials', 'true');
    // res.set('Access-Control-Expose-Headers', 'date, etag, access-control-allow-origin, access-control-allow-credentials');


    // only set secure to true in production
    // if (process.env.NODE_ENV === 'production')
    //     accessTokenOptions.secure = true;


    res.cookie('access_token', accessToken, accessTokenOptions);
    res.cookie('refresh_token', refreshToken, refreshTokenOptions);




    if (user)
        await redis.set(user._id, JSON.stringify(user), "EX", 604800)
}


