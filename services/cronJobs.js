import cron from 'node-cron'
import User from '../models/User.js'
import Counseling from '../models/Counseling.js'

export const startCronJobs = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const expiredUsers = await User.find({
        subscriptionType: 'paid',
        subscriptionExpiry: { $lt: new Date() },
      })

      for (const user of expiredUsers) {
        user.subscriptionType = 'free'
        user.subscriptionExpiry = undefined
        await user.save()
      }
    } catch (error) {
      return error
    }
  })

  // Run every hour to check for upcoming counseling sessions
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date()
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      const upcomingSessions = await Counseling.find({
        status: 'scheduled',
        scheduledAt: {
          $gte: now,
          $lte: oneHourFromNow,
        },
      })
        .populate('user', 'email name')
        .populate('assignedCounselor', 'email name')

      // Send reminder emails (implementation depends on your email service)
      for (const session of upcomingSessions) {
        // Implement email reminder logic here
      }
    } catch (error) {}
  })
}
