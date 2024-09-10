import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CategoryModel from "../models/category.model";

 
const getCategories = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {

        const categories = await CategoryModel.find({})

        res.status(200).json({ categories, success: true })

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

 

export {
 
    getCategories,
 
}