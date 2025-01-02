import express from 'express';
import { getRelatedBlogsByCourseName } from '../controllers/blog.controller';
import { createComment } from '../controllers/courseReview.controller';
import { isAuthenticated } from '../middleware/auth';


const blogRouter = express.Router();

blogRouter.get('/getRelatedBlogsByCourseName/:name', getRelatedBlogsByCourseName);
blogRouter.post('/postComment', isAuthenticated, createComment);


export default blogRouter;