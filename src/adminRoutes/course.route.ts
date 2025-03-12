import express from 'express';
import { addLessonBySectionId, addSection, deleteCourse, editCourse, editLesson, editSectionBySectionId, getAllCourses, getCourseById, getSectionsByCourseId, getSectionsWithLessonsByCourseId, uploadCourse } from '../adminControllers/course.controller';

const adminCourseRouter = express.Router();

adminCourseRouter.post('/create-course', uploadCourse)
adminCourseRouter.get('/courses', getAllCourses)
adminCourseRouter.get('/delete-course/:id', deleteCourse)
adminCourseRouter.get('/get-course/:id', getCourseById);
adminCourseRouter.post('/edit-course/:id', editCourse);
adminCourseRouter.post('/add-section/:id', addSection);
adminCourseRouter.get('/get-sections/:id', getSectionsByCourseId);
adminCourseRouter.post('/edit-sections/:id', editSectionBySectionId);
adminCourseRouter.post('/add-sections/:id', addLessonBySectionId);
adminCourseRouter.post('/add-lesson/:id', addLessonBySectionId);
adminCourseRouter.post('/edit-lesson/:id', editLesson); 
adminCourseRouter.get('/get-section_wiht_lessons/:id', getSectionsWithLessonsByCourseId);


export default adminCourseRouter;