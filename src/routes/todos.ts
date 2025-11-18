import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { todos } from '../db/schema'
import { eq, and } from 'drizzle-orm'

// 👇 THIS IS THE FIX: We tell TypeScript that "Variables" has a "jwtPayload"
type Variables = {
  jwtPayload: {
    sub: number
    username: string
    exp: number
  }
}

const todoRouter = new Hono<{ Variables: Variables }>()

const todoSchema = z.object({
  task: z.string().min(3).max(100),
})

// 1. GET
todoRouter.get('/', async (c) => {
  const payload = c.get('jwtPayload')
  const userId = payload.sub 

  const result = await db.select()
    .from(todos)
    .where(eq(todos.userId, userId)) 

  return c.json(result)
})

// 2. POST
todoRouter.post('/', zValidator('json', todoSchema), async (c) => {
  const payload = c.get('jwtPayload')
  const userId = payload.sub
  const body = c.req.valid('json')

  const result = await db.insert(todos).values({
    task: body.task,
    userId: userId 
  }).returning()

  return c.json(result[0], 201)
})

// 3. DELETE
todoRouter.delete('/:id', async (c) => {
  const payload = c.get('jwtPayload')
  const userId = payload.sub
  const todoId = Number(c.req.param('id'))
  
  await db.delete(todos)
    .where(
      and(
        eq(todos.id, todoId),
        eq(todos.userId, userId)
      )
    )
  
  return c.json({ message: 'Deleted' })
})

export default todoRouter