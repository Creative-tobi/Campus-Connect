const User = require("../models/User.model");

const VALID_ROLES = ["user", "admin", "moderator"];

const roleMiddleware = (allowedRoles) => {
  // Validate roles parameter
  if (!Array.isArray(allowedRoles)) {
    throw new Error("allowedRoles parameter must be an array");
  }

  // Validate that all provided roles are valid
  if (!allowedRoles.every((role) => VALID_ROLES.includes(role.toLowerCase()))) {
    throw new Error(
      `Invalid role provided. Valid roles are: ${VALID_ROLES.join(", ")}`
    );
  }

  return async (req, res, next) => {
    try {
      // Check if user exists and has auth token
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      // Get fresh user data from database
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if user has a role assigned
      if (!user.role) {
        return res.status(400).json({
          success: false,
          message: "User role not defined",
        });
      }

      const userRole = user.role.toLowerCase();

      // Check if user's role is authorized
      if (allowedRoles.includes(userRole)) {
        // Add user data to request for use in subsequent middleware/routes
        req.userData = {
          id: user._id,
          role: userRole,
          email: user.email,
        };
        next();
      } else {
        return res.status(403).json({
          success: false,
          message: `Access forbidden. Required roles: ${allowedRoles.join(
            ", "
          )}`,
        });
      }
    } catch (error) {
      console.error("Error in role middleware:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  };
};

module.exports = roleMiddleware;
