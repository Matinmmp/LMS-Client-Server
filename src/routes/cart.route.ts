import express from 'express';
import { getCoursesByIds } from '../controllers/cart.controller';



const cartRouter = express.Router();

cartRouter.post('/getCartCourses', getCoursesByIds);


export default cartRouter;
