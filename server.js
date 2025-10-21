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

const app = express()

// -------------------- ✅ COOKIE PARSER --------------------
app.use(cookieParser())

// -------------------- ✅ CORS CONFIGURATION --------------------
const allowedOrigins = [
  'http://localhost:5173', // Vite local dev
  'http://localhost:3000', // Optional fallback
  process.env.CLIENT_URL, // Production (e.g. https://univsvh.in)
].filter(Boolean)

// Normalize to prevent trailing slash mismatch
const normalizedOrigins = allowedOrigins.map((origin) =>
  origin.endsWith('/') ? origin.slice(0, -1) : origin
)

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true) // Allow Postman / server-side

    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin

    if (normalizedOrigins.includes(normalizedOrigin)) {
      callback(null, true)
    } else {
      console.log(`🚫 CORS blocked: ${origin}`)
      callback(new Error(`CORS policy: Origin ${origin} not allowed`))
    }
  },
  credentials: true, // ✅ allows sending cookies from frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'guestid', // ✅ allow guest headers too
  ],
  exposedHeaders: ['Set-Cookie', 'Date', 'ETag'],
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))

// -------------------- ✅ BODY PARSING --------------------
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') return next()
  express.json({ limit: '10mb' })(req, res, next)
})
app.use(express.urlencoded({ extended: true }))

// -------------------- ✅ HEALTH CHECK --------------------
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running ✅',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins,
      credentials: true,
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

// -------------------- ROOT & 404 --------------------
app.get('/', (req, res) => {
  res.send('🌐 Welcome to Univ SVH API v1')
})

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
})

// -------------------- ✅ GLOBAL ERROR HANDLER --------------------
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err)
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
  })
})

// -------------------- ✅ START SERVER --------------------
const startServer = async () => {
  try {
    await connectDB()
    startCronJobs()
    const PORT = process.env.PORT || 5000
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
      console.log(`✅ CORS allowed for: ${allowedOrigins.join(', ')}`)
      console.log(`💓 Health check: http://localhost:${PORT}/api/health`)
    })
  } catch (error) {
    console.error('❌ Server startup failed:', error)
    process.exit(1)
  }
}

startServer()

// -------------------- ✅ CLEAN EXIT --------------------
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err)
  process.exit(1)
})

process.on('SIGTERM', () => process.exit(0))

export default app
