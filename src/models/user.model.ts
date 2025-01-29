import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken";
import dotenv from 'dotenv';

dotenv.config();

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    phone?: string;
    avatar: { imageName: string; imageUrl: string };
    courses: mongoose.Schema.Types.ObjectId[];
    favoritCourses: mongoose.Schema.Types.ObjectId[];
    likedCourses: mongoose.Schema.Types.ObjectId[];
    favoritTeachers: mongoose.Schema.Types.ObjectId[];
    favoritAcademies: mongoose.Schema.Types.ObjectId[];
    role: string;
    isVerified: boolean;
    coursesRating: Array<{ courseId: mongoose.Schema.Types.ObjectId, rating: number }>;
    lastLogin: Date;
    comparePassword: (password: string) => Promise<boolean>;
    SignAccessToken: () => string;
    SignRefreshToken: () => string;
}


const userSchema: Schema<IUser> = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'لطفا نام خود را وارد کنید'],
        index: true, // ایندکس برای جستجوهای سریع‌تر
    },

    email: {
        type: String,
        required: [true, 'لطفا ایمیل خود را وارد کنید'],
        validate: {
            validator: function (value: string) {
                return emailRegexPattern.test(value);
            },
            message: 'لطفا ایمیل را درست وارد کنید',
        },
        unique: true,
        lowercase: true, // تبدیل به حروف کوچک
        index: true, // ایندکس برای جستجوهای سریع‌تر
    },

    password: {
        type: String,
        // required: [true, 'لطفا پسورد را وارد کنید'],
        select: false,
    },

    phone: {
        type: String,
        default: ''
    },

    avatar: {
        imageName: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
    },

    role: {
        type: String,
        enum: ['user', 'admin'], // مقادیر مجاز
        default: 'user',
    },

    isVerified: {
        type: Boolean,
        default: false,
    },

    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: [], index: true }],
    favoritCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: [], index: true }],
    likedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course', default: [], index: true }],
    favoritTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: [], index: true }],
    favoritAcademies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Academy', default: [], index: true }],

    coursesRating: {
        type: [
            {
                courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
                rating: {
                    type: Number,
                    default: 0,
                    min: 0,
                    max: 5,
                },
            },
        ],
        default: [],
    },

    lastLogin: {
        type: Date,
        default: null,
    }
}, { timestamps: true })


// Hash password before saving
userSchema.pre<IUser>('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
})


// sign access token
userSchema.methods.SignAccessToken = function () {
    return jwt.sign({ id: this._id }, process.env.ACCESS_TOKEN || '', { expiresIn: '5m' })
}

// sign refresh token
userSchema.methods.SignRefreshToken = function () {
    return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN || '', { expiresIn: '7d' })
}


// compare password
userSchema.methods.comparePassword = async function name(enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password)
}


const userModel: Model<IUser> = mongoose.model('User', userSchema);

export default userModel;