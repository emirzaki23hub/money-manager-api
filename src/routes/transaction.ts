import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { transactions } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

// Type definition for the JWT payload
type Variables = {
  jwtPayload: {
    sub: number
    username: string
  }
}

const transactionRouter = new Hono<{ Variables: Variables }>()

// Validation Schema for IDR
const transactionSchema = z.object({
  // IDR Rule: Must be a positive INTEGER (No decimals like 10500.50)
  amount: z.number().int().positive(), 
  type: z.enum(['income', 'expense', 'transfer']), // Added transfer
  category: z.string().min(1),
  description: z.string().optional(),
  walletId: z.number().int(), // <--- REQUIRED NOW
  toWalletId: z.number().int().optional(), // For transfers
  date: z.string().optional(), // "2025-11-18" from frontend
})

// 1. GET /transactions (List all my transactions)
transactionRouter.get('/', async (c) => {
  const userId = c.get('jwtPayload').sub

  const result = await db.select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(desc(transactions.date)) // Changed from createdAt to date

  return c.json(result)
})

// 2. POST /transactions (Add new IDR transaction)
transactionRouter.post('/', zValidator('json', transactionSchema), async (c) => {
  const userId = c.get('jwtPayload').sub
  const body = c.req.valid('json')

  // Handle Date (If empty, use "now")
  const transactionDate = body.date ? new Date(body.date) : new Date()

  const result = await db.insert(transactions).values({
    userId: userId,
    amount: body.amount,
    type: body.type,
    category: body.category,
    description: body.description,
    walletId: body.walletId, // <--- FIXED: Added this missing field
    toWalletId: body.toWalletId,
    date: transactionDate,
  }).returning()

  return c.json(result[0], 201)
})

// 3. DELETE /transactions/:id
transactionRouter.delete('/:id', async (c) => {
  const userId = c.get('jwtPayload').sub
  const id = Number(c.req.param('id'))

  const deleted = await db.delete(transactions)
    .where(
      // Ensure user can only delete their OWN transaction
      eq(transactions.id, id)
    )
    .returning()

  // Check if the item existed and belonged to the user
  if (deleted.length === 0 || deleted[0].userId !== userId) {
    return c.json({ error: "Transaction not found or unauthorized" }, 404)
  }

  return c.json({ message: "Deleted successfully" })
})

// 4. GET /transactions/total (IDR Balance)
transactionRouter.get('/total', async (c) => {
  const userId = c.get('jwtPayload').sub

  const allTransactions = await db.select()
    .from(transactions)
    .where(eq(transactions.userId, userId))

  const total = allTransactions.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + curr.amount : acc - curr.amount
  }, 0)

  return c.json({ balance: total })
})

export default transactionRouter