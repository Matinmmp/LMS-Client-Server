import express from "express";

import { updateAccessToken } from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {  getAcademies, getHomeFavoritAcadmy } from "../controllers/academyControllers";


const academyRouter = express.Router();


academyRouter.get('/academies', authorizeRoles('admin'), getAcademies);
academyRouter.get('/get-home-favorite-academy', getHomeFavoritAcadmy);
 

export default academyRouter