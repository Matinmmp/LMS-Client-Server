import express from "express";

// import { updateAccessToken } from "../controllers/user.controller";
// import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createAcademy, deleteAcademy, getAcademies } from "../adminControllers/academy.controller";


const adminAcademyRouter = express.Router();


adminAcademyRouter.get('/academies', getAcademies);
adminAcademyRouter.post('/create-academy', createAcademy);
adminAcademyRouter.get('/delete-academy/:id', deleteAcademy);

export default adminAcademyRouter