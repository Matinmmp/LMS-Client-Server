import express from 'express';
import { getBlogsInSlider, getLatestBlogs, getOldestAndPopularBlogs, getRelatedBlogsByCourseName, getSpecialBlogs } from '../controllers/blog.controller';
import { createComment } from '../controllers/courseReview.controller';
import { isAuthenticated } from '../middleware/auth';


const blogRouter = express.Router();


blogRouter.get('/getBlogsInSlider', getBlogsInSlider);
blogRouter.get('/getSpecialBlogs', getSpecialBlogs);
blogRouter.get('/getOldestAndPopularBlogs', getOldestAndPopularBlogs);
blogRouter.get('/getLatestBlogs', getLatestBlogs);



// blogRouter.get('/getRelatedBlogsByCourseName/:name', getRelatedBlogsByCourseName);
// blogRouter.post('/postComment', isAuthenticated, createComment);


export default blogRouter;