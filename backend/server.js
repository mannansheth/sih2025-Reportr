const express = require("express")
const axios = require("axios")
const dotenv = require("dotenv")
const cors = require("cors")
const { detectIssues } = require("./services/IssueDetection")
const upload = require("./config/multerConfig")
const { transcribeAudio } = require("./services/Transcribe")
const dbRoutes = require("./services/dbFunctions")
const fs = require("fs")
dotenv.config()
const {
  PORT
} = process.env;
const app = express()
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use('/api/user', dbRoutes);

app.post("/api/transcribeDescription", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file received' });
    }
    
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Received empty audio file' });
    }
    const result = await transcribeAudio(
      req.file.buffer
    )
    fs.unlinkSync("temp.mp3");
    res.json({success:true, result:result});
  } catch (err) {
    console.error(err);
    fs.unlinkSync("temp.mp3");
    res.status(200).json({success:false});
  }
})

app.post("/api/getPredictions", async (req, res) => {
  const { base64Image, mimeType } = req.body;
  try {
    const predictions = await detectIssues(base64Image, mimeType);
    res.json(predictions);
  } catch (err) {
    console.error(err)
    res.status(500);
  }
})
app.listen(PORT || 5002, () => {
    console.log("Started");
})