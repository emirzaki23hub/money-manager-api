import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { categories } from '../db/schema'
import { eq } from 'drizzle-orm'

type Variables = {
  jwtPayload: {
    sub: number
    username: string
  }
}

const categoryRouter = new Hono<{ Variables: Variables }>()

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
})

// 1. GET /categories (List all my categories)
categoryRouter.get('/', async (c) => {
  const userId = c.get('jwtPayload').sub
  
  const result = await db.select()
    .from(categories)
    .where(eq(categories.userId, userId));
    
  return c.json(result)
})

// 2. POST /categories (Create a new category)
categoryRouter.post('/', zValidator('json', categorySchema), async (c) => {
  const userId = c.get('jwtPayload').sub
  const body = c.req.valid('json')

  try {
    const result = await db.insert(categories).values({
      userId,
      name: body.name,
      type: body.type,
    }).returning()
    
    return c.json(result[0], 201)
  } catch (error) {
    return c.json({ error: 'Category creation failed.' }, 500)
  }
})

export default categoryRouter