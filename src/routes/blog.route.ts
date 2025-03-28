import express from 'express';
import { getBlogsByCategories, getBlogsByCategory, getBlogsInSlider, getLatestBlogs, getOldestAndPopularBlogs, getRelatedBlogsByCourseName, getSpecialBlogs } from '../controllers/blog.controller';


const blogRouter = express.Router();


blogRouter.get('/getBlogsInSlider', getBlogsInSlider);
blogRouter.get('/getSpecialBlogs', getSpecialBlogs);
blogRouter.get('/getOldestAndPopularBlogs', getOldestAndPopularBlogs);
blogRouter.get('/getLatestBlogs', getLatestBlogs);
blogRouter.get('/getBlogsByCategories', getBlogsByCategories);
blogRouter.get('/getBlogsByCategory/:slug', getBlogsByCategory);


// blogRouter.get('/getRelatedBlogsByCourseName/:name', getRelatedBlogsByCourseName);
// blogRouter.post('/postComment', isAuthenticated, createComment);


export default blogRouter;