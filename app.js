var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const { body } = require("express-validator");
require("dotenv").config();

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var participantsRouter = require("./routes/participants");

var app = express();

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

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false
  },
});

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
  const adminUsername = "admin";
  const adminPassword = "P4ssword";
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

    console.log('Database structure initialized successfully');
  } catch (error) {
    console.error('Error initializing database structure:', error);
  } finally {
    conn.release();
  }
}

(async () => {
  try {
    await initDatabase();
    await initAdminUser();
    ;
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
})();

module.exports = app;
