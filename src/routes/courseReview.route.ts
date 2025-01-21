import express from 'express';
import { getCourseComments } from '../controllers/courseReview.controller.js';
 


const courseReviewRoute = express.Router();

courseReviewRoute.post('/getCourseComments/:name', getCourseComments);

export default courseReviewRoute;