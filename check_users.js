import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from './models/User.js'

dotenv.config()

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to DB')

    const users = await User.find({})
    console.log('Users found:', users.length)
    users.forEach(u => {
      console.log(`- ${u.name} (${u.email}): ${u.role}`)
    })

    process.exit()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

checkUsers()
