import express from "express";

// import { updateAccessToken } from "../controllers/user.controller";
// import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createTeacher, deleteTeacher, editTeacherAcademyList, getTeachers } from "../adminControllers/teacher.controller";


const adminTeacherRouter = express.Router();


adminTeacherRouter.get('/teachers',  getTeachers);
adminTeacherRouter.post('/create-teacher',  createTeacher);
adminTeacherRouter.get('/delete-teacher/:id',  deleteTeacher);
adminTeacherRouter.post('/edit-teacher-academy-list/:id',  editTeacherAcademyList);




export default adminTeacherRouter