import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();


const dbUrl = process.env.DB_URL1 || '';



const connectDB = async () => {
    try {
        await mongoose.connect(dbUrl).then((data: any) => {
            console.log(`Database connected with ${data.connection.host}`)
        })
    } catch (error: any) {
        console.log(error.message);
        setTimeout(connectDB, 5000)
    }
}

export default connectDB