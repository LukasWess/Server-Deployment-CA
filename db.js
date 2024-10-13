
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
  connectTimeout: 10000, // Increase connection timeout to 10 seconds
});

pool.getConnection()
  .then(connection => {
    console.log('Database connection established');
    connection.release();
  })
  .catch(error => {
    console.error('Error establishing database connection:', error);
  });

module.exports = pool;