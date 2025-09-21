const express = require("express");
const router = express.Router();
const db = require("../config/dbConfig")

router.get("/getAllReports", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT Rid, location, status FROM reports");
    let markers = []
    rows.map((r) => {
      const color = r.status === "Invalid Report" ? "rgba(197, 0, 0, 1)" 
      : r.status === "In Progress" ? "rgba(255, 187, 0, 1)"
      : r.status === "Resolved" ? "rgba(0, 165, 6, 1)"
      : r.status === "Issue Raised" ? "rgba(40, 0, 121, 1)"
      : r.status === "Verification pending" ? "rgba(0, 0, 0, 1)" 
      : "rgb(255,255,255)"
      markers.push({
        Rid: r.Rid,
        lat: JSON.parse(r.location).lat,
        lng: JSON.parse(r.location).lng,
        status: r.status,
        color: color
      })
    })
    res.json(markers);
  } catch (err) {
    console.error(err);
  }
})

router.post("/getReportData", async (req, res) => {
  const { Rid } = req.body;
  try {
    const [rows] = await db.query("SELECT issue, description, imageURL, createdAt, status FROM reports WHERE Rid = ?", [Rid]);
    const rawDate = rows[0].createdAt; // "2025-09-20 20:18:42"
    const properDate = new Date(rawDate + "Z"); // force UTC
    rows[0].createdAt = properDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    return res.json(rows[0]);
  } catch (err) {
    console.error(err);
  }
})

module.exports = router;