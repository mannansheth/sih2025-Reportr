const cloudinary = require("../config/cloudinaryConfig");

const uploadToCloudinary = async (file, filename, type, Rid) => {
  let fileBuffer;
  if (type === "image" && typeof file === "string" && file.startsWith("data:")) {
    const base64Data = file.split(",")[1]; // remove "data:image/png;base64,"
    fileBuffer = Buffer.from(base64Data, "base64");
  } else {
    fileBuffer = file; // already a Buffer
  }

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
        public_id: filename.split(".")[0],
        folder: `reportr/reports/${Rid}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(fileBuffer);
  });
};

module.exports = { uploadToCloudinary };
