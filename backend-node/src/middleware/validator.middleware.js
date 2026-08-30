const { body, validationResult } = require('express-validator');

// Validation rules for the complete stop & QR scan endpoint
const validateStopRequest = [
  body('vehicleId')
    .notEmpty().withMessage('vehicleId is required')
    .isInt({ min: 1 }).withMessage('vehicleId must be a valid positive integer'),
    
  body('locationNodeId')
    .notEmpty().withMessage('locationNodeId is required')
    .isInt({ min: 100 }).withMessage('locationNodeId must be a valid campus node integer'),
    
  body('riderId')
    .optional() // Because manual stops won't send a riderId
    .isInt({ min: 1 }).withMessage('riderId must be a valid positive integer if provided'),

  // Intercept the request and check for errors before passing it to the controller
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Return 400 Bad Request immediately if validation fails
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payload data',
        details: errors.array() 
      });
    }
    next();
  }
];

module.exports = { validateStopRequest };