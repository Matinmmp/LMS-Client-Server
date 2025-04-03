import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import BlogModel from "../models/blog.model";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import BlogCategoryModel from "../models/blogCategory.model";
import Fuse from "fuse.js";
import { RateLimiterMemory } from 'rate-limiter-flexible';

require('dotenv').config();

const s3 = new S3Client({
    region: "default",
    endpoint: process.env.LIARA_ENDPOINT || "",
    credentials: {
        accessKeyId: process.env.LIARA_ACCESS_KEY || "",
        secretAccessKey: process.env.LIARA_SECRET_KEY || ""
    },
})


const createBlog = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body;
        const { title, slug, description, thumbnail } = body;

        if (!title || !slug || !description || !thumbnail) {
            return next(new ErrorHandler("تمام فیلدهای ضروری را پر کنید", 400));
        }

        // ذخیره تصویر در S3
        const imageName = `${Date.now()}-${slug}.png`;
        const buffer = Buffer.from(thumbnail.split(",")[1], "base64");

        const uploadParams: any = {
            Body: buffer,
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `Blogs/${imageName}`,
            ACL: "public-read",
        };

        await s3.send(new PutObjectCommand(uploadParams));

        // ذخیره در دیتابیس
        const blog = await BlogModel.create({
            ...body,
            thumbnail: {
                imageName,
                imageUrl: `https://images.vc-virtual-learn.com/Blogs/${imageName}`,
            },
        });

        res.status(201).json({
            success: true,
            message: "بلاگ با موفقیت ایجاد شد",
            blog,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const getAllBlogs = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const blogs = await BlogModel.find().select("title slug thumbnail description status publishDate views");
        res.status(200).json({ success: true, blogs });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const updateBlog = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const existingBlog = await BlogModel.findById(id);
        if (!existingBlog) return next(new ErrorHandler("بلاگ یافت نشد", 404));

        // بررسی تغییر عکس
        if (data.thumbnail && data.thumbnail !== existingBlog.thumbnail.imageUrl) {
            // حذف تصویر قبلی از S3
            const deleteParams = {
                Bucket: process.env.LIARA_BUCKET_NAME,
                Key: `Blogs/${existingBlog.thumbnail.imageName}`,
            };
            await s3.send(new DeleteObjectCommand(deleteParams));

            // آپلود تصویر جدید
            const imageName = `${Date.now()}-${data.slug}.png`;
            const buffer = Buffer.from(data.thumbnail.split(",")[1], "base64");

            const uploadParams: any = {
                Body: buffer,
                Bucket: process.env.LIARA_BUCKET_NAME,
                Key: `Blogs/${imageName}`,
                ACL: "public-read",
            };
            await s3.send(new PutObjectCommand(uploadParams));

            // جایگزین کردن اطلاعات عکس جدید
            data.thumbnail = {
                imageName,
                imageUrl: `https://images.vc-virtual-learn.com/Blogs/${imageName}`,
            };
        }

        data.lastUpdated = new Date();
        const updatedBlog = await BlogModel.findByIdAndUpdate(id, data, { new: true });

        res.status(200).json({
            success: true,
            message: "بلاگ با موفقیت ویرایش شد",
            blog: updatedBlog,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const deleteBlog = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const blog = await BlogModel.findById(id);
        if (!blog) return next(new ErrorHandler("بلاگ یافت نشد", 404));

        // حذف تصویر از S3
        const deleteParams = {
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `Blogs/${blog.thumbnail.imageName}`,
        };
        await s3.send(new DeleteObjectCommand(deleteParams));

        // حذف از دیتابیس
        await blog.deleteOne();

        res.status(200).json({
            success: true,
            message: "بلاگ با موفقیت حذف شد",
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//


const getBlogBySlug = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;

        const blog = await BlogModel.findOne({ slug });

        if (!blog) return next(new ErrorHandler("بلاگ مورد نظر یافت نشد", 404));

        res.status(200).json({ success: true, blog });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


const itemsPerPage = 12;
const searchBlogs = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { searchText, order, categories, page = "1" } = req.body;
        const pageNumber = parseInt(page, 10);
        const itemsPerPage = 10; // تعداد آیتم‌ها در هر صفحه

        // دریافت لیست دسته‌بندی‌ها
        const allCategories = await BlogCategoryModel.find({})
            .select("_id name slug")
            .lean();

        // دریافت تمام بلاگ‌ها
        let allBlogs = await BlogModel.find({})
            .select("title description thumbnail publishDate categories views likes slug comments")
            .lean();

        // فیلتر بر اساس دسته‌بندی
        if (categories && categories.length > 0) {
            const categoryIds = allCategories
                .filter((c: any) => categories.includes(c.name))
                .map((c: any) => String(c._id));

            allBlogs = allBlogs.filter((blog: any) =>
                blog.categories?.some((catId: any) => categoryIds.includes(catId.toString())) // 🚀 تبدیل به string
            );
        }

        // جستجوی فازی
        if (searchText) {
            const fuse = new Fuse(allBlogs, { keys: ["title", "description"], includeScore: true });
            const fuseResults = fuse.search(searchText);
            allBlogs = fuseResults.map((result: any) => result.item);
        }

        // مرتب‌سازی
        if (order === "2") allBlogs.sort((a: any, b: any) => a.createdAt - b.createdAt); // قدیمی‌ترین
        else if (order === "5") allBlogs.sort((a: any, b: any) => b.views - a.views); // محبوب‌ترین
        else if (order === "6") allBlogs.sort((a: any, b: any) => b.likes - a.likes); // پرلایک‌ترین
        else allBlogs.sort((a: any, b: any) => b.createdAt - a.createdAt); // جدیدترین (پیش‌فرض)

        // پیجینیشن
        const totalBlogs = allBlogs.length;
        const totalPages = Math.ceil(totalBlogs / itemsPerPage);
        const paginatedBlogs = allBlogs.slice((pageNumber - 1) * itemsPerPage, pageNumber * itemsPerPage);

        res.status(200).json({
            success: true,
            blogs: paginatedBlogs,
            currentPage: pageNumber,
            totalPage: totalPages,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});


const getBlogsByCategory = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { slug } = req.params;
        const pageNumber = parseInt(req.query.page as string, 10) || 1;

        // یافتن دسته‌بندی بر اساس `slug`
        const category = await BlogCategoryModel.findOne({ slug }).lean();
        if (!category) return next(new ErrorHandler("دسته‌بندی مورد نظر یافت نشد", 404));

        // دریافت بلاگ‌هایی که در این دسته‌بندی هستند
        const blogs = await BlogModel.find({ categories: category._id })
            .select("title description thumbnail publishDate views likes slug comments")
            .sort({ createdAt: -1 })
            .skip((pageNumber - 1) * itemsPerPage)
            .limit(itemsPerPage)
            .lean();

        const totalBlogs = await BlogModel.countDocuments({ categories: category._id });
        const totalPages = Math.ceil(totalBlogs / itemsPerPage);

        res.status(200).json({
            success: true,
            blogs,
            currentPage: pageNumber,
            totalPage: totalPages,
            name: category.name
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const homeSearch = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== "string") {
            return res.status(400).json({ success: false, message: "Query is required" });
        }

        // دریافت بلاگ‌ها
        const blogs = await BlogModel.find({}, 'title slug thumbnail description views likes')
            .lean();

        // استفاده از Fuse برای جستجوی فازی
        const fuse = new Fuse(blogs, { keys: ['title', 'description'], includeScore: true });
        const searchResults = fuse.search(query);

        // مرتب‌سازی نتایج بر اساس views و likes
        const sortedResults = searchResults.sort((a: any, b: any) => {
            const aItem = a.item;
            const bItem = b.item;
            return (bItem.views + bItem.likes) - (aItem.views + aItem.likes); // مرتب‌سازی براساس ویو و لایک
        });

        // جدا کردن نتایج نهایی
        const resultData = sortedResults.map(result => {
            const item: any = result.item;
            delete item._id; // حذف _id
            return item;
        });

        res.status(200).json({
            success: true,
            blogs: resultData
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const getBlogsInSlider = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const blogs = await BlogModel.find({ isInSlider: true })
            .select('title slug thumbnail')
            .lean();

        res.status(200).json({
            success: true,
            blogs
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const getSpecialBlogs = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const blogs = await BlogModel.find({ isSpecial: true })
            .select('title slug description publishDate thumbnail')
            .lean();

        res.status(200).json({
            success: true,
            blogs
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const getLatestBlogs = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const blogs = await BlogModel.find()
            .sort({ publishDate: -1 })
            .limit(12)
            .select('title slug description publishDate thumbnail')
            .lean();

        res.status(200).json({
            success: true,
            blogs
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const getOldestAndPopularBlogs = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // 1. قدیمی‌ترین بلاگ‌ها (۱۰ تا)
        const oldestBlogs = await BlogModel.find()
            .sort({ publishDate: 1 })
            .limit(10)
            .select('title slug publishDate thumbnail')
            .lean();

        // 2. محبوب‌ترین بلاگ‌ها (بر اساس ویو، لایک و کامنت)
        const popularBlogs = await BlogModel.find()
            .select('title slug publishDate thumbnail views ').
            sort({ views: -1, likes: -1, comments: -1 })
            .limit(10)
            .lean();

        res.status(200).json({
            success: true,
            oldestBlogs,
            popularBlogs
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//



const rateLimiter = new RateLimiterMemory({
    points: 1, // 1 ویو
    duration: 60 * 60, // در هر ساعت
});

const recordBlogView = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const blogId = req.params.id;
    const userIp: any = req.ip;

    try {
        await rateLimiter.consume(userIp); // مصرف محدودیت برای این IP

        // ثبت ویو
        await BlogModel.findByIdAndUpdate(blogId, { $inc: { views: 1 } });

        res.status(200).json({ message: "View recorded successfully!" });
    } catch (rejRes) {
        return res.status(429).json({
            message: "Too many views from this IP. Please try again later.",
        });
    }
});


const getBlogsByCategories = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // دریافت تمام دسته‌بندی‌ها
        const categories = await BlogCategoryModel.find({}).lean();

        // ایجاد یک شیء برای نگهداری اطلاعات بلاگ‌ها بر اساس دسته‌بندی
        let categoryData: any = {};

        for (let category of categories) {
            // دریافت ۱۲ بلاگ اخیر از هر دسته‌بندی
            const blogs = await BlogModel.find({ categories: category._id })
                .sort({ publishDate: -1 }) // مرتب‌سازی بر اساس تاریخ انتشار (جدیدترین اول)
                .limit(12) // محدود کردن به 12 بلاگ
                .select('thumbnail title description comments publishDate slug')
                .lean();

            // اضافه کردن اطلاعات مربوط به هر دسته‌بندی به شیء
            categoryData[category.name] = {
                totalBlogs: await BlogModel.countDocuments({ categories: category._id }), // تعداد بلاگ‌های مرتبط با این دسته‌بندی
                blogs: blogs,// ۱۲ بلاگ اخیر
                slug: category.slug,
                name: category.name
            };
        }

        res.status(200).json({
            success: true,
            data: categoryData
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//


const getRelatedBlogsByCourseName = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseName = req.params.name;

        // یافتن دوره با نام مشخص
        const course: any = await CourseModel.findOne({ urlName: courseName }).lean();

        if (!course) {
            return res.status(404).json({ success: false, message: 'دوره‌ای با این نام یافت نشد' });
        }

        // بررسی خالی بودن فیلد relatedBlogs
        if (!course.relatedBlogs || course.relatedBlogs.length === 0) {
            return res.status(404).json({ success: false, message: 'بلاگی مرتبط با این دوره یافت نشد' });
        }


        const relatedBlogs = await BlogModel.find({ _id: { $in: course.relatedBlogs } })
            .select('title slug lastUpdated publishDate likes views thumbnail')
            .sort({ publishDate: -1 });

        // ارسال پاسخ
        res.status(200).json({
            success: true,
            blogs: relatedBlogs
        });
    } catch (error: any) {

        return next(new ErrorHandler(error.message, 500));
    }
});


const getBlogCategories = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const categories = await BlogCategoryModel.find({})

        res.status(200).json({ categories, success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})//


const createBlogCategory = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, slug, avatar } = req.body; // دریافت اطلاعات ورودی

        if (!name || !slug || !avatar) {
            return next(new ErrorHandler("تمام فیلدهای ضروری را پر کنید", 400));
        }

        // تبدیل Base64 به Buffer
        const imageName = `${Date.now()}-${slug}.png`;
        const buffer = Buffer.from(avatar.split(",")[1], "base64");

        const uploadParams: any = {
            Body: buffer,
            Bucket: process.env.LIARA_BUCKET_NAME,
            Key: `CategoryImages/${imageName}`,
            ACL: "public-read",
        };

        await s3.send(new PutObjectCommand(uploadParams));

        // ذخیره اطلاعات در دیتابیس
        const newCategory = await BlogCategoryModel.create({
            name,
            slug,
            avatar: {
                imageName,
                imageUrl: `https://images.vc-virtual-learn.com/CategoryImages/${imageName}`,
            }
        });

        res.status(201).json({
            success: true,
            message: "دسته‌بندی با موفقیت ایجاد شد",
            category: newCategory,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const deleteBlogCategory = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        const category = await BlogCategoryModel.findById(id);
        if (!category) {
            return next(new ErrorHandler("دسته‌بندی مورد نظر یافت نشد", 404));
        }

        // حذف تصویر از S3
        if (category.avatar.imageName) {
            const deleteParams = {
                Bucket: process.env.LIARA_BUCKET_NAME_COURSE,
                Key: `CategoryImages/${category.avatar.imageName}`
            };
            await s3.send(new DeleteObjectCommand(deleteParams));
        }

        await category.deleteOne();

        res.status(200).json({ success: true, message: "دسته‌بندی با موفقیت حذف شد" });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});//

const categoriesWithCount = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {

    try {
        // دریافت تمام کتگوری‌ها
        const categories = await BlogCategoryModel.find({}, "name slug avatar.imageUrl").lean();

        // دریافت تعداد بلاگ‌های مرتبط برای هر کتگوری
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const blogCount = await BlogModel.countDocuments({ categories: category._id });
                return {
                    name: category.name,
                    slug: category.slug,
                    imageUrl: category.avatar?.imageUrl || null,
                    totalBlogs: blogCount,
                };
            })
        );

        res.status(200).json({
            success: true,
            categories: categoriesWithCounts,
        });
    } catch (error: any) {
        next(error);
    }

})//

export {
    getRelatedBlogsByCourseName,
    createBlog,
    getAllBlogs,
    getBlogBySlug,
    recordBlogView,
    getOldestAndPopularBlogs,
    getLatestBlogs,
    getSpecialBlogs,
    getBlogsInSlider,
    homeSearch,
    getBlogsByCategory,
    deleteBlog,
    searchBlogs,
    updateBlog,
    getBlogsByCategories,
    createBlogCategory,
    deleteBlogCategory,
    getBlogCategories,
    categoriesWithCount
}