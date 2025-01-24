import express from "express";
import { getCat_Ac_Teach } from "../controllers/dashboard.controller";


const dashboardRoute = express.Router();

 
dashboardRoute.get('/Get_Cat_Ac_Teach', getCat_Ac_Teach);
 




export default dashboardRoute