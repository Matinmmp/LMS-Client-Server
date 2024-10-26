import express from 'express';
import { editCourse, getAllCourses, getCourseById, searchCourses } from '../controllers/course.controller';
import { authorizeRoles, isAuthenticated } from '../middleware/auth';
import { updateAccessToken } from '../controllers/user.controller';

const courseRouter = express.Router();

courseRouter.get('/courses', updateAccessToken, isAuthenticated, authorizeRoles('admin'), getAllCourses)
courseRouter.get('/get-course/:id', updateAccessToken, isAuthenticated, authorizeRoles('admin'), getCourseById);
courseRouter.post('/edit-course/:id', updateAccessToken, isAuthenticated, authorizeRoles('admin'), editCourse);
courseRouter.post('/searchCourses', searchCourses);


 






export default courseRouter;