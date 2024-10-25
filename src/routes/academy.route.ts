import express from "express";
import { authorizeRoles } from "../middleware/auth";
import {  getAcademies, getAcademyByEngName, getAcademyCoursesByEngName, getAcademyTeachersByEngName, getAllAcademyNames,} from "../controllers/academyControllers";


const academyRouter = express.Router();


academyRouter.get('/academies', getAcademies);
academyRouter.get('/getAcademyByName/:name', getAcademyByEngName);
academyRouter.get('/getAcademyCoursesByEngName/:name', getAcademyCoursesByEngName);
academyRouter.get('/getAcademyTeachersByEngName/:name', getAcademyTeachersByEngName);
academyRouter.get('/getAllAcademyNames', getAllAcademyNames);





 

export default academyRouter