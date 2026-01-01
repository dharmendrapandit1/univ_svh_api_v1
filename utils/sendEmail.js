import nodemailer from 'nodemailer'

const sendEmail = async (options) => {
  // CHECK: If no SMTP_HOST is set, log to console instead of crashing
  if (!process.env.SMTP_HOST) {
    console.log('--- 📧 MOCK EMAIL SENDING (Dev Mode) 📧 ---')
    console.log(`To: ${options.email}`)
    console.log(`Subject: ${options.subject}`)
    console.log('--- Message ---')
    console.log(options.message)
    console.log('--- End Email ---')
    return
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
       rejectUnauthorized: false
    }
  })

  // Define email options
  const message = {
    from: `${process.env.FROM_NAME || 'UniK Geeks'} <${
      process.env.FROM_EMAIL || process.env.SMTP_EMAIL
    }>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  }

  // Send email
  const info = await transporter.sendMail(message)

  console.log('Message sent: %s', info.messageId)
}

export default sendEmail
