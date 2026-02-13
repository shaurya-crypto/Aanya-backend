import express from 'express'
import { handleCommand } from '../controllers/commandController.js'
import auth from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'
import trackAnalytics from '../middleware/analytics.js'


const router = express.Router()

router.post('/', auth, rateLimit, trackAnalytics, handleCommand)


export default router
