import express from "express";
import {  getCategories } from "../controllers/category.controller";
import { updateAccessToken } from "../controllers/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";


const categoryRouter = express.Router();

 
categoryRouter.get('/categories', isAuthenticated, authorizeRoles('admin'), getCategories);
 




export default categoryRouter