import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from 'bcryptjs'
import jwt from "jsonwebtoken";
require('dotenv').config();

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    phone?: string;
    avatar: { imageName: string; imageUrl: string },
    courses: mongoose.Schema.Types.ObjectId[];
    favoritCourses: mongoose.Schema.Types.ObjectId[];
    likedCourses: mongoose.Schema.Types.ObjectId[];
    favoritTeachers: mongoose.Schema.Types.ObjectId[];
    favoritAcademies: mongoose.Schema.Types.ObjectId[];
    role: string;
    isVerified: boolean;
    coursesRating: Array<{ courseId: string, rate: number }>
    comparePassword: (password: string) => Promise<boolean>;
    SignAccessToken: () => string;
    SignRefreshToken: () => string;
}


const userSchema: Schema<IUser> = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'لطفا نام خود را وارد کنید']
    },

    email: {
        type: String,
        required: [true, 'لطفا ایمیل خود را وارد کنید'],
        validate: {
            validator: function (value: string) {
                return emailRegexPattern.test(value)
            },
            message: 'لطفا ایمیل را درست وارد کنید'
        },
        unique: true
    },

    password: {
        type: String,
        // required: [true, 'لطفا پسورد را وارد کنید'],
        minlength: [6, 'پسورد نباید کمتر از 6 کاراکتر باشد'],
        select: false,
    },

    phone: {
        type: String,
    },

    avatar: {
        imageName: String,
        imageUrl: String
    },

    role: {
        type: String,
        default: 'user'
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    favoritCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    likedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    favoritTeachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }],
    favoritAcademies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Academy' }],

    coursesRating: [{ courseId: String, rate: Number }
    ]
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