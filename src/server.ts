import { app } from "./app";
import connectDB from './utils/db';

import dotenv from 'dotenv';

dotenv.config();


const start = async () => {
    connectDB();
    app.listen(process.env.PORT, () => console.log(`run`))
}

start()






