import path from "path";
import { userModel, videoModel } from "../Models/UserModel.js";
import fs from "fs";
import {
  uploadOnCoudinary,
  uploadVideoOnCloudinary1,
  uploadVideoOnSupabase,
  uploadVideoOnSupabase1,
  
} from "../Utill/Cloudinary.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { title } from "process";
import { promises } from "dns";
const registerController = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    console.log("Files:", req.file.path);
    if (!req.body.name || !req.body.password || !req.body.email || !req.file) {
      return res.status(201).json({ message: "All Fields are required" });
    }
    const existingUser = await userModel.findOne({
      email: req.body.email,
    });

    if (existingUser) {
      return res
        .status(200)
        .json({ message: "User is already exist ", success: false });
    }

    if (!req.file) {
      return res
        .status(200)
        .json({ message: "Profile Picture is required", success: false });
    }

    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    req.body.password = hashPassword;

    const avtarLocalPath = req.file?.path;
    const avtarUrl = await uploadOnCoudinary(avtarLocalPath);
    req.body.avtar = avtarUrl;
    const newUser = new userModel(req.body);
    const result = await newUser.save();
    res
      .status(200)
      .json({ message: "UserRegister Succesfully", success: true });
  } catch (error) {
    console.log("error in registewrController2", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const loginController = async (req, res) => {
  try {
    const user = await userModel.findOne({ email: req.body.email });
    if (!user) {
      res
        .status(200)
        .json({ message: "User not exist please register", success: false });
    }
    const isMatch = await bcrypt.compare(req.body.password, user.password);
    if (!isMatch) {
      res
        .status(200)
        .json({ message: "Invalide email or password", success: false });
    } else {
      const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1d",
      });
      console.log("user", user);
      console.log("_id", user.id);
      res.status(200).json({
        message: "Login Successful",
        success: true,
        token,
        cust: {
          id: user.id,
          name:user.name,
        },
      });
    }
  } catch (error) {
    console.log("Error in loginController", error);
  }
};

