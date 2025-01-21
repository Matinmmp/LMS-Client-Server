import { NextFunction, Request, Response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import CategoryModel from "../models/category.model.js";


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