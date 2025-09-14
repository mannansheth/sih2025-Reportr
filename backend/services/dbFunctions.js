const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/dbConfig'); // your mysql connection

// POST /api/createUser
router.post('/createUser', async (req, res) => {
  try {
    const { name, phone } = req.body;

    // Generate a unique username (can also be random string)
    const username = 'anon_' + uuidv4().slice(0, 8);

    // Insert new user into DB
    const [result] = await db.execute(
      `INSERT INTO users (username, name, number, createdAt) VALUES (?, ?, ?, ?)`,
      [username, name || null, phone || null, new Date()]
    );

    // Return user id and username
    res.json({
      success: true,
      user: {
        id: result.insertId,
        username,
        name: name || null,
        phone: phone || null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
});
router.post("/getUserName", async (req, res) => {
  const {id} = req.body;
  try {
    const [rows] = await db.query("SELECT name, username FROM users WHERE id = ?", [id]);
    if (rows[0].name) {
      res.json({ name : rows[0].name })
    }  else {
      res.json({ name: rows[0].username})
    }
  } catch (err) {
    console.error(err);
  }
})
module.exports = router;
