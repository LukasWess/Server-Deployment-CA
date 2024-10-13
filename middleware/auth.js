const basicAuth = require("express-basic-auth");
const bcrypt = require("bcrypt");
const pool = require("../db"); // Import the pool from db.js

// Authentication middleware
const auth = basicAuth({
  authorizer: async (username, password, cb) => {
    console.log("Authenticating user:", username);
    try {
      const [rows] = await pool.query(
        "SELECT * FROM admin_users WHERE username = ?",
        [username]
      );
      if (rows.length > 0) {
        const user = rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);
        console.log("Password valid:", isPasswordValid);
        cb(null, isPasswordValid);
      } else {
        console.log("User not found");
        cb(null, false);
      }
    } catch (error) {
      console.error("Error during authentication:", error);
      cb(null, false);
    }
  },
  authorizeAsync: true,
  unauthorizedResponse: (req) => {
    return "Unauthorized";
  },
});

module.exports = auth;