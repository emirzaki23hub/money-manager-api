import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { sign } from 'hono/jwt'
import { hash, compare } from 'bcryptjs'
import 'dotenv/config' // <--- 1. Load .env

const authRouter = new Hono()

const JWT_SECRET = process.env.JWT_SECRET as string 

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing in auth.ts!")
}

const authSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
})

// REGISTER
authRouter.post('/register', zValidator('json', authSchema), async (c) => {
  const { username, password } = c.req.valid('json')
  const passwordHash = await hash(password, 10)

  try {
    await db.insert(users).values({ username, password: passwordHash })
    return c.json({ message: 'User created!' }, 201)
  } catch (error) {
    return c.json({ error: 'Username already exists' }, 400)
  }
})


authRouter.post('/login', zValidator('json', authSchema), async (c) => {
  const { username, password } = c.req.valid('json')

  const user = await db.select().from(users).where(eq(users.username, username)).get()
  if (!user) return c.json({ error: 'Invalid credentials' }, 401)

  const validPassword = await compare(password, user.password)
  if (!validPassword) return c.json({ error: 'Invalid credentials' }, 401)

  // 3. Sign with the ENV secret
  const payload = {
    sub: user.id,
    username: user.username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
  }
  
  const token = await sign(payload, JWT_SECRET)

  return c.json({ token })
})

export default authRouter