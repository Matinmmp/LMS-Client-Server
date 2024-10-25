import express from "express";
import {  getTeachers, getTeacherByEngName, getTeachersAcademiesByEngName, getTeacherCoursesByEngName } from "../controllers/teacherControllers";


const teacherRouter = express.Router();


teacherRouter.get('/teachers', getTeachers);
teacherRouter.get('/getTeacherByEngName/:name', getTeacherByEngName);
teacherRouter.get('/getTeachersAcademiesByEngName/:name', getTeachersAcademiesByEngName);
teacherRouter.get('/getTeacherCoursesByEngName/:name', getTeacherCoursesByEngName);





export default teacherRouter