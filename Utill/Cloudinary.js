import cloudinary   from "cloudinary";
import dotenv from "dotenv";
import streamifier from "streamifier";
import { v4 as uuidv4 } from "uuid"
import ffmpeg from "fluent-ffmpeg";
import { exec } from "child_process";
import fs from "fs-extra";
import util from "util";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://your-project-id.supabase.co";
const supabaseAnonKey = "your-anon-key";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const execPromise = util.promisify(exec);

dotenv.config();

import path from "path"
import { stderr, stdout } from "process";

cloudinary.config({
  cloud_name: process.env.KEY_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

const uploadOnCoudinary = async (localFilePath) => {
  try {
    console.log("claudinary filepath", localFilePath);
    const uploadResult = await cloudinary.uploader.upload(
      localFilePath,

      {
        resource_type: "auto",
        timeout: 60000,
      }
    );
    console.log("file is upload on coudnary", uploadResult.url);
    return uploadResult.url;
  } catch (error) {
    console.log("error during coudinary", error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};
const uploadVideoOnSupabase = async (filePath) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    const videoId = uuidv4();
    const videoPath = filePath;
    const outputPath = `./uploadvideo/video/${videoId}`;
    const hlsPath = `${outputPath}/index.m3u8`;

    console.log("Processing video at:", filePath);
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    // 🔥 Define different resolutions
    const resolutions = [
      { label: "240p", width: 426, height: 240, bitrate: "500k" },
      { label: "360p", width: 640, height: 360, bitrate: "800k" },
      { label: "1080p", width: 1920, height: 1080, bitrate: "5000k" },
    ];

    const resolutionFiles = [];

    for (const res of resolutions) {
      const hlsPath = `${outputPath}/${res.label}/index.m3u8`;

      console.log(`Generating ${res.label} HLS...`);
      const ffmpegCommand = `
         ffmpeg -i ${videoPath} -vf "scale=${res.width}:${res.height}" -b:v ${res.bitrate} -c:v libx264 -preset fast -crf 23 \
    -c:a aac -b:a 128k \
    -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/${res.label}/segment%03d.ts" \
    -start_number 0 ${hlsPath}
      `;

      await execPromise(ffmpegCommand);
      resolutionFiles.push({ label: res.label, hlsPath });
    }

    console.log("Generating Master Playlist...");
    const masterPlaylistPath = `${outputPath}/master.m3u8`;
    let masterPlaylistContent = "#EXTM3U\n";

    resolutionFiles.forEach(({ label }) => {
      masterPlaylistContent += `
      #EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=${label}
      ${label}/index.m3u8
      `;
    });

    fs.writeFileSync(masterPlaylistPath, masterPlaylistContent.trim());

    // 🔥 Upload to Supabase
    const uploadedFiles = {};

    const folders = ["240p", "360p", "1080p", ""]; // Include the master playlist
    for (const folder of folders) {
      const folderPath = path.join(outputPath, folder);
      if (!fs.existsSync(folderPath)) continue;

      const files = fs.readdirSync(folderPath);
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const fileBuffer = fs.readFileSync(filePath);

        const { data, error } = await supabase.storage
          .from("hlsvideo")
          .upload(`${videoId}/${folder}/${file}`, fileBuffer, {
            contentType: "video/mp2t",
            upsert: true,
          });

        if (error) {
          console.error("Upload error:", error);
        } else {
          console.log("Uploaded:", data);

          if (data?.path) {
            const publicUrl = supabase.storage
              .from("hlsvideo")
              .getPublicUrl(data.path).data.publicUrl;

            if (publicUrl) {
              uploadedFiles[`${folder}/${file}`] = publicUrl;
            }
          }
        }
      }
    }

    console.log("All HLS files uploaded successfully!", uploadedFiles);

    return {
      masterPlaylistUrl: uploadedFiles["/master.m3u8"],
      resolutions: {
        "240p": uploadedFiles["240p/index.m3u8"] || null,
        "360p": uploadedFiles["360p/index.m3u8"]||null,
        "1080p": uploadedFiles["1080p/index.m3u8"]||null,
      },
    };
  } catch (error) {
    console.error("Error in uploadVideoOnSupabase:", error);
    return null;
  }
};


const uploadVideoOnCloudinary1 = async (filePath) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    const videoId = uuidv4();
    const videoPath = filePath;
    const outputPath = `./uploadvideo/video/${videoId}`;
    const hlsPath = `${outputPath}/index.m3u8`;

    console.log("hlsPath", hlsPath);
    console.log("filepath", filePath);

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    console.log("output path", outputPath);

    // 🔥 Fix: Run FFmpeg synchronously using await
    const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

    try {
      await execPromise(ffmpegCommand);
      console.log("FFmpeg processing completed.");
    } catch (ffmpegError) {
      console.error("FFmpeg Error:", ffmpegError);
      return null; // Stop execution if FFmpeg fails
    }

    const uploadedFiles = {};
    const files = fs.readdirSync(outputPath);

    for (const file of files) {
      const filePath = path.join(outputPath, file);
      console.log(`Uploading ${file}...`);

      const fileBuffer = fs.readFileSync(filePath);

      const { data, error } = await supabase.storage
        .from("hlsvideo")
        .upload(`${videoId}/${file}`, fileBuffer, {
          contentType: "video/mp2t",
          upsert: true, // Allow overwriting if file exists
        });

      if (error) {
        console.error("Upload error:", error);
      } else {
        console.log("Uploaded:", data);

        if (data && data.path) {
          // 🔥 Fix: Properly retrieve the public URL
          const publicUrl = supabase.storage
            .from("hlsvideo")
            .getPublicUrl(data.path).data.publicUrl;

          if (publicUrl) {
            uploadedFiles[file] = publicUrl;
            console.log(`Uploaded ${file}: ${publicUrl}`);
          } else {
            console.error(`Failed to retrieve public URL for: ${file}`);
          }
        } else {
          console.error(`Upload success, but no path returned for: ${file}`);
        }
      }
    }

    console.log("All HLS files uploaded successfully!", uploadedFiles);

    return {
      videoUrl: `http://localhost:3000/uploadvideo/video/${videoId}/index.m3u8`,
      indexM3U8Url: uploadedFiles["index.m3u8"],
      segmentUrls: uploadedFiles,
    };
  } catch (error) {
    console.error("Error in uploadVideoOnCloudinary:", error);
    return null;
  }
};


const uploadVideoOnSupabase1 = async (filePath) => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    const videoId = uuidv4();
    const baseOutputPath = `./uploadvideo/video/${videoId}`;
    const resolutions = [
      { label: "240p", height: 240, bitrate: 400 },
      { label: "360p", height: 360, bitrate: 800 },
      { label: "1080p", height: 1080, bitrate: 2500 },
    ];

    if (!fs.existsSync(baseOutputPath)) {
      fs.mkdirSync(baseOutputPath, { recursive: true });
    }

    const variantPlaylists = [];

    for (const { label, height, bitrate } of resolutions) {
      const resOutputPath = `${baseOutputPath}/${label}`;
      const hlsPath = `${resOutputPath}/index.m3u8`;

      if (!fs.existsSync(resOutputPath)) {
        fs.mkdirSync(resOutputPath, { recursive: true });
      }

      // const ffmpegCommand = `ffmpeg -i ${filePath} -vf scale=-2:${height} -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${resOutputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;
      const ffmpegCommand = `ffmpeg -i ${filePath} -vf "scale=trunc(iw*${height}/ih/2)*2:${height}" -c:v libx264 -preset veryfast -b:v ${bitrate}k -c:a aac -b:a 128k -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${resOutputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

      try {
        await execPromise(ffmpegCommand);
        console.log(`FFmpeg processing completed for ${label}`);
      } catch (ffmpegError) {
        console.error(`FFmpeg Error for ${label}:`, ffmpegError);
        return null;
      }

      const files = fs.readdirSync(resOutputPath);
      for (const file of files) {
        const filePathLocal = path.join(resOutputPath, file);
        const fileBuffer = fs.readFileSync(filePathLocal);

        const { data, error } = await supabase.storage
          .from("hlsvideo")
          .upload(`${videoId}/${label}/${file}`, fileBuffer, {
            contentType: "video/mp2t",
            upsert: true,
          });

        if (error) {
          console.error("Upload error:", error);
        } else {
          console.log(`Uploaded: ${file}`);
        }
      }

      const { data } = supabase.storage
        .from("hlsvideo")
        .getPublicUrl(`${videoId}/${label}/index.m3u8`);

      variantPlaylists.push({
        resolution: label,
        bandwidth: bitrate * 1000,
        url: data.publicUrl,
      });
    }

    const masterPlaylistContent = variantPlaylists
      .map((variant) => {
        const resNum = variant.resolution.replace("p", "");
        return `#EXT-X-STREAM-INF:BANDWIDTH=${variant.bandwidth},RESOLUTION=${resNum}x${resNum}\n${variant.url}`;
      })
      .join("\n");

    const masterPlaylistPath = `${baseOutputPath}/index.m3u8`;
    fs.writeFileSync(masterPlaylistPath, "#EXTM3U\n" + masterPlaylistContent);

    const masterFileBuffer = fs.readFileSync(masterPlaylistPath);

    const { data: masterData, error: masterError } = await supabase.storage
      .from("hlsvideo")
      .upload(`${videoId}/index.m3u8`, masterFileBuffer, {
        contentType: "application/vnd.apple.mpegurl",
        upsert: true,
      });

    if (masterError) {
      console.error("Upload error for master playlist:", masterError);
    }

    const { data: masterPublic } = supabase.storage
      .from("hlsvideo")
      .getPublicUrl(`${videoId}/index.m3u8`);

    console.log("All resolutions uploaded successfully");

    return {
      videoUrl: masterPublic.publicUrl,
      variantUrls: variantPlaylists,
    };
  } catch (error) {
    console.error("Error in uploadVideoOnSupabase:", error);
    return null;
  }
};
 export { uploadVideoOnCloudinary1, uploadOnCoudinary, uploadVideoOnSupabase,uploadVideoOnSupabase1 };