import express from 'express'
import protectRoute from '../middleware/protectRoute.js'
import upload from '../storage/multer.js'
import {
  uploadAvatar,
  generate2FA,
  enable2FA,
  disable2FA,
  getMyProfile,
} from '../controller/profileController.js'

const router = express.Router()

router.get('/me', protectRoute, getMyProfile)
router.post('/avatar', protectRoute, upload.single('avatar'), uploadAvatar)
router.post('/2fa/generate', protectRoute, generate2FA)
router.post('/2fa/enable', protectRoute, enable2FA)
router.post('/2fa/disable', protectRoute, disable2FA)

export default router
