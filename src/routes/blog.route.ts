import express from 'express';
import { getRelatedBlogsByCourseName } from '../controllers/blog.controller';


const blogRouter = express.Router();

blogRouter.get('/getRelatedBlogsByCourseName/:name', getRelatedBlogsByCourseName);

export default blogRouter;