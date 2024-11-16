const express = require("express");
const bcrypt = require("bcryptjs");
const connection = require("./db/db");
const cors = require("cors");
const query = require("./helper/dbhelper");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./helper/auth");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.get("/test", (req, res) => {
  res.json("working");
});

// Signup Route
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  console.log("Received signup request:", username, password);

  try {
    // Check if the user already exists
    const [existingUser] = await connection.execute(
      "SELECT * FROM id WHERE username = ?",
      [username]
    );

    if (existingUser.length > 0) {
      console.log("User already exists");
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Password hashed:", hashedPassword);

    // Insert user into the database
    const [result] = await connection.execute(
      "INSERT INTO id (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );
    
    const u_id = result.insertId;

    // Generate a JWT token
    const token = jwt.sign({ id:u_id,username }, process.env.JWT_SECRET, { expiresIn: "2h" });

    // Send success message with token
    res.status(201).json({ message: "User registered successfully", token });
  } catch (error) {
    console.error("Error in signup route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(username, password);

  try {
    // Check if the user exists
    const [user] = await connection.execute(
      "SELECT * FROM id WHERE username = ?",
      [username]
    );

    if (user.length === 0) {
      console.log("User not found");
      return res.status(400).json({ error: "Invalid username or password" });
    }

    const userData = user[0];

    // Compare the password with the hashed password
    const passwordMatch = await bcrypt.compare(password, userData.password);

    if (!passwordMatch) {
      console.log("Invalid password");
      return res.status(400).json({ error: "Invalid username or password" });
    }

    // Passwords match, login successful
    console.log("User logged in successfully");

    const TOKEN = await jwt.sign(
      { id: userData.u_id, username: userData.username },
      process.env.JWT_SECRET || "your_jwt_secret", // Use an environment variable for the secret
      { expiresIn: "2h" } // Token expires in 1 hour
    );

    res.status(200).json({ message: "Login successful", TOKEN });
  } catch (error) {
    console.error("Error in login route:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/task/show", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const page = parseInt(req.query.page) || 0;
    const limit = 10; // Number of tasks per page
    const offset = page * limit;

    // Fetch tasks for the specific page
    const [tasks] = await connection.execute(
      `SELECT * FROM task WHERE u_id = ? ORDER BY task_id DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    // Fetch total task count
    const [result] = await connection.execute(
      `SELECT COUNT(*) AS task_count FROM task WHERE u_id = ?`,
      [userId]
    );

    // Send both tasks and task count in the response
   res.status(200).json({ tasks, taskCount: result[0].task_count }); 
   // res.status(200).json( tasks); 
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

app.get("/task/search", authMiddleware, async (req, res) => {
  const userId = req.user.id; 
  const search = req.query.search || ''; 
  const page = parseInt(req.query.page) || 0; // Get page number, default to 0
  const limit = 10; // Set limit per page
  const offset = page * limit; // Calculate offset based on page

  try {
    // Execute search query with pagination
    const [tasks] = await connection.execute(
      `SELECT * FROM task WHERE u_id = ? AND task LIKE CONCAT('%', ?, '%') ORDER BY task_id LIMIT ? OFFSET ?`,
      [userId, search, limit, offset]
    );
   
    const [result] = await connection.execute(
      `SELECT COUNT(*) AS taskCount FROM task WHERE u_id = ? AND task LIKE CONCAT('%', ?, '%')`,
      [userId, search]
    );
    
    res.status(200).json({ tasks, taskCount: result[0].taskCount });// Send search results as JSON
  } catch (error) {
    console.error("Error searching tasks:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/task/add", authMiddleware, async (req, res) => {
  const { name } = req.body;
  // Logging the token payload for debugging

  try {
    const [result] = await connection.execute(
      "INSERT INTO task (u_id, task) VALUES (?, ?)",
      [req.user.id, name]
    );

    // Send back a response with the inserted task details if needed
    res.status(201).json({
      message: "Data saved successfully",
      task: { u_id: req.user.id, task: name },
    });
  } catch (error) {
    console.error("Error saving data:", error.message);
    res.status(500).json({ message: "Failed to save data" });
  }
});

app.delete("/task/delete/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the task data to check if it exists and belongs to the current user
    const [result] = await connection.execute(
      "SELECT * FROM task WHERE task_id = ?",
      [id]
    );

    // Check if task exists
    if (result.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Check if the task belongs to the current user
    if (result[0].u_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Forbidden: unauthorized access" });
    }

    // Delete the task
    await connection.execute("DELETE FROM task WHERE task_id = ?", [id]);
    return res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

app.put("/task/update/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Check if task exists and belongs to the user
    const [result] = await connection.execute(
      "SELECT * FROM task WHERE task_id = ?",
      [id]
    );

    if (result.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (result[0].u_id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Forbidden: Unauthorized access" });
    }

    // Update the task
    await connection.execute("UPDATE task SET task = ? WHERE task_id = ?", [
      name,
      id,
    ]);

    return res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    console.error("Error updating task:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