const uploadVideoController = async (req, res) => {
  try {
    console.log("Request Body:", req.body);
    
     const videoFile = req.files["video"] ? req.files["video"][0] : null;
     const avatarFile = req.files["avtar"] ? req.files["avtar"][0] : null;
    console.log("video and avtar", videoFile, avatarFile);
    if (!videoFile || !avatarFile) {
      return res
        .status(400)
        .json({ error: "Both video and avatar are required" });
    }

    const { channelId, title, description,channelName } = req.body;

    if (!channelId) {
      return res.status(402).json({ error: "Channel ID is required" });
    }

    const user = await userModel.findById(channelId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log("Before surabase Upload...");
    const filePath = videoFile.path;
    const thumbnailPath = avatarFile.path;
    const thumbnail = await uploadOnCoudinary(thumbnailPath);
   
    const uploadedVideo = await uploadVideoOnSupabase1(filePath);

    if (!uploadedVideo) {
      return res.status(500).json({ error: "Supabase upload failed!" });
    }
   console.log("uploadvideo", uploadedVideo);
   const { videoUrl, indexM3U8Url, segmentUrls } = uploadedVideo;
  console.log("video upload urls", videoUrl, segmentUrls, indexM3U8Url);

   
    const newVideo = {
      title,
      description,
      channelName,
      thumbnail,
      channelId,
      date: Date.now(),
      indexM3U8Url,
      segmentUrls,
      videoUrl,
    };
    const video=new videoModel(newVideo);
    const vid=await video.save();
    if (!user.videos) {
      user.videos = [];
    }

    user.videos.push(newVideo);
    await user.save();

  
    fs.unlinkSync(filePath);

    res.status(201).json({
      message: "Video uploaded successfully",
      success: true,
      video: newVideo,
    });
  } catch (error) {
    console.error("Error in uploadVideoController:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getVideoController=async(req,res)=>{
  try {
    const searchValue=req.query.q;
   let result;
    if(!searchValue){
       result = await videoModel.find();
    }else{

      result = await videoModel.find({ title: searchValue });

    }
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({message:"internal server Error..."})
    console.log("Error in getVideoController",error);
  }
}
const likeVideoController=async(req,res)=>{
      try {
        const {userId,videoId}=req.body;
        console.log("req.body",req.body);
        const video=await videoModel.findById(videoId);
        console.log("videoId",videoId,userId);
        if(!video){
          return res.status(200).json({message:"video not exist"});
        }
        if (isNaN(video.likedVideos)) {
          video.likedVideos = 0; // Default to 0 if it was NaN
        }
        video.likedVideos=video.likedVideos+1;
        await video.save();
        const user=await userModel.findById(userId);
         if (!user) {
           return res.status(200).json({ message: "video not exist" });
         }
        

          const videoIdStr = videoId.toString();
          const index = user.likedVideos.indexOf(videoIdStr);
          if (index !== -1) {
           
            res.status(200).json({ message: "video already Liked" ,sucess:false});
          } else {
            user.likedVideos.push(videoIdStr);
            user.save();
            res.status(200).json({ message: "video Liked" ,sucess:true});
          }
         
      } catch (error) {
        console.log("Error in lokeVideoController",error);
        res.status(500).json({message:"internal server error"});
      }
}

const watchLaterVideoController=async(req,res)=>{
  try {
    const {userId,videoId}=req.body;
    console.log("req",req.body);
    const user=await userModel.findById(userId);
    if(!user){
      return res.status(200).json({message:"user not exist"});
    } 
     const videoIdStr=videoId.toString();
     const index=user.watchLater.indexOf(videoIdStr);
     if(index!==-1){
      user.watchLater.splice(index,1);
      user.save();
      res.status(200).json({ message: "video remove from watchlater", sucess:false });
     }else{
      user.history.push(videoIdStr);
      user.watchLater.push(videoIdStr);
      user.save();
      res.status(200).json({ message: "video add to watchlater" ,sucess:true });
     }
    
  } catch (error) {
    console.log("Error in watchLaterVideoController",error);
    res.status(500).json({message:"INTERNAL sERVER error"});
  }
}

const subscribeVideoController=async(req,res)=>{
  try {
    const {userId,channelId}=req.body;
    const user=await userModel.findById(userId);
    const channel=await userModel.findById(channelId);
    if(!user || !channel){
      return res.status(200).json({message:"user or channel is not found"});
    };
      const channelIdStr=channelId.toString();
      const index=user.subsctription.indexOf(channelIdStr);
      
      if(index!==-1){
         
          res.status(200).json({ message: "channel is already subscribed",success:false });
      }else{
        if (isNaN(channel.subscibers)) {
          channel.subscibers = 0; 
        }
        channel.subscibers=channel.subscibers+1;
        user.subsctription.push(channelId);
        user.save();
        channel.save();
        res.status(200).json({message:"channel is subscribed"});
      }
  } catch (error) {
    console.log("Error in subscribeVideoController",error);
    res.status(500).json({message:"internal server error"});
  }
}

const historyController=async(req,res)=>{
  try {
    const {userId,videoId}=req.body;
    const user=await userModel.findById(userId);
    if(!user){
      return res.status(200).json({message:"user not exist"});

    }
    user.history.push(videoId);
    user.save();
    res.status(200).json({message:"video add in history"});
  } catch (error) {
    console.log("Error in historyController",error);
    res.status(500).json({message:"internal server error"});
  }
};
const getLikedVideoController=async(req,res)=>{
    try {
      const userId=req.query.q;
      console.log("userId",userId);
      const user=await userModel.findById(userId);
      if(!user){
        return res.status(200).json({message:"usernot found"});
      }
      const likedVideos = await Promise.all(
        user.likedVideos.map((videoId) => videoModel.findById(videoId))
      );
      res.status(200).json(likedVideos);
    } catch (error) {
      console.log("Error in getLikedVideoController",error);
      res.status(500).json({message:"Internal Server Error"});
    }
};
const getWatchLatervidios=async(req,res)=>{
   try {
     const userId = req.query.q;
     console.log("userId", userId);
     const user = await userModel.findById(userId);
     if (!user) {
       return res.status(200).json({ message: "usernot found" });
     }
      const watchLaterVideos = await Promise.all(
        user.watchLater.map(async (videoId) => {
          if (!videoId) return null; // Ignore empty IDs
          const video = await videoModel.findById(videoId);
          if (!video) {
            console.log(`Video not found for ID: ${videoId}`); // Debugging log
          }
          return video;
        })
      );

      // Filter out null results
      const filteredVideos = watchLaterVideos.filter((video) => video !== null);
     res.status(200).json(filteredVideos);
   } catch (error) {
     console.log("Error in getLikedVideoController", error);
     res.status(500).json({ message: "Internal Server Error" });
   }
};

const gethistroryvidios = async (req, res) => {
  try {
    const userId = req.query.q;
    console.log("userId", userId);
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(200).json({ message: "usernot found" });
    }
    const watchLaterVideos = await Promise.all(
      user.history.map((videoId) => videoModel.findById(videoId))
    );
    res.status(200).json(watchLaterVideos);
  } catch (error) {
    console.log("Error in getLikedVideoController", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
const getMyVideoController=async(req,res)=>{
  try {
    const userId=req.query.q;
    const user = await userModel.findById(userId).select("videos");
    if(!user){
      return res.status(200).json({message:"user not found"});
    };
   res.json(user.videos);
  } catch (error) {
    console.log("Error in getMyVideoController",error);
    res.status(500).json({message:"Internal server error"});
  }

}
const getSubscription=async(req,res)=>{
    try {
      const userId=req.query.userId;
      const user=await userModel.findById(userId);
      if(!userId){
        return res.status(200).json({message:"usernot found"});
      }
      const subscribed=await Promise.all(
       user.subsctription.map((subscriptionId)=> userModel.findById(subscriptionId))
      );
      res.json(subscribed);
    } catch (error) {
      console.log("Error in geetSubscriptionController",error);
      res.status(500).json({message:"Tnternal server error"});
    }
}
export {
  registerController,
  loginController,
  uploadVideoController,
  getVideoController,
  likeVideoController,
  watchLaterVideoController,
  subscribeVideoController,
  historyController,
  getLikedVideoController,
  getWatchLatervidios,
  gethistroryvidios,
  getMyVideoController,
  getSubscription,
};
