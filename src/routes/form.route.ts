import express from 'express';

import { sendFormEmail } from '../controllers/form.controller.js';


const formRoute = express.Router();

formRoute.post('/sendFormEmail', sendFormEmail);
 


export default formRoute;