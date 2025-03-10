const mysql = require("mysql2/promise");
require("dotenv").config();
const pool = mysql.createPool({
  user: "nafedtra_admin",
  password: "Mlnuco1#_7=D",
  host: "earth.hostitbro.com",
  port: "3306",
  database: "nafedtra_training",
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
});
pool
  .getConnection()
  .then((connection) => {
    console.log("Database connected successfully");
    connection.release(); // Release the connection back to the pool
  })
  .catch((err) => {
    console.error("Error connecting to the database:", err.message);
  });
module.exports = pool;
