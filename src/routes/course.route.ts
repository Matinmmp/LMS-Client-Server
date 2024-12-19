import express from 'express';
import {   getAllCourses, getCourseByName,
    //  getCourseDataByNameLoged, 
    getCourseDataByNameNoLoged, searchCourses } from '../controllers/course.controller';
import { authorizeRoles, isAuthenticated, isAuthenticated2 } from '../middleware/auth';
import { getUserInfo, updateAccessToken } from '../controllers/user.controller';

const courseRouter = express.Router();

courseRouter.get('/get-course/:name', getCourseByName);
courseRouter.get('/getCourseDataByNameNoLoged/:name', getCourseDataByNameNoLoged);
// courseRouter.get('/getCourseDataByNameLoged/:name', isAuthenticated,getCourseDataByNameLoged);

 

courseRouter.post('/searchCourses', searchCourses);



 






export default courseRouter;