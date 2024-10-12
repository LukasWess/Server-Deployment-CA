const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth.js');
const app = express();
const { validationResult } = require('express-validator');
const validateParticipant = require('../middleware/validateParticipant.js');

app.post("/participants/add", auth, validateParticipant, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, firstname, lastname, dob, work, home } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [result] = await connection.query(
        "INSERT INTO participants (email, firstname, lastname, dob) VALUES (?, ?, ?, ?)",
        [email, firstname, lastname, dob]
      );
      const participantId = result.insertId;

      await connection.query(
        "INSERT INTO work_details (participant_id, companyname, salary, currency) VALUES (?, ?, ?, ?)",
        [participantId, work.companyname, work.salary, work.currency]
      );

      await connection.query(
        "INSERT INTO home_details (participant_id, country, city) VALUES (?, ?, ?)",
        [participantId, home.country, home.city]
      );

      await connection.commit();
      res
        .status(201)
        .json({ message: "Participant added successfully", participantId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error adding participant:", error);
    res.status(500).json({ error: "Failed to add participant" });
  }
});

app.get("/participants", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
        SELECT p.*, w.companyname, w.salary, w.currency, h.country, h.city
        FROM participants p
        LEFT JOIN work_details w ON p.id = w.participant_id
        LEFT JOIN home_details h ON p.id = h.participant_id
      `);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

app.get("/participants/details", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT email, firstname, lastname FROM participants"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error fetching participant details:", error);
    res.status(500).json({ error: "Failed to fetch participant details" });
  }
});

app.get("/participants/details/:email", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT firstname, lastname, dob FROM participants WHERE email = ?",
      [req.params.email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching participant details:", error);
    res.status(500).json({ error: "Failed to fetch participant details" });
  }
});

app.get("/participants/work/:email", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT w.companyname, w.salary, w.currency
        FROM work_details w
        JOIN participants p ON w.participant_id = p.id
        WHERE p.email = ?
      `,
      [req.params.email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Work details not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching work details:", error);
    res.status(500).json({ error: "Failed to fetch work details" });
  }
});

app.get("/participants/home/:email", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT h.country, h.city
        FROM home_details h
        JOIN participants p ON h.participant_id = p.id
        WHERE p.email = ?
      `,
      [req.params.email]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Home details not found" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching home details:", error);
    res.status(500).json({ error: "Failed to fetch home details" });
  }
});

app.delete("/participants/:email", auth, async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM participants WHERE email = ?",
      [req.params.email]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Participant not found" });
    }
    res.json({ message: "Participant deleted successfully" });
  } catch (error) {
    console.error("Error deleting participant:", error);
    res.status(500).json({ error: "Failed to delete participant" });
  }
});

app.put("/participants/:email", auth, validateParticipant, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { firstname, lastname, dob, work, home } = req.body;
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      const [participantResult] = await connection.query(
        "UPDATE participants SET firstname = ?, lastname = ?, dob = ? WHERE email = ?",
        [firstname, lastname, dob, req.params.email]
      );

      if (participantResult.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: "Participant not found" });
      }

      await connection.query(
        `
          UPDATE work_details w
          JOIN participants p ON w.participant_id = p.id
          SET w.companyname = ?, w.salary = ?, w.currency = ?
          WHERE p.email = ?
        `,
        [work.companyname, work.salary, work.currency, req.params.email]
      );

      await connection.query(
        `
          UPDATE home_details h
          JOIN participants p ON h.participant_id = p.id
          SET h.country = ?, h.city = ?
          WHERE p.email = ?
        `,
        [home.country, home.city, req.params.email]
      );

      await connection.commit();
      res.json({ message: "Participant updated successfully" });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating participant:", error);
    res.status(500).json({ error: "Failed to update participant" });
  }
});

module.exports = router;
