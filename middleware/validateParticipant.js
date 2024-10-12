const { body } = require('express-validator');

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

  module.exports = validateParticipant;


