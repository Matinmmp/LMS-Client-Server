import express from "express";
import { authorizeRoles } from "../middleware/auth";
import {  getAcademies,} from "../controllers/academyControllers";


const academyRouter = express.Router();


academyRouter.get('/academies', authorizeRoles('admin'), getAcademies);

 

export default academyRouter