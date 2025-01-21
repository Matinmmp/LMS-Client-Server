import express from "express";
import {  getTeachers, getTeacherByEngName, getTeachersAcademiesByEngName, getTeacherCoursesByEngName, getAllTeachersName } from "../controllers/teacher.controller.js";


const teacherRouter = express.Router();


teacherRouter.get('/teachers', getTeachers);
teacherRouter.get('/getTeacherByEngName/:name', getTeacherByEngName);
teacherRouter.get('/getTeachersAcademiesByEngName/:name', getTeachersAcademiesByEngName);
teacherRouter.get('/getTeacherCoursesByEngName/:name', getTeacherCoursesByEngName);
teacherRouter.get('/getAllTeachersName', getAllTeachersName);


 



export default teacherRouter