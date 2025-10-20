import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const authenticate = async (req, res, next) => {
  try {
    let token

    req.method, req.originalUrl

    // Check for token in HTTP-only cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token
    }
    // Fallback to Authorization header (for backward compatibility)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
      // Check for guest user
      if (req.headers.guestid) {
        req.user = { guestId: req.headers.guestid, role: 'guest' }
        return next()
      }

      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select('-password')

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      })
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      })
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
      })
    }

    return res.status(401).json({
      success: false,
      message: 'Not authorized, authentication failed',
    })
  }
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      })
    }

    if (!roles.includes(req.user.role)) {
      console.log(
        ' User not authorized. Role:',
        req.user.role,
        'Required:',
        roles
      )
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      })
    }

    next()
  }
}

export const optionalAuth = async (req, res, next) => {
  try {
    let token

    // Check for token in HTTP-only cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token
      console.log('Token found in cookies for optional auth')
    }
    // Fallback to Authorization header
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1]
      console.log(' Token found in Authorization header for optional auth')
    }

    if (token) {
      console.log(' Verifying token for optional auth...')
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')

      if (user && user.isActive) {
        console.log(' Optional auth - User authenticated:', user.email)
        req.user = user
      } else {
        console.log(' Optional auth - User not found or inactive')
      }
    } else if (req.headers.guestid) {
      console.log(' Optional auth - Guest user detected:', req.headers.guestid)
      req.user = { guestId: req.headers.guestid, role: 'guest' }
    } else {
      console.log('ℹOptional auth - No authentication provided')
    }

    next()
  } catch (error) {
    console.log(
      'Optional auth - Token verification failed, continuing without user:',
      error.message
    )
    // If token is invalid, just continue without user
    next()
  }
}

// Add a new middleware to debug authentication issues
export const debugAuth = (req, res, next) => {
  console.log('DEBUG AUTH MIDDLEWARE')
  console.log('URL:', req.originalUrl)
  console.log('Method:', req.method)
  console.log('Cookies:', req.cookies)
  console.log('Headers:', {
    authorization: req.headers.authorization,
    guestid: req.headers.guestid,
    'content-type': req.headers['content-type'],
  })
  console.log('Body keys:', Object.keys(req.body))
  next()
}
