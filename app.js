var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const basicAuth = require('express-basic-auth');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var participantsRouter = require('./routes/participants');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/participants', participantsRouter);

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true,
  }
});

// Authentication middleware
const auth = basicAuth({
  authorizer: async (username, password) => {
    const [rows] = await pool.query('SELECT * FROM admin_users WHERE username = ?', [username]);
    if (rows.length > 0) {
      const user = rows[0];
      return await bcrypt.compare(password, user.password);
    }
    return false;
  },
  authorizeAsync: true,
});

// Validation middleware
const validateParticipant = [
  body('email').isEmail(),
  body('firstname').notEmpty(),
  body('lastname').notEmpty(),
  body('dob').isDate({ format: 'YYYY-MM-DD' }),
  body('work.companyname').notEmpty(),
  body('work.salary').isNumeric(),
  body('work.currency').notEmpty(),
  body('home.country').notEmpty(),
  body('home.city').notEmpty(),
];

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'An unexpected error occurred' });
});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Initialize admin user
async function initAdminUser() {
  const adminUsername = 'admin';
  const adminPassword = 'P4ssword';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  try {
    await pool.query(
      'INSERT INTO admin_users (username, password) VALUES (?, ?) ON DUPLICATE KEY UPDATE password = ?',
      [adminUsername, hashedPassword, hashedPassword]
    );
    console.log('Admin user initialized');
  } catch (error) {
    console.error('Error initializing admin user:', error);
  }
}


initAdminUser();


module.exports = app;
