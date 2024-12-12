import express from 'express';
import {   getAllCourses, getCourseByName, getCourseData, searchCourses } from '../controllers/course.controller';
import { authorizeRoles, isAuthenticated, isAuthenticated2 } from '../middleware/auth';
import { getUserInfo, updateAccessToken } from '../controllers/user.controller';

const courseRouter = express.Router();

courseRouter.get('/get-course/:name', getCourseByName);
courseRouter.get('/get-courseData/:name',isAuthenticated2, getCourseData);
 

courseRouter.post('/searchCourses', searchCourses);



 






export default courseRouter;