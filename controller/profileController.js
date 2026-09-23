import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import cloudinary from '../storage/cloudinaryConfig.js'
import User from '../models/User.js'
import mongoose from 'mongoose'

// ─── Upload avatar ────────────────────────────────────────────────────────────
export const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file provided' })

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'avatars',
      width: 200,
      height: 200,
      crop: 'fill',
      gravity: 'face',
      fetch_format: 'webp',
      quality: 'auto',
    })

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password -twoFactorSecret')

    return res.status(200).json({ success: true, avatar: result.secure_url, user })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Avatar upload failed' })
  }
}

// ─── Generate 2FA secret + QR code ───────────────────────────────────────────
export const generate2FA = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    const secret = speakeasy.generateSecret({
      name: `HookahDrop (${user.email})`,
      length: 20,
    })

    // Save secret temporarily (not yet enabled)
    user.twoFactorSecret = secret.base32
    await user.save()

    const qrDataUrl = await QRCode.toDataURL(secret.otpauth_url)

    return res.status(200).json({
      success: true,
      secret: secret.base32,
      qrCode: qrDataUrl,
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Failed to generate 2FA' })
  }
}

// ─── Verify token and enable 2FA ─────────────────────────────────────────────
export const enable2FA = async (req, res) => {
  try {
    const { token } = req.body
    const user = await User.findById(req.user._id).select('+twoFactorSecret')

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: 'No 2FA secret found. Generate one first.' })
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      return res.status(400).json({ message: 'Invalid code. Please try again.' })
    }

    user.twoFactorEnabled = true
    await user.save()

    return res.status(200).json({ success: true, message: '2FA enabled successfully' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Failed to enable 2FA' })
  }
}

// ─── Disable 2FA ─────────────────────────────────────────────────────────────
export const disable2FA = async (req, res) => {
  try {
    const { token } = req.body
    const user = await User.findById(req.user._id).select('+twoFactorSecret')

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' })
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1,
    })

    if (!verified) {
      return res.status(400).json({ message: 'Invalid code' })
    }

    user.twoFactorEnabled = false
    user.twoFactorSecret = null
    await user.save()

    return res.status(200).json({ success: true, message: '2FA disabled successfully' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Failed to disable 2FA' })
  }
}

// ─── Get full profile ─────────────────────────────────────────────────────────
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password -twoFactorSecret')
    return res.status(200).json({ success: true, data: user })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile' })
  }
}
