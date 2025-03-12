import express from 'express';
import { updateAcademyRatings, updateCourseDetails, updateCourseRatings, updateTeacherRatings } from '../adminControllers/dashboard.controller';

const adminDasboardRoute = express.Router();

adminDasboardRoute.get('/updateCourseRatings', updateCourseRatings)
adminDasboardRoute.get('/updateAcademyRatings', updateAcademyRatings)
adminDasboardRoute.get('/updateTeacherRatings', updateTeacherRatings)
adminDasboardRoute.get('/updateCourseDetails', updateCourseDetails)

export default adminDasboardRoute