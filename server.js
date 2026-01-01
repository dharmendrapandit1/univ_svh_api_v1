import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

// -------------------- DATABASE & CRON --------------------
import connectDB from './config/database.js'
import { startCronJobs } from './services/cronJobs.js'

// -------------------- ROUTE IMPORTS --------------------
import userRoutes from './routes/users.js'
import courseRoutes from './routes/courses.js'
import paymentRoutes from './routes/payments.js'
import notesRoutes from './routes/notes.js'
import counselingRoutes from './routes/counseling.js'
import adminRoutes from './routes/admin.js'
import wishlistRoutes from './routes/wishlist.js'
import contactRoutes from './routes/contact.js'
import uploadRoutes from './routes/upload.js'
import quizRoutes from './routes/quiz.js'
import notificationRoutes from './routes/notifications.js'
import statsRoutes from './routes/stats.js'

const app = express()

// -------------------- ✅ COOKIE PARSER --------------------
app.use(cookieParser())

// -------------------- ✅ CORS CONFIGURATION --------------------
const allowedOrigins = [
  'http://localhost:5173', // Vite local dev
  'http://localhost:3000', // Optional fallback
  process.env.CLIENT_URL, // Production
].filter(Boolean)

// Normalize to prevent trailing slash mismatch
const normalizedOrigins = allowedOrigins.map((origin) =>
  origin.endsWith('/') ? origin.slice(0, -1) : origin
)

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true)

    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin

    if (normalizedOrigins.includes(normalizedOrigin)) {
      callback(null, true)
    } else {
      console.log(`🚫 CORS blocked: ${origin}`)
      // In production, you might want to be more restrictive
      if (process.env.NODE_ENV === 'production') {
        callback(new Error(`CORS policy: Origin ${origin} not allowed`))
      } else {
        // In development, allow all origins for testing
        callback(null, true)
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'guestid',
    'x-razorpay-signature', // Important for webhooks
  ],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag'],
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))

// -------------------- ✅ BODY PARSING --------------------
// Important: Webhook must use raw body, others use JSON
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    // Raw body for webhooks (Razorpay signature verification)
    express.raw({ type: 'application/json' })(req, res, next)
  } else {
    // JSON for all other routes
    express.json({ limit: '10mb' })(req, res, next)
  }
})

app.use(express.urlencoded({ extended: true }))

// -------------------- ✅ REQUEST LOGGING MIDDLEWARE --------------------
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`)
  next()
})

// -------------------- ✅ HEALTH CHECK --------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    cors: {
      allowedOrigins,
      credentials: true,
    },
    services: {
      database: 'Connected',
      payments: 'Razorpay Integrated',
      upload: 'ImageKit Ready',
    },
  })
})

// -------------------- ✅ ROUTES --------------------
app.use('/api/users', userRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/counseling', counselingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/wishlist', wishlistRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/quiz', quizRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/stats', statsRoutes)

// -------------------- ✅ PAYMENT WEBHOOK TEST ENDPOINT --------------------
// Useful for testing webhooks locally
if (process.env.NODE_ENV !== 'production') {
  app.post(
    '/api/test-webhook',
    express.raw({ type: 'application/json' }),
    (req, res) => {
      console.log('Test webhook received:', req.body)
      res.status(200).json({ received: true, test: true })
    }
  )
}

// -------------------- ✅ ROOT & 404 --------------------
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🌐 Welcome to Univ SVH API v1',
    documentation: '/api/health',
    version: '1.0.0',
  })
})

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: [
      '/api/health',
      '/api/users',
      '/api/courses',
      '/api/payments',
      '/api/notes',
      '/api/counseling',
    ],
  })
})

// -------------------- ✅ GLOBAL ERROR HANDLER --------------------
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err)

  // CORS error handling
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy: Access not allowed',
      origin: req.headers.origin,
    })
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong!',
    error:
      process.env.NODE_ENV === 'production'
        ? {}
        : {
            message: err.message,
            stack: err.stack,
          },
    timestamp: new Date().toISOString(),
  })
})

// -------------------- ✅ START SERVER --------------------
const startServer = async () => {
  try {
    await connectDB()

    // Start cron jobs if they exist
    if (typeof startCronJobs === 'function') {
      startCronJobs()
    }

    const PORT = process.env.PORT || 5000
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`✅ CORS allowed for: ${allowedOrigins.join(', ')}`)
      console.log(`💓 Health check: http://localhost:${PORT}/api/health`)

      // Payment webhook URL info
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `Payment Webhook: http://localhost:${PORT}/api/payments/webhook`
        )
        console.log(`Test Webhook: http://localhost:${PORT}/api/test-webhook`)
      }
    })

    // Handle graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n📡 Received ${signal}, closing server gracefully...`)
      server.close(() => {
        console.log('HTTP server closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  } catch (error) {
    console.error('Server startup failed:', error)
    process.exit(1)
  }
}

// -------------------- ✅ UNHANDLED REJECTION HANDLER --------------------
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  process.exit(1)
})

startServer()

export default app
