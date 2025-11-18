import { Hono } from 'hono'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

// 1. Define the Type so TypeScript knows what "jwtPayload" is
type Variables = {
  jwtPayload: {
    sub: number
    username: string
  }
}

const userRouter = new Hono<{ Variables: Variables }>()

// 2. GET /me (Protected Profile Endpoint)
userRouter.get('/me', async (c) => {
  // Get the User ID from the Token (The middleware put it there)
  const payload = c.get('jwtPayload')
  const userId = payload.sub

  // Query the DB
  // Notice we explicitly select specific columns to exclude the password!
  const result = await db.select({
    id: users.id,
    username: users.username,
  })
  .from(users)
  .where(eq(users.id, userId))

  const user = result[0]

  if (!user) {
    return c.json({ error: 'User not found' }, 404)
  }

  return c.json(user)
})

export default userRouter