// app.js
require("dotenv").config();
const bcrypt = require("bcrypt");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const createError = require("http-errors");
const pool = require("./db");

const indexRouter = require("./routes/index");
const usersRouter = require("./routes/users");
const participantsRouter = require("./routes/participants");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/participants", participantsRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "An unexpected error occurred" });
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// Initialize admin user
async function initAdminUser() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) {
    throw new Error(
      "Admin username or password not set in environment variables"
    );
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  try {
    await pool.query(
      "INSERT INTO admin_users (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = ?",
      [adminUsername, hashedPassword, hashedPassword]
    );
    console.log("Admin user initialized");
  } catch (error) {
    console.error("Error initializing admin user:", error);
  }
}

// Initialize database structure
async function initDatabase() {
  const conn = await pool.getConnection();
  try {
    // Create admin_users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Create participants table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        firstname VARCHAR(255) NOT NULL,
        lastname VARCHAR(255) NOT NULL,
        dob DATE NOT NULL
      )
    `);

    // Create work_details table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS work_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        participant_id INT,
        companyname VARCHAR(255) NOT NULL,
        salary DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
      )
    `);

    // Create home_details table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS home_details (
        id INT AUTO_INCREMENT PRIMARY KEY,
        participant_id INT,
        country VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
      )
    `);

    console.log("Database structure initialized successfully");
  } catch (error) {
    console.error("Error initializing database structure:", error);
  } finally {
    conn.release();
  }
}

(async () => {
  try {
    await initDatabase();
    await initAdminUser();
  } catch (error) {
    console.error("Failed to initialize application:", error);
    process.exit(1);
  }
})();

module.exports = app;
