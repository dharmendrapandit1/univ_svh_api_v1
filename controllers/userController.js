// controllers/userController.js

import dotenv from 'dotenv'
dotenv.config()
import User from '../models/User.js'

// Unified login for all roles
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.',
      })
    }

    let isPasswordValid = true
    if (user.password) {
      isPasswordValid = await user.correctPassword(password)
    } else if (user.subscriptionType === 'free') {
      isPasswordValid = true
    }

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      })
    }

    const token = user.getSignedJwtToken()

    // Set HTTP-only cookie with better configuration
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed from 'strict' for better compatibility
    }

    res.cookie('token', token, cookieOptions)

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionType: user.subscriptionType,
        guestId: user.guestId,
      },
      message: 'Login successful',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Admin registration with secret key
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, secretKey } = req.body

    if (!secretKey || secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing admin secret key',
      })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      })
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: 'admin',
      subscriptionType: 'paid',
      isActive: true,
      verifiedBySecretCode: true,
    })

    const token = admin.getSignedJwtToken()

    // Set HTTP-only cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    }

    res.cookie('token', token, cookieOptions)

    res.status(201).json({
      success: true,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
      message: 'Admin account created successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Counselor registration with secret key
export const registerCounselor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      bio,
      expertise,
      qualifications,
      experience,
      secretKey,
    } = req.body

    if (!secretKey || secretKey !== process.env.COUNSELOR_SECRET_CODE) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or missing counselor secret key',
      })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      })
    }

    const counselor = await User.create({
      name,
      email,
      password,
      role: 'counselor',
      subscriptionType: 'paid',
      isActive: true,
      verifiedBySecretCode: true,
      profile: { bio },
      counselorProfile: {
        expertise: expertise || [],
        qualifications: qualifications || '',
        experience: experience || 0,
        isVerified: false,
        availability: [],
      },
    })

    const token = counselor.getSignedJwtToken()

    // Set HTTP-only cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    }

    res.cookie('token', token, cookieOptions)

    res.status(201).json({
      success: true,
      user: {
        id: counselor._id,
        name: counselor.name,
        email: counselor.email,
        role: counselor.role,
      },
      message: 'Counselor account created successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Student/User registration
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      subscriptionType = 'free',
      role = 'user',
    } = req.body

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      })
    }

    const userData = {
      name,
      email,
      subscriptionType,
      role,
      isActive: true,
    }

    // Add password for all roles (required for login)
    if (password) {
      userData.password = password
    }

    const user = await User.create(userData)
    const token = user.getSignedJwtToken()

    // Set HTTP-only cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    }

    res.cookie('token', token, cookieOptions)

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscriptionType: user.subscriptionType,
      },
      message:
        role === 'counselor'
          ? 'Counselor account created successfully'
          : 'Account created successfully',
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      })
    }

    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Create guest user
export const createGuestUser = async (req, res) => {
  try {
    const guestId = User.generateGuestId()

    const guestUser = await User.create({
      guestId,
      role: 'user',
      subscriptionType: 'free',
      isActive: true,
      name: `Guest_${guestId.slice(-6)}`,
    })

    const token = guestUser.getSignedJwtToken()

    // Set HTTP-only cookie
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    }

    res.cookie('token', token, cookieOptions)

    res.status(201).json({
      success: true,
      user: {
        id: guestUser._id,
        guestId: guestUser.guestId,
        name: guestUser.name,
        role: guestUser.role,
        subscriptionType: guestUser.subscriptionType,
      },
      message: 'Guest session created successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Logout user
export const logout = async (req, res) => {
  try {
    // Clear the HTTP-only cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds from now
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    res.status(200).json({
      success: true,
      message: 'User logged out successfully',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Get user profile
export const getProfile = async (req, res) => {
  try {
    req.user?.email || 'Unknown'

    const user = await User.findById(req.user.id).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      })
    }

    res.status(200).json({
      success: true,
      data: user,
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, email, profile, education } = req.body

    const updateData = {}
    if (name) updateData.name = name
    if (email) updateData.email = email
    if (profile) updateData.profile = { ...req.user.profile, ...profile }
    if (education)
      updateData.education = { ...req.user.education, ...education }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password')

    res.status(200).json({
      success: true,
      data: user,
      message: 'Profile updated successfully',
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists',
      })
    }

    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

// Add a debug endpoint to check cookies
export const debugCookies = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      cookies: req.cookies,
      headers: {
        cookie: req.headers.cookie,
        authorization: req.headers.authorization,
      },
      message: 'Cookie debug information',
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
