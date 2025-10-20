import dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

// Route imports
import userRoutes from './routes/users.js'
import courseRoutes from './routes/courses.js'
import paymentRoutes from './routes/payments.js'
import notesRoutes from './routes/notes.js'
import counselingRoutes from './routes/counseling.js'
import adminRoutes from './routes/admin.js'
import wishlistRoutes from './routes/wishlist.js'
import contactRoutes from './routes/contact.js'
import uploadRoutes from './routes/upload.js'

import { startCronJobs } from './services/cronJobs.js'
import connectDB from './config/database.js'

const app = express()

// CORS configuration - FIXED VERSION
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000', // Your frontend URL
  credentials: true, // Allow cookies and authentication headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.use(cookieParser())

// Health check route - should work without body parsing
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: corsOptions.origin,
      credentials: corsOptions.credentials,
    },
  })
})

// Apply JSON parsing to all routes EXCEPT webhooks
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next() // Webhook route will use raw body parser
  } else {
    express.json({ limit: '10mb' })(req, res, next)
  }
})

app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/users', userRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/payments', paymentRoutes) // Webhook route inside here handles raw body
app.use('/api/notes', notesRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/counseling', counselingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/contact', contactRoutes)

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to univ SVH api_v1')
})

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
})

// Initialize application
const startServer = async () => {
  try {
    // Connect to database first
    await connectDB()

    // Start cron jobs
    startCronJobs()

    // Start server
    const PORT = process.env.PORT || 5000
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`CORS configured for: http://localhost:3000`)
      console.log(`Health check: http://localhost:${PORT}/api/health`)
    })
  } catch (error) {
    process.exit(1)
  }
}

// Start the server
startServer()

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
  })
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  process.exit(1)
})

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  process.exit(0)
})

export default app
