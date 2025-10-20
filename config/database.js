import dotenv from 'dotenv'
dotenv.config()
import { connect } from 'mongoose'

const connectDB = async () => {
  try {
    const conn = await connect(process.env.MONGODB_URI)
  } catch (error) {
    console.error('Database connection error:', error)
    process.exit(1)
  }
}

export default connectDB
