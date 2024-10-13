// Purpose: Validate the participant data before saving it to the database.
const { body } = require("express-validator");

module.exports = [
  body("email").isEmail(),
  body("firstname").notEmpty(),
  body("lastname").notEmpty(),
  body("dob").isDate(),
  body("work.companyname").notEmpty(),
  body("work.salary").isNumeric(),
  body("work.currency").notEmpty(),
  body("home.country").notEmpty(),
  body("home.city").notEmpty(),
];


