// Middleware to allow only admin
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
      })
    }

    next()
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in admin verification',
    })
  }
}

// Middleware to check if user is admin or owner of the resource
export const requireAdminOrOwner = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      })
    }

    if (
      req.user.role !== 'admin' &&
      req.user._id.toString() !== req.params.userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      })
    }

    next()
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authorization',
    })
  }
}
