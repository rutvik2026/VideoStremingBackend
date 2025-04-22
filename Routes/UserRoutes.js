import express from 'express';
import path from "path";
import multer from "multer";
import { gethistroryvidios, getLikedVideoController, getMyVideoController, getSubscription, getVideoController, getWatchLatervidios, historyController, likeVideoController, loginController, registerController, subscribeVideoController, uploadVideoController, watchLaterVideoController } from '../Controllers/Controller.js';

// Configure Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });
const router=express.Router();
router.post("/register",upload.single("avtar"),registerController);
router.post("/login",loginController);

const storagevideo = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") {
      cb(null, "uploadvideo/");
    } else if (file.fieldname === "avtar") {
      cb(null, "Uplods/");
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});



// Configure multer
const upload1 = multer({ storage: storagevideo});

router.post(
  "/uploadvideo",
  upload1.fields([
    { name: "video", maxCount: 1 },
    { name: "avtar", maxCount: 1 },
  ]),
  uploadVideoController
);
router.get("/getvideo",getVideoController);
router.post("/like",likeVideoController);
router.post("/watchlater",watchLaterVideoController);
router.post("/subscribe",subscribeVideoController);
router.post("/history",historyController);
router.get("/likedvidios",getLikedVideoController);
router.get("/watchlatervidios",getWatchLatervidios);
router.get("/historyvidios",gethistroryvidios);
router.get("/yourvidios",getMyVideoController);
router.get("/subscription",getSubscription);
export default router;
