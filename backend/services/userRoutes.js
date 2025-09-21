const express = require('express');
const router = express.Router();
const axios = require('axios');
const upload = require("../config/multerConfig")
const db = require('../config/dbConfig');
const { sendNotification } = require("./firebaseMessaging");
const { verifyIssue } = require('./IssueVerification');
const { uploadToCloudinary } = require("./UploadToCloudinary")
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const getUserToken = async (id) => {
  try {
    const [rows] = await db.query("SELECT token FROM users WHERE id = ?", [id]);
    if (rows.length > 0) return rows[0].token;
    return null;
  } catch (err) {
    console.error(err);
  }
}

router.post('/sendNotification', async (req,res) => {
  const {Rid, userId, name} = req.body;
  const token = await getUserToken(userId);
  if (token) {
    await sendNotification(token, "Your report is raised", `Report ${Rid} raised succesfully. Awaiting verification.`)
    return res.json({success:true})
  } 
  res.json({success:false, message:"Token not found,"})
})


router.post(
  "/submitReport",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        reportID,
        userID,
        name,
        number,
        category,
        description,
        location,
        createdDate,
      } = req.body;

      const imageFile = req.files.image[0];
      const base64 = imageFile.buffer.toString("base64");
      const response = await verifyIssue(base64, "image/jpeg", category);
      const status = response.score > 60 ? "Issue Raised" : response.score > 5 ? "Verification pending" : "Invalid Report"
      let imageURL = null,
        audioURL = null,
        pdfURL = null;

      imageURL = (
        await uploadToCloudinary(
          imageFile.buffer,
          `${reportID}_image`,
          imageFile.mimetype.startsWith("image/") ? "image" : "auto",
          reportID
        )
      ).secure_url;

      // Handle audio (file via multer)
      if (req.files?.audio) {
        const audioFile = req.files.audio[0];
        audioURL = (
          await uploadToCloudinary(
            audioFile.buffer,
            `${reportID}_audio`,
            "audio",
            reportID
          )
        ).secure_url;
      }

      // Handle PDF (file via multer ✅)
      if (req.files?.pdf) {
        const pdfFile = req.files.pdf[0];
        pdfURL = (
          await uploadToCloudinary(
            pdfFile.buffer,
            `${reportID}_pdf`,
            "pdf",
            reportID
          )
        ).secure_url;
      }

      // Save report data in DB
      const query = `
        INSERT INTO reports 
        (Rid, priority, userID, issue, description, location, createdAt, imageURL, audioURL, pdfURL, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.query(query, [
        reportID,
        null,
        userID,
        category,
        description,
        location, // location is JSON stringified from frontend
        createdDate,
        imageURL,
        audioURL,
        pdfURL,
        status
      ]);
      const token = await getUserToken(userID);
      if (status === "Issue Raised") {

        await sendNotification(token, "Your report has been verified.", `Report ${reportID} has been verified succesfully. It will be resolved within 10 days.`)
      } else if (status === "Invalid Report") {
        await sendNotification(token, "Your report is invalid.", `Report ${reportID} did not show the mentioned issue. Please resubmit with a clearer photo.`)

      }
      res.json({
        success: true,
        message: "Report submitted successfully",
        data: {
          reportID,
          userID,
          name,
          number,
          category,
          description,
          location,
          createdDate,
          imageURL,
          audioURL,
          pdfURL,
        },
      });
    } catch (err) {
      console.error("Error submitting report:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);


// Step 1: Send OTP
router.post('/sendOTP', async (req, res) => {
  const { phone, name, token } = req.body;

  if (!phone || !token) {
    return res.status(400).json({ success: false, message: 'Phone and push token are required' });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  try {
    await db.execute(
      `INSERT INTO otps (phone, otp, expiresAt) VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE otp = ?, expiresAt = ?`,
      [phone, otp, expiresAt, otp, expiresAt]
    );

    await sendNotification(token, "OTP for ReportR", `Your OTP is ${otp}`)
    res.status(200).json({success: true})
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to send OTP' });
  }
});

// Step 2: Verify OTP
router.post('/verifyOTP', async (req, res) => {
  const { phone, otp, name, token } = req.body;
  if (!phone || !otp || !name) {
    return res.status(400).json({ success: false, message: 'Phone, OTP, and name are required' });
  }

  try {
    const [rows] = await db.execute(
      `SELECT * FROM otps WHERE phone = ? AND otp = ? AND expiresAt > NOW()`,
      [phone, otp]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: 'Invalid or expired OTP' });
    }

    const [result] = await db.execute(
      `INSERT INTO users (name, number, createdAt, token) VALUES (?, ?, ?, ?)`,
      [name, phone, new Date(), token]
    );

    await db.execute(`DELETE FROM otps WHERE phone = ?`, [phone]);

    res.json({
      success: true,
      user: { id: result.insertId, name, phone },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to verify OTP' });
  }
});


router.post("/getUserName", async (req, res) => {
  const { id } = req.body;
  try {
    const [rows] = await db.query("SELECT name, number FROM users WHERE id = ?", [id]);
    if (rows.length > 0) return res.json({ name: rows[0].name, number: rows[0].number });
    res.json({ name: "", number: "" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ name: "" });
  }
});

module.exports = router;
