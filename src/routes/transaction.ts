import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { transactions, wallets, categories } from '../db/schema' 
import { eq, desc, and } from 'drizzle-orm'

type Variables = {
  jwtPayload: {
    sub: string | number 
    username: string
  }
}

const transactionRouter = new Hono<{ Variables: Variables }>()

const transactionSchema = z.object({
  amount: z.number().int().positive(), 
  type: z.enum(['income', 'expense', 'transfer']),
  categoryId: z.number().int(),
  description: z.string().optional(),
  walletId: z.number().int(), 
  toWalletId: z.number().int().optional(),
  date: z.string().optional(),
})

const getUserId = (c: { get: (key: 'jwtPayload') => Variables['jwtPayload'] }) => {
    return Number(c.get('jwtPayload').sub);
};


transactionRouter.get('/total', async (c) => {
  const userId = getUserId(c) 
  
  if (isNaN(userId) || userId === 0) {
    return c.json({ error: "Unauthorized or missing user context." }, 401)
  }

  const allTransactions = await db.select()
    .from(transactions)
    .where(eq(transactions.userId, userId))

  const total = allTransactions.reduce((acc, curr) => {
    return curr.type === 'income' ? acc + curr.amount : acc - curr.amount
  }, 0)

  return c.json({ balance: total })
})

// 1. GET /transactions (List All)
transactionRouter.get('/', async (c) => {
  const userId = getUserId(c)

  const result = await db.select({
    id: transactions.id,
    amount: transactions.amount,
    type: transactions.type,
    description: transactions.description,
    date: transactions.date,
    
    // Joined data
    walletName: wallets.name,
    categoryName: categories.name,
    
    walletId: transactions.walletId,
    categoryId: transactions.categoryId,
  })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .leftJoin(wallets, eq(transactions.walletId, wallets.id)) 
    .leftJoin(categories, eq(transactions.categoryId, categories.id)) 
    .orderBy(desc(transactions.date));

  return c.json(result)
})

// 1.1 GET /transactions/:id (Transaction Detail)
transactionRouter.get('/:id', async (c) => {
    const userId = getUserId(c)
    const id = Number(c.req.param('id'))

    if (isNaN(id) || id === 0) {
        return c.json({ error: "Invalid transaction ID format." }, 400)
    }

    const result = await db.select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      description: transactions.description,
      date: transactions.date,
      
      walletId: transactions.walletId,
      categoryId: transactions.categoryId,
      toWalletId: transactions.toWalletId,

      walletName: wallets.name,
      categoryName: categories.name,
    })
      .from(transactions)
      .where(and(
          eq(transactions.id, id),
          eq(transactions.userId, userId)
      ))
      .leftJoin(wallets, eq(transactions.walletId, wallets.id)) 
      .leftJoin(categories, eq(transactions.categoryId, categories.id)) 
      .get() 

    if (!result) {
        return c.json({ error: "Transaction not found." }, 404)
    }

    return c.json(result)
})

// 2. POST /transactions (Add new IDR transaction)
transactionRouter.post('/', zValidator('json', transactionSchema), async (c) => {
  const userId = getUserId(c)
  const body = c.req.valid('json')

  // --- WALLET CHECK ---
  const walletExists = await db.select().from(wallets).where(and(
    eq(wallets.id, body.walletId),
    eq(wallets.userId, userId)
  )).limit(1);

  if (walletExists.length === 0) {
    return c.json({ error: "Wallet not found or unauthorized." }, 404);
  }
  
  // --- CATEGORY CHECK ---
  const categoryExists = await db.select().from(categories).where(and(
    eq(categories.id, body.categoryId),
    eq(categories.userId, userId)
  )).limit(1);
  
  if (categoryExists.length === 0) {
    return c.json({ error: "Category not found or unauthorized." }, 404);
  }

  // Handle Date
  const transactionDate = body.date ? new Date(body.date) : new Date()

  const result = await db.insert(transactions).values({
    userId: userId,
    amount: body.amount,
    type: body.type,
    categoryId: body.categoryId,
    description: body.description,
    walletId: body.walletId, 
    toWalletId: body.toWalletId,
    date: transactionDate,
  }).returning()

  return c.json(result[0], 201)
})


// ⭐️ 3. PUT /transactions/:id (Edit existing IDR transaction) ⭐️
transactionRouter.put('/:id', zValidator('json', transactionSchema), async (c) => {
  const userId = getUserId(c)
  const id = Number(c.req.param('id'))
  const body = c.req.valid('json')

  if (isNaN(id) || id === 0) {
    return c.json({ error: "Invalid transaction ID format." }, 400)
  }

  // 1. Check if the target transaction exists and belongs to the user
  const targetTransaction = await db.select()
    .from(transactions)
    .where(and(
      eq(transactions.id, id),
      eq(transactions.userId, userId)
    ))
    .limit(1)
    .get();

  if (!targetTransaction) {
    return c.json({ error: "Transaction not found or unauthorized." }, 404);
  }

  // 2. Check if the new walletId exists and belongs to the user
  const walletExists = await db.select().from(wallets).where(and(
    eq(wallets.id, body.walletId),
    eq(wallets.userId, userId)
  )).limit(1);

  if (walletExists.length === 0) {
    return c.json({ error: "Wallet not found or unauthorized." }, 404);
  }
  
  // 3. Check if the new categoryId exists and belongs to the user
  const categoryExists = await db.select().from(categories).where(and(
    eq(categories.id, body.categoryId),
    eq(categories.userId, userId)
  )).limit(1);
  
  if (categoryExists.length === 0) {
    return c.json({ error: "Category not found or unauthorized." }, 404);
  }

  // --- UPDATE EXECUTION ---
  const transactionDate = body.date ? new Date(body.date) : new Date();

  const updated = await db.update(transactions)
    .set({
      amount: body.amount,
      type: body.type,
      categoryId: body.categoryId,
      description: body.description,
      walletId: body.walletId, 
      toWalletId: body.toWalletId, 
      date: transactionDate,
    })
    .where(eq(transactions.id, id))
    .returning(); 

  return c.json(updated[0], 200);
})


transactionRouter.delete('/:id', async (c) => {
  const userId = getUserId(c)
  const id = Number(c.req.param('id'))

  if (isNaN(id) || id === 0) {
    return c.json({ error: "Invalid transaction ID format." }, 400)
  }

  const deleted = await db.delete(transactions)
    .where(eq(transactions.id, id))
    .returning()

  if (deleted.length === 0 || deleted[0].userId !== userId) { 
    return c.json({ error: "Transaction not found or unauthorized" }, 404)
  }

  return c.json({ message: "Deleted successfully" })
})


export default transactionRouter