
import userModel from "../models/user.model"
import { redis } from "../utils/redis";


// get user bu id
const getUserById = async (id: string) => {
    const userJson = await redis.get(id);
    if (userJson) return JSON.parse(userJson);
}

// Get All users
const getAllUsersService = async () => {
    const users = await userModel.find().sort({ createAt: -1 })
    return users;
}


// update user role 
const updateUserRoleService = async (id:string,role:string)=>{
    const user = await userModel.findByIdAndUpdate(id, { role }, { new: true });

    return user
}

export {
    getUserById,
    getAllUsersService,
    updateUserRoleService
}

