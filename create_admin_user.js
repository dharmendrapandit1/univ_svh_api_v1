import dotenv from 'dotenv'
import connectDB from './config/database.js'
import User from './models/User.js'

dotenv.config()

const createAdmin = async () => {
    try {
        await connectDB()
        
        const email = 'admin@unikgeeks.com'
        const password = 'admin123'
        
        // Check if exists
        let user = await User.findOne({ email })
        
        if (user) {
            user.role = 'admin'
            user.password = password // Will be hashed by pre-save hook
            await user.save()
            console.log('Existing user updated to Admin.')
        } else {
            user = await User.create({
                name: 'Super Admin',
                email,
                password,
                role: 'admin',
                subscriptionType: 'paid', // just in case
            })
            console.log('New Admin User created.')
        }
        
        console.log(`Email: ${email}`)
        console.log(`Password: ${password}`)
        
        process.exit()
    } catch (error) {
        console.error('Error:', error)
        process.exit(1)
    }
}

createAdmin()
