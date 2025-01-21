import express from 'express';
import { getRelatedBlogsByCourseName } from '../controllers/blog.controller.js';
import { createComment } from '../controllers/courseReview.controller.js';
import { isAuthenticated } from '../middleware/auth.js';


const blogRouter = express.Router();

blogRouter.get('/getRelatedBlogsByCourseName/:name', getRelatedBlogsByCourseName);
blogRouter.post('/postComment', isAuthenticated, createComment);


export default blogRouter;