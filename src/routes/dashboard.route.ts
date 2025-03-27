import express from "express";
import { getCat_Ac_Teach } from "../controllers/dashboard.controller";
import { categoriesWithCount } from "../controllers/blog.controller";


const dashboardRoute = express.Router();

 
dashboardRoute.get('/Get_Cat_Ac_Teach', getCat_Ac_Teach);
dashboardRoute.get('/Get_Categories-With-Count', categoriesWithCount);




export default dashboardRoute