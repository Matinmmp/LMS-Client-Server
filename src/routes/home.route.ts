import express from "express";

import { getHomeFavoritAcadmy, getHomeFavoritCourses, getHomeFavoritTeachers, getHomeLastCourses, homeSearch } from "../controllers/home.controller.js";


const homeRouter = express.Router();
homeRouter.get('/get-home-favorite-academy', getHomeFavoritAcadmy);
homeRouter.get('/get-home-last-courses' , getHomeLastCourses);
homeRouter.get('/get-home-favorite-courses' , getHomeFavoritCourses);
homeRouter.get('/get-home-favorite-teachers' , getHomeFavoritTeachers);
homeRouter.get('/home-search' , homeSearch);



export default homeRouter