import express, { Request, Response } from 'express';
import { getAllCourseUrlNames, getCourseByName, getCourseDataByNameLoged, getCourseDataByNameNoLoged, getRelatedCourses, rateCourse, recordCourseView, rename1, searchCourses } from '../controllers/course.controller';
import { isAuthenticated, } from '../middleware/auth';
import { getDiscountedCourses } from '../controllers/home.controller';
 


const courseRouter = express.Router();

courseRouter.get('/get-course/:name', getCourseByName);
courseRouter.get('/getCourseDataByNameNoLoged/:name', getCourseDataByNameNoLoged);
courseRouter.get('/getCourseDataByNameLoged/:name', isAuthenticated, getCourseDataByNameLoged);
courseRouter.get('/getAllCourseUrlNames', getAllCourseUrlNames);
courseRouter.get('/getRelatedCourses/:name', getRelatedCourses);
courseRouter.get('/getDiscountedCourses', getDiscountedCourses);
courseRouter.post('/rateCourse', isAuthenticated, rateCourse);
courseRouter.post('/searchCourses', searchCourses);
courseRouter.put('/rename', rename1);
courseRouter.get('/recordCourseView/:id', recordCourseView);















export default courseRouter;