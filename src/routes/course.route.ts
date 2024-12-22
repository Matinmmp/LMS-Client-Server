import express from 'express';
import { getCourseByName, getCourseDataByNameLoged, getCourseDataByNameNoLoged, searchCourses } from '../controllers/course.controller';
import { isAuthenticated, } from '../middleware/auth';


const courseRouter = express.Router();

courseRouter.get('/get-course/:name', getCourseByName);
courseRouter.get('/getCourseDataByNameNoLoged/:name', getCourseDataByNameNoLoged);
courseRouter.get('/getCourseDataByNameLoged/:name', isAuthenticated, getCourseDataByNameLoged);



courseRouter.post('/searchCourses', searchCourses);










export default courseRouter;