// import express from "express";
// import { acitvateUser, deleteUser, getAllUsers, getUserInfo, loginUser, logoutUser, registrationUser, socialAuth, updateAccessToken, updatePassword, updateProfilePicture, updateUserInfo, updateUserRole } from "../controllers/user.controller";
// import { authorizeRoles, isAuthenticated } from "../middleware/auth";

// const userRouter = express.Router();

// userRouter.post('/registration', registrationUser);

// userRouter.post('/activate-user', acitvateUser);

// userRouter.post('/login', loginUser);

// userRouter.get('/logout', isAuthenticated, logoutUser);

// userRouter.post('/social-auth', socialAuth);

// userRouter.get('/refresh-token', updateAccessToken);

// // get user by id //me in course
// userRouter.get('/user', updateAccessToken,isAuthenticated, getUserInfo);

// // edit user info 
// userRouter.put('/update-user-info', isAuthenticated, updateUserInfo);

// userRouter.put('/update-user-password', isAuthenticated, updatePassword);

// userRouter.put('/update-user-avatar', isAuthenticated, updateProfilePicture);

// userRouter.get('/get-users', isAuthenticated, authorizeRoles('admin'), getAllUsers);

// userRouter.put('/update-user-role', isAuthenticated, authorizeRoles('admin'), updateUserRole);

// userRouter.delete('/delete-user/:id', isAuthenticated, authorizeRoles('admin'), deleteUser);













// export default userRouter;