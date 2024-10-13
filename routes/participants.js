
const express = require("express");
const { validationResult } = require("express-validator");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const validateParticipant = require("../middleware/validateParticipant");

router.post("/add", auth, validateParticipant, async (req, res) => {
  console.log("Received POST /add request");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, firstname, lastname, dob, work, home } = req.body;
    console.log("Request body:", req.body);
    const connection = await pool.getConnection();
    console.log("Database connection acquired");
    await connection.beginTransaction();
    console.log("Transaction started");

    try {
      const [result] = await connection.query(
        "INSERT INTO participants (email, firstname, lastname, dob) VALUES (?, ?, ?, ?)",
        [email, firstname, lastname, dob]
      );
      const participantId = result.insertId;
      console.log("Inserted participant with ID:", participantId);

      await connection.query(
        "INSERT INTO work_details (participant_id, companyname, salary, currency) VALUES (?, ?, ?, ?)",
        [participantId, work.companyname, work.salary, work.currency]
      );
      console.log("Inserted work details for participant ID:", participantId);

      await connection.query(
        "INSERT INTO home_details (participant_id, country, city) VALUES (?, ?, ?)",
        [participantId, home.country, home.city]
      );
      console.log("Inserted home details for participant ID:", participantId);

      await connection.commit();
      console.log("Transaction committed");
      res
        .status(201)
        .json({ message: "Participant added successfully", participantId });
    } catch (error) {
      await connection.rollback();
      console.error("Error during transaction:", error);
      res.status(500).json({ error: "Failed to add participant" });
    } finally {
      connection.release();
      console.log("Database connection released");
    }
  } catch (error) {
    console.error("Error adding participant:", error);
    res.status(500).json({ error: "Failed to add participant" });
  }
});

router.get("/", auth, async (req, res) => {
  console.log("Received GET / request");
  try {
    console.log("Attempting to fetch participants from database");
    const [rows] = await pool.query(`
        SELECT p.*, w.companyname, w.salary, w.currency, h.country, h.city
        FROM participants p
        LEFT JOIN work_details w ON p.id = w.participant_id
        LEFT JOIN home_details h ON p.id = h.participant_id
      `);
    console.log("Fetched participants:", rows);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ error: "Failed to fetch participants" });
  }
});

router.get("/details", auth, async (req, res) => {
  console.log("Received GET /details request");
  try {
    const [rows] = await pool.query(
      "SELECT email, firstname, lastname FROM participants"
    );
    console.log("Fetched participant details:", rows);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching participant details:", error);
    res.status(500).json({ error: "Failed to fetch participant details" });
  }
});

router.get("/details/:email", auth, async (req, res) => {
  console.log("Received GET /details/:email request");
  try {
    const [rows] = await pool.query(
      "SELECT firstname, lastname, dob FROM participants WHERE email = ?",
      [req.params.email]
    );
    if (rows.length === 0) {
      console.log("Participant not found for email:", req.params.email);
      return res.status(404).json({ error: "Participant not found" });
    }
    console.log(
      "Fetched participant details for email:",
      req.params.email,
      rows[0]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching participant details:", error);
    res.status(500).json({ error: "Failed to fetch participant details" });
  }
});

router.get("/work/:email", auth, async (req, res) => {
  console.log("Received GET /work/:email request");
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
      console.log("Work details not found for email:", req.params.email);
      return res.status(404).json({ error: "Work details not found" });
    }
    console.log("Fetched work details for email:", req.params.email, rows[0]);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching work details:", error);
    res.status(500).json({ error: "Failed to fetch work details" });
  }
});

router.get("/home/:email", auth, async (req, res) => {
  console.log("Received GET /home/:email request");
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
      console.log("Home details not found for email:", req.params.email);
      return res.status(404).json({ error: "Home details not found" });
    }
    console.log("Fetched home details for email:", req.params.email, rows[0]);
    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching home details:", error);
    res.status(500).json({ error: "Failed to fetch home details" });
  }
});

router.delete("/:email", auth, async (req, res) => {
  console.log("Received DELETE /:email request");
  try {
    const [result] = await pool.query(
      "DELETE FROM participants WHERE email = ?",
      [req.params.email]
    );
    if (result.affectedRows === 0) {
      console.log("Participant not found for email:", req.params.email);
      return res.status(404).json({ error: "Participant not found" });
    }
    console.log("Deleted participant with email:", req.params.email);
    res.json({ message: "Participant deleted successfully" });
  } catch (error) {
    console.error("Error deleting participant:", error);
    res.status(500).json({ error: "Failed to delete participant" });
  }
});

router.put("/:email", auth, validateParticipant, async (req, res) => {
  console.log("Received PUT /:email request");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { firstname, lastname, dob, work, home } = req.body;
    console.log("Request body:", req.body);
    const connection = await pool.getConnection();
    console.log("Database connection acquired");
    await connection.beginTransaction();
    console.log("Transaction started");

    try {
      const [participantResult] = await connection.query(
        "UPDATE participants SET firstname = ?, lastname = ?, dob = ? WHERE email = ?",
        [firstname, lastname, dob, req.params.email]
      );

      if (participantResult.affectedRows === 0) {
        await connection.rollback();
        console.log("Participant not found for email:", req.params.email);
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
      console.log("Transaction committed");
      res.json({ message: "Participant updated successfully" });
    } catch (error) {
      await connection.rollback();
      console.error("Error during transaction:", error);
      res.status(500).json({ error: "Failed to update participant" });
    } finally {
      connection.release();
      console.log("Database connection released");
    }
  } catch (error) {
    console.error("Error updating participant:", error);
    res.status(500).json({ error: "Failed to update participant" });
  }
});

module.exports = router;
