import express from "express";
import { isAuthenticated } from "../middleware/auth";
import { initiatePayment, verifyPayment ,getUserInvoices} from "../controllers/invoice.controller";


const invoiceRouter = express.Router();

invoiceRouter.post('/initiatePayment', isAuthenticated,initiatePayment);
invoiceRouter.get('/verifyPayment', isAuthenticated,verifyPayment);
invoiceRouter.get('/getUserInvoices', isAuthenticated,getUserInvoices);

export default invoiceRouter