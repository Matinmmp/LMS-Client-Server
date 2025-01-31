import express from "express";
import { isAuthenticated } from "../middleware/auth";
import { initiatePayment, verifyPayment } from "../controllers/invoice.controller";
import { getUserInvoices } from "../controllers/user.controller";

const invoiceRouter = express.Router();

invoiceRouter.post('/initiatePayment', isAuthenticated,initiatePayment);
invoiceRouter.get('/verifyPayment', isAuthenticated,verifyPayment);
invoiceRouter.get('/getUserInvoices', isAuthenticated,getUserInvoices);

export default invoiceRouter