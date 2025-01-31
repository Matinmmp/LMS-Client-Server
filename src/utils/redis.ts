import { Redis } from "ioredis";
import dotenv from 'dotenv';

dotenv.config();



const redisClient = () => {
    if (process.env.REDIS_URL) {
        console.log('Redis Connected');
        return {
            host: 'redis',
            port: 6379,
            password: '0herMYKK9dlpM9zFf8BgTZO4',
            connectTimeout: 10000, // تنظیم تایم‌اوت اتصال به 10 ثانیه
        };
    }
    throw new Error('Redis ConnectionFailed')
}


export const redis = new Redis(redisClient())