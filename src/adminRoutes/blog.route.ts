import express from "express";
import { createBlog, createBlogCategory, getAllBlogs, getBlogCategories, updateBlog } from "../controllers/blog.controller";


const adminBlogRoute = express.Router();


adminBlogRoute.get('/blogs', getAllBlogs);
adminBlogRoute.post('/create-blog', createBlog);
adminBlogRoute.post('/update-blog', updateBlog);

adminBlogRoute.get('/blogCategories', getBlogCategories);
adminBlogRoute.post('/create-blogCategory', createBlogCategory);




export default adminBlogRoute