
import { mongoose } from "mongoose";
import dotenv from 'dotenv';
dotenv.config();
const DB=async()=>{
try {
    await mongoose.connect(`${process.env.DB_URL}`);
    console.log("MongoDb Connected");
} catch (error) {
    console.log("DB URL", process.env.DB_URL);
   console.log("MongoDb Connection Error",error);
}
}

export default DB;