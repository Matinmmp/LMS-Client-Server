import express from "express";
import { createCategory, deleteCategory, getCategories } from "../adminControllers/category.controller";



const adminCategoryRouter = express.Router();

adminCategoryRouter.post('/create-category', createCategory);
adminCategoryRouter.get('/categories',  getCategories);
adminCategoryRouter.get('/delete-category/:id',  deleteCategory);




export default adminCategoryRouter