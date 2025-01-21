import express from "express";
import {  getCategories } from "../controllers/category.controller.js";
import { authorizeRoles, isAuthenticated } from "../middleware/auth.js";


const categoryRouter = express.Router();

 
categoryRouter.get('/categories', isAuthenticated, authorizeRoles('admin'), getCategories);
 




export default categoryRouter