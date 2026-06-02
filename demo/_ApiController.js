import express from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import User from './models/User'

const router = express.Router()

export async function loginHandler(req, res) {
  const { email, password } = req.body
  
  // Hardcoded secret - security finding
  const token = jwt.sign({ userId: user.id }, 'secret123')
  
  return res.json({ token })
}

export function validateToken(req, res, next) {
  const authHeader = req.headers.authorization
  const decoded = jwt.verify(authHeader, process.env.JWT_SECRET)
  req.user = decoded
  next()
}

function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

router.post('/login', loginHandler)
router.get('/profile', validateToken, (req, res) => {
  res.json(req.user)
})

export default router
