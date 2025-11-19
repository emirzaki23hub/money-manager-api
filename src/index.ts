import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { serveStatic } from '@hono/node-server/serve-static'

import todoRouter from './routes/todos'
import authRouter from './routes/auth'
import userRouter from './routes/user'
import transactionRouter from './routes/transaction'
import walletRouter from './routes/wallet'
import categoryRouter from './routes/categories'

const app = new Hono()
const JWT_SECRET = process.env.JWT_SECRET!

app.use('/*', cors())

// Serve uploaded images
app.use('/uploads/*', serveStatic({ root: './' }))

// --- PUBLIC ROUTES ---
app.route('/auth', authRouter)

// --- MIDDLEWARE (The Gatekeeper) ---
app.use('/todos/*', jwt({ secret: JWT_SECRET }))
app.use('/users/*', jwt({ secret: JWT_SECRET }))
app.use('/transactions/*', jwt({ secret: JWT_SECRET }))
app.use('/wallets/*', jwt({ secret: JWT_SECRET }))
app.use('/categories/*', jwt({ secret: JWT_SECRET })) // <-- 2. Protect new route


app.route('/todos', todoRouter)
app.route('/users', userRouter)
app.route('/transactions', transactionRouter)
app.route('/wallets', walletRouter)
app.route('/categories', categoryRouter) // <-- 3. Mount new router


const port = 3000
console.log(`Server is running on port ${port}`)

serve({ fetch: app.fetch, port })