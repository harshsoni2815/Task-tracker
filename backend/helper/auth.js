const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Get token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token missing" });
    }
    

    const token = authHeader.split(" ")[1]; // Extract token

    // Verify token using your secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your actual secret here
    
    // Attach user info to request object (if needed)
    req.user = decoded;

    // Proceed to next middleware or route handler
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
