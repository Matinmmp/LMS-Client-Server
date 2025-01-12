import { AdminJSOptions } from "adminjs";
import AcademyModel from "../models/academy.model";
import CategoryModel from "../models/category.model";
import CourseModel from "../models/course.model";
import CourseSectionModel from "../models/courseSection.model";
import InvoiceModel from "../models/Invoice.model";
import LessonModel from "../models/sectionLesson.model";
import TeacherModel from "../models/teacher.model";
import userModel from "../models/user.model";
import BlogModel from "../models/blog.model";

const AdminOptions: AdminJSOptions = {
    resources: [
        //course
        {
            resource: CourseModel,
            options: {
                navigation: {
                    name: 'Courses',
                    icon: 'Book',
                },
                properties: {
                    academyId: {
                        type: 'reference', // تعریف نوع reference
                        reference: 'Academy', // ارجاع به مدل Academy
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    teacherId: {
                        type: 'reference',
                        reference: 'Teacher', // ارجاع به مدل Teacher
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    categoryIds: {
                        type: 'reference',
                        reference: 'Category', // ارجاع به مدل Category
                        isArray: true, // چون categoryIds آرایه است
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    relatedCourses: {
                        type: 'reference',
                        reference: 'Course', // ارجاع به مدل Course (خود مدل)
                        isArray: true, // چون relatedCourses آرایه است
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    relatedBlogs: {
                        type: 'reference',
                        reference: 'Blog', // ارجاع به مدل Blog
                        isArray: true, // آرایه است
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    tags: {

                        isArray: true, // چون relatedCourses آرایه است
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    description: {
                        type: 'textarea', // نمایش توضیحات به صورت textarea
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    thumbnail: {
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    faName: {
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    estimatedPrice: {
                        isVisible: { list: false, filter: true, show: true, edit: true },

                    },
                    longDescription: {
                        type: 'textarea',
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    'thumbnail.imageName': {
                        isVisible: { list: false, filter: false, show: true, edit: true }, // پنهان‌سازی کامل
                    },
                    'thumbnail.imageUrl': {
                        isVisible: { list: false, filter: false, show: true, edit: true }, // نمایش فقط در جزئیات و ویرایش
                    },
                    courseFiles: {
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    benefits:{
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    prerequisites:{
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    ratings:{
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    status:{
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    level:{
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    seoMeta: {
                        type: 'subdocument',
                        properties: {
                            title: { type: 'string', isVisible: { list: false, show: true, edit: true } },
                            description: { type: 'string', isVisible: { list: false, show: true, edit: true } },
                            keywords: { type: 'array', isVisible: { list: false, show: true, edit: true } },
                        },
                        isVisible: { list: false, show: true, edit: true },
                    },
                },
            },
        },

        //blog
        {
            resource: BlogModel,
            options: {
                navigation: {
                    name: 'Blogs',
                    icon: 'EditNote', // آیکون مرتبط برای بخش بلاگ
                },
                properties: {
                    title: {
                        isVisible: { list: true, filter: true, show: true, edit: true },
                    },
                    slug: {
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    description: {
                        type: 'textarea',
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    longDescription: {
                        type: 'textarea',
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    'thumbnail.imageName': {
                        isVisible: { list: false, filter: false, show: true, edit: true }, // پنهان‌سازی کامل
                    },
                    'thumbnail.imageUrl': {
                        isVisible: { list: false, filter: false, show: true, edit: true }, // نمایش فقط در جزئیات و ویرایش
                    },
                    
                    categories: {
                        type: 'reference',
                        reference: 'Category', // ارجاع به مدل Category
                        isArray: true, // آرایه است
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    tags: {
                        isArray: true, // آرایه است
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    status: {
                        availableValues: [
                            { value: 'draft', label: 'Draft' },
                            { value: 'published', label: 'Published' },
                            { value: 'archived', label: 'Archived' },
                        ], // گزینه‌های وضعیت بلاگ
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    seoMeta: {
                        type: 'subdocument',
                        properties: {
                            title: { type: 'string', isVisible: { list: false, show: true, edit: true } },
                            description: { type: 'string', isVisible: { list: false, show: true, edit: true } },
                            keywords: { type: 'array', isVisible: { list: false, show: true, edit: true } },
                        },
                        isVisible: { list: false, show: true, edit: true },
                    },
                    
                    views: {
                        isVisible: { list: false, filter: true, show: true, edit: false },
                    },
                    likes: {
                        isVisible: { list: false, filter: true, show: true, edit: false },
                    },
                    isFeatured: {
                        type: 'boolean',
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    relatedBlogs: {
                        type: 'reference',
                        reference: 'Blog', // ارجاع به مدل Blog
                        isArray: true, // آرایه است
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    relatedCourse: {
                        type: 'reference',
                        reference: 'Course', // ارجاع به مدل Course
                        isArray: true, // آرایه است
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    publishDate: {
                        type: 'datetime',
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    lastUpdated: {
                        type: 'datetime',
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    readingTime: {
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                    // createdAt: {
                    //     isVisible: { list: false, filter: true, show: true, edit: true },
                    // },
                    updatedAt: {
                        isVisible: { list: false, filter: true, show: true, edit: true },
                    },
                },
            },
        },

        //academies
        {
            resource: AcademyModel,
            options: {
                navigation: {
                    name: 'Academies',
                    icon: 'University', // آیکون دلخواه
                },
                listProperties: ['engName', 'faName', 'rates'], // فیلدهای قابل نمایش در جدول
                properties: {
                    courses: {
                        type: 'reference',
                        reference: 'Course', // ارتباط به مدل دوره‌ها
                        isVisible: { list: true, filter: true, show: true, edit: true },
                    },
                    teachers: {
                        type: 'reference',
                        reference: 'Teacher', // ارتباط به مدل مدرسین
                        isVisible: { list: true, filter: true, show: true, edit: true },
                    },
                    longDescription: {
                        isVisible: { list: false, filter: false, show: true, edit: true }, // حذف از جدول
                    },
                },
            },
        },

        //teachers
        {
            resource: TeacherModel,
            options: {
                navigation: {
                    name: 'Teachers',
                    icon: 'User', // آیکون دلخواه
                },
                listProperties: ['engName', 'faName', 'rates', 'students'], // فیلدهای نمایش داده شده در جدول
                properties: {
                    courses: {
                        type: 'reference',
                        reference: 'Course', // ارتباط به مدل دوره‌ها
                        isVisible: { list: true, filter: true, show: true, edit: true },
                    },
                    academies: {
                        type: 'reference',
                        reference: 'Academy', // ارتباط به مدل آکادمی‌ها
                        isVisible: { list: true, filter: true, show: true, edit: true },
                    },
                    longDescription: {
                        isVisible: { list: false, filter: false, show: true, edit: true }, // حذف از لیست جدول
                    },

                },
            },
        },

        //categories
        {
            resource: CategoryModel,
            options: {
                navigation: {
                    name: 'Categories',
                    icon: 'Book',
                },
                properties: {
                    parentCategoryId: {
                        type: 'reference', // تنظیم نوع به reference
                        reference: 'Category', // ارجاع به همان Resource
                        isVisible: { list: true, filter: true, show: true, edit: true },
                    },
                    name: {
                        isTitle: true, // تعیین نام به‌عنوان نمایش‌دهنده اصلی
                    },
                },
            },
        },
        //invoices
        {
            resource: InvoiceModel,
            options: {
                navigation: {
                    name: 'Invoices',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
        //sctions
        {
            resource: CourseSectionModel,
            options: {
                navigation: {
                    name: 'Sections',
                    icon: 'Book',
                },
                listProperties: ['sectionName', 'courseId', 'totalLessons'], // نمایش فقط فیلدهای مهم
                properties: {
                    courseId: {
                        type: 'reference',
                        reference: 'Course',
                        isVisible: { list: true, filter: true, show: true, edit: true },
                        populate: { path: 'courseId', select: 'name' }, // نمایش نام دوره
                    },
                    sectionName: {
                        isTitle: true, // تعیین عنوان پیش‌فرض برای Section
                    },
                },
            },
        },


        //lessons
        {
            resource: LessonModel,
            options: {
                navigation: {
                    name: 'Lessons',
                    icon: 'Play',
                },
                listProperties: ['lessonTitle', 'courseId', 'courseSectionId', 'lessonType', 'order'], // فیلدهای نمایش در جدول
                properties: {
                    courseId: {
                        type: 'reference',
                        reference: 'Course',
                        isVisible: { list: true, filter: true, show: true, edit: true },
                        populate: { path: 'courseId', select: 'name' }, // نمایش نام دوره به جای ObjectId
                    },
                    courseSectionId: {
                        type: 'reference',
                        reference: 'CourseSection',
                        isVisible: { list: true, filter: true, show: true, edit: true },
                        populate: { path: 'courseSectionId', select: 'sectionName' }, // نمایش نام سکشن به جای ObjectId
                    },
                    lessonFile: {
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    attachedFile: {
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    links: {
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    additionalInfo: {
                        isVisible: { list: false, filter: false, show: true, edit: true },
                    },
                    isFree: {
                        type: 'boolean',
                    },
                    lessonType: {
                        availableValues: [
                            { value: 'video', label: 'Video' },
                            { value: 'quiz', label: 'Quiz' },
                            { value: 'text', label: 'Text' },
                            { value: 'file', label: 'File' },
                        ],
                    },
                },
            },
        },

        //users
        {
            resource: userModel,
            options: {
                navigation: {
                    name: 'users',
                    icon: 'Book', // آیکون در سایدبار (از لیست آیکون‌های AdminJS)
                },
                properties: {
                    description: { type: 'textarea' }, // تنظیم نمایش فیلد
                },
            },
        },
    ],

    rootPath: '/admin',
};


export default AdminOptions