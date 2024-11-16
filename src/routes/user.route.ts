import express from "express";
import { acitvateUser, createInvoice, getUserFreeCourses, getUserInfo, getUserInvoices, getUserPaidCourses, loginUser, logoutUser, registrationUser, setPassword, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo } from "../controllers/user.controller";
import { isAuthenticated } from "../middleware/auth";

const userRouter = express.Router();

userRouter.post('/registration', registrationUser);

userRouter.post('/activate-user', acitvateUser);

userRouter.post('/login', loginUser);

userRouter.get('/logout', isAuthenticated, logoutUser);

userRouter.post('/social-auth', socialAuth);

userRouter.get('/refresh-token', updateAccessToken);

// get user by id //me in course
userRouter.get('/user', isAuthenticated, getUserInfo);

// edit user info 
userRouter.put('/update-user-info', isAuthenticated, updateUserInfo);

userRouter.put('/update-user-password', isAuthenticated, updatePassword);

userRouter.put('/set-user-password', isAuthenticated, setPassword);

userRouter.put('/update-user-avatar', isAuthenticated, updateProfilePicture);


userRouter.post('/create-invoice', isAuthenticated, createInvoice);

userRouter.get('/get-invoice', isAuthenticated, getUserInvoices);

userRouter.get('/get-user-paid-courses', isAuthenticated, getUserPaidCourses);

userRouter.get('/get-user-free-courses', isAuthenticated, getUserFreeCourses);




















export default userRouter;