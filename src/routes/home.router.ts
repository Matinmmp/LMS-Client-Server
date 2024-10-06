import express from "express";

import { getHomeFavoritAcadmy, getHomeFavoritCourses, getHomeFavoritTeachers, getHomeLastCourses } from "../controllers/homeControllers";


const homeRouter = express.Router();
homeRouter.get('/get-home-favorite-academy', getHomeFavoritAcadmy);
homeRouter.get('/get-home-last-courses' , getHomeLastCourses);
homeRouter.get('/get-home-favorite-courses' , getHomeFavoritCourses);
homeRouter.get('/get-home-favorite-teachers' , getHomeFavoritTeachers);


export default homeRouter