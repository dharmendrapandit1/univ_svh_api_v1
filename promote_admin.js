import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from './models/User.js'

dotenv.config()

const email = process.argv[2]

if (!email) {
  console.log('Please provide an email address as an argument.')
  process.exit(1)
}

const promoteUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to DB')

    const user = await User.findOne({ email })
    if (!user) {
      console.log('User not found')
      process.exit(1)
    }

    user.role = 'admin'
    await user.save()
    console.log(`User ${user.name} (${user.email}) promoted to ADMIN.`)

    process.exit()
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

promoteUser()
