// Role-based access control middleware
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get user role
    const userRole = req.user.role;

    // Check if user role is allowed
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }

    // User has required role, proceed
    next();
  };
};

module.exports = roleMiddleware;