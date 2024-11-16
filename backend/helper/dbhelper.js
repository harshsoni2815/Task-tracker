// dbHelper.js
const connection = require("../db/db");

const query = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (error, results) => {
      if (error) {
        return reject(error);
      }
      return resolve(results);
    });
  });
};

module.exports = query;
