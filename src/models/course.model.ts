import mongoose, { Document, Model, Schema } from "mongoose";
import { Date } from "mongoose";


interface ILink extends Document {
    title: string;
    url: string;
}

interface ICourseData extends Document {
    title: string;//
    description: string;//
    videoSection: string;//
    videoLength: number;//
    links?: ILink[];//
    isFree: boolean;//
    useForDemo: boolean;//
    videoName: string;
}

interface ICourse extends Document {
    name: string;//
    description: string;//
    longDescription: string;
    academyId: mongoose.Schema.Types.ObjectId; // ارتباط با آکادمی    //@
    teacherId: mongoose.Schema.Types.ObjectId; // ارتباط با مدرس      //@
    categoryIds: mongoose.Schema.Types.ObjectId[]; // ارتباط با دسته‌بندی‌ها  //@
    discount: { percent: number, expireTime: Date, usageCount: number };    //@
    price: number; //@
    estimatedPrice?: number;//@
    thumbnail: { imageName: string; imageUrl: string };//@
    tags: string;//@
    level: string;//@
    benefits: { title: string }[];
    prerequisites: { title: string }[];
    courseData: ICourseData[];
    ratings?: number; //*
    purchased?: number; //*
    links?: ILink[];
    status: number; // 0 => ongoing , 1 => finished, 2 => stopped   //@
    releaseDate: Date;//@
    folderName: string;
    isInVirtualPlus: boolean,
    showCourse: boolean,
    totalVideos: number
}

const linkSchema = new Schema<ILink>({
    title: String,
    url: String
})

const courseDataSchema = new Schema<ICourseData>({
    title: String,
    videoSection: String,
    description: String,
    videoLength: String,
    useForDemo: {
        type: Boolean,
        default: false
    },
    isFree: {
        type: Boolean,
        default: false
    },
    links: [linkSchema],
    videoName: String,
})

const courseSchema = new Schema<ICourse>({
    name: {
        type: String,
        required: true
    },

    description: {
        type: String,
        required: true,
    },

    longDescription: {
        type: String,
        required: true,
    },

    price: {
        type: Number,
        required: true
    },

    estimatedPrice: {
        type: Number,
    },

    thumbnail: {
        imageName: String,
        imageUrl: String
    },

    tags: {
        type: String,
        required: true,
    },

    level: {
        type: String,
        required: true,
    },



    benefits: [{ title: String }],

    prerequisites: [{ title: String }],

    courseData: [courseDataSchema],

    ratings: {
        type: Number,
        default: 0
    },

    purchased: {
        type: Number,
        default: 0
    },

    status: {
        type: Number,
        default: 0
    },

    academyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Academy' }, // ارتباط با آکادمی
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }, // ارتباط با مدرس
    discount:
    {
        percent: Number,
        usageCount: {
            type: Number,
            default: 0,
        },
        expireTime: Date
    }
    ,
    links: [linkSchema],
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }], // ارتباط با دسته‌بندی‌ها
    releaseDate: Date,
    folderName: String,

    isInVirtualPlus: {
        type: Boolean,
        default: false
    },

    showCourse: {
        type: Boolean,
        default: false
    },

    totalVideos: Number
}, { timestamps: true });


const CourseModel: Model<ICourse> = mongoose.model('Course', courseSchema);

export default CourseModel;