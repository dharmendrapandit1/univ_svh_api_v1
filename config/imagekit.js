import ImageKit from 'imagekit'

export const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
})

// Generate authentication for frontend
export const getImageKitAuth = () => {
  return imagekit.getAuthenticationParameters()
}

// Upload file to ImageKit
export const uploadToImageKit = async (file, fileName, folder = '') => {
  try {
    const response = await imagekit.upload({
      file: file.buffer,
      fileName: fileName,
      folder: folder,
    })
    return response
  } catch (error) {
    throw new Error(`ImageKit upload failed: ${error.message}`)
  }
}
