import express from 'express'
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../controllers/wishlistController.js'
import { authenticate } from '../middleware/auth.js'

const router = express.Router()

router.use(authenticate)

router.route('/').get(getWishlist)

router.route('/add').post(addToWishlist)

router.route('/remove').post(removeFromWishlist)

export default router
