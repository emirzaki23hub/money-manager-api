import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { wallets } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

type Variables = {
  jwtPayload: {
    sub: number
    username: string
  }
}

const walletRouter = new Hono<{ Variables: Variables }>()

const walletSchema = z.object({
  name: z.string().min(1), // e.g., "BCA"
  type: z.enum(['cash', 'bank', 'ewallet']).default('cash'),
  balance: z.number().int().default(0),
})

// 1. GET /wallets (List my wallets)
walletRouter.get('/', async (c) => {
  const userId = c.get('jwtPayload').sub
  const result = await db.select().from(wallets).where(eq(wallets.userId, userId))
  return c.json(result)
})

// 2. POST /wallets (Create a new wallet)
walletRouter.post('/', zValidator('json', walletSchema), async (c) => {
  const userId = c.get('jwtPayload').sub
  const body = c.req.valid('json')

  const result = await db.insert(wallets).values({
    userId,
    name: body.name,
    type: body.type,
    balance: body.balance
  }).returning()

  return c.json(result[0], 201)
})

// 3. DELETE /wallets/:id
walletRouter.delete('/:id', async (c) => {
  const userId = c.get('jwtPayload').sub
  const id = Number(c.req.param('id'))

  await db.delete(wallets).where(eq(wallets.id, id))
  return c.json({ message: 'Deleted' })
})

export default walletRouter