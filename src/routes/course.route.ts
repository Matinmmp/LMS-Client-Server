import express from 'express';
import { getAllCourseUrlNames, getCourseByName, getCourseDataByNameLoged, getCourseDataByNameNoLoged, getRelatedCourses, rateCourse, searchCourses } from '../controllers/course.controller';
import { isAuthenticated, } from '../middleware/auth';
import { getDiscountedCourses } from '../controllers/home.controller';


const courseRouter = express.Router();

courseRouter.get('/get-course/:name', getCourseByName);
courseRouter.get('/getCourseDataByNameNoLoged/:name', getCourseDataByNameNoLoged);
courseRouter.get('/getCourseDataByNameLoged/:name', isAuthenticated, getCourseDataByNameLoged);
courseRouter.get('/getAllCourseUrlNames', getAllCourseUrlNames);
courseRouter.get('/getRelatedCourses/:name', getRelatedCourses);
courseRouter.get('/getDiscountedCourses', getDiscountedCourses);
courseRouter.post('/rateCourse',isAuthenticated, rateCourse);



 
courseRouter.post('/searchCourses', searchCourses);










export default courseRouter;