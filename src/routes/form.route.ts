import express from 'express';

import { sendFormEmail } from '../controllers/form.contrroler';


const formRoute = express.Router();

formRoute.post('/sendFormEmail', sendFormEmail);
 


export default formRoute;