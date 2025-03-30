import mongoose from "mongoose";
import { type } from "os";
const commentSchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: [true, "channel id for comment is required"],
  },
  coment: {
    type: String,
    required: [true, "channel id for comment is required"],
  },
  date:{
    type:String
    
  }
});
const subsctriptionSchema=new mongoose.Schema({
    channelId:{
        type:String,
        required:[true,"ChannelId is required"]
    },
    name:{
        type:String,
        required:[true,"Channel Name is required"]
    }
})

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Title of video is required"],
  },
  description: {
    type: String,
  },
  channelId: {
    type: String,
    required: [true, "Channel id is required for uploading video"],
  },
  channelName: {
    type: String,
  },
  coments: [commentSchema],
  likedVideos: {
    type: Number,
  },
  views: {
    type: Number,
  },
  date: {
    type: String,
  },
  videoUrl: {
    type: String,
  },
  indexM3U8Url: { type: String },
  segmentUrls: { type: Object },
  masterPlaylistUrl: { type: String },
  resolutions: { type: Object },
  thumbnail: {
    type: String,
  },
});

const userSchema=new mongoose.Schema({
    name:{
      type:String,
        required:[true,"Name is required"],
    },
    email:{
        type:String,
        required:[true,"Email is required"]
    },
    avtar:{
        type:String,
  
    },
    password:{
        type:String,
        required:[true,"Password is required"]
    },
    subscibers:{
        type:Number
    },
    subsctription:[{type:String}],
    videos:[videoSchema],
    watchLater:[{type:String}],
    likedVideos:[{
      type:String,
    }],
    history:[{type:String}],
})
 const userModel=mongoose.model("User",userSchema);
const videoModel=mongoose.model("Video",videoSchema);
export{
  userModel,videoModel,
}

