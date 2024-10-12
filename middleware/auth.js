const basicAuth = require('express-basic-auth');
const bcrypt = require('bcrypt');






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


module.exports = auth;