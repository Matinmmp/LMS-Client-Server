import express from 'express';
import { getBlogBySlug, getBlogsByCategories, getBlogsByCategory, getBlogsInSlider, getLatestBlogs, getOldestAndPopularBlogs, getRelatedBlogsByCourseName, getSpecialBlogs, searchBlogs } from '../controllers/blog.controller';
import { homeSearch } from '../controllers/home.controller';


const blogRouter = express.Router();


blogRouter.get('/getBlogsInSlider', getBlogsInSlider);
blogRouter.get('/getBlogBySlug/:slug', getBlogBySlug);

blogRouter.get('/getSpecialBlogs', getSpecialBlogs);
blogRouter.get('/getOldestAndPopularBlogs', getOldestAndPopularBlogs);
blogRouter.get('/getLatestBlogs', getLatestBlogs);
blogRouter.get('/getBlogsByCategories', getBlogsByCategories);
blogRouter.get('/getBlogsByCategory/:slug', getBlogsByCategory);
blogRouter.post('/homeSearch', homeSearch);
blogRouter.post('/searchBlogs', searchBlogs);
blogRouter.post('/homeSearch', homeSearch);

 

// blogRouter.get('/getRelatedBlogsByCourseName/:name', getRelatedBlogsByCourseName);
// blogRouter.post('/postComment', isAuthenticated, createComment);


export default blogRouter;