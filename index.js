import express from "express"
import cors from "cors"

import userRoutes from "./Routes/UserRoutes.js";
import { v4 as uuidv4 } from "uuid"
import path from "path"
import DB from "./Config/DB.js"

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Promise Rejection:", reason);
});

const app=express();
app.use(
  cors({
    origin: "https://video-streming-git-main-rutvik-shivaji-bansodes-projects.vercel.app",
    Credential: true,
  })
);
DB();
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use("/uploads",express.static("uploads"))


app.use("/api/user/v1",userRoutes);
app.get("/",(req,res)=>{
    res.status(200).json({message:"This is server of YouTube"})
})


app.listen(3000,(req,res)=>{
    console.log("server runing on port 3000");
})

