import { Redis } from "ioredis";
import dotenv from 'dotenv';

dotenv.config();



const redisClient = () => {
    if (process.env.REDIS_URL) {
        console.log('Redis Connected');
        return {
            host: 'localhost',
            port: 6379,
            connectTimeout: 10000, // تنظیم تایم‌اوت اتصال به 10 ثانیه
        };
    }
    throw new Error('Redis ConnectionFailed')
}


export const redis = new Redis(redisClient())