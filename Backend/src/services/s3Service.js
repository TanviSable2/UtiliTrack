const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");

async function uploadToS3(file, key) {
  if (!file || !file.buffer) return null;

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });



  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "utilitrack/meter-photos",
        public_id: key.replace(/\//g, "_"),
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
          return reject(error);
        }
        resolve(result.secure_url);
      }
    );

    const stream = Readable.from(file.buffer);
    stream.pipe(uploadStream);
  });
}

module.exports = { uploadToS3 };