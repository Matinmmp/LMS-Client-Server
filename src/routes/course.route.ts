import express from 'express';
import { editCourse, getAllCourses, getCourseByName, getCourseData, searchCourses } from '../controllers/course.controller';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { updateAccessToken } from '../controllers/user.controller';

const courseRouter = express.Router();

courseRouter.get('/courses', updateAccessToken, isAuthenticated, authorizeRoles('admin'), getAllCourses)
courseRouter.get('/get-course/:name', getCourseByName);
courseRouter.get('/get-courseData/:name', getCourseData);

courseRouter.post('/searchCourses', searchCourses);



 






export default courseRouter;