import express from "express";

import { updateAccessToken } from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {  getTeachers } from "../controllers/teacherControllers";


const teacherRouter = express.Router();


teacherRouter.get('/teachers', isAuthenticated, authorizeRoles('admin'), getTeachers);







export default teacherRouter