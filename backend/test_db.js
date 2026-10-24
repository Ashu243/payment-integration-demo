
require("dotenv").config();

const pool = require("./config/db");

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database(), NOW()"
    );

    console.log("Database connected:", result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error.message);
  } finally {
    await pool.end();
  }
}

testConnection();
