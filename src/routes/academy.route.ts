import express from "express";
import { authorizeRoles } from "../middleware/auth";
import {  getAcademies, getAcademyByEngName,} from "../controllers/academyControllers";


const academyRouter = express.Router();


academyRouter.get('/academies', getAcademies);
academyRouter.get('/getAcademyByName/:name', getAcademyByEngName);


 

export default academyRouter