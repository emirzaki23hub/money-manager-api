import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from '../db'
import { categories } from '../db/schema'
import { eq, and } from 'drizzle-orm' // Import 'and' to combine conditions

// --- Types ---
type Variables = {
  jwtPayload: {
    sub: number
    username: string
  }
}

const categoryRouter = new Hono<{ Variables: Variables }>()

// --- Validation Schemas ---
const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense']),
})

// Schema for the GET request query parameters
const categoryQuerySchema = z.object({
  type: z.enum(['income', 'expense']).optional(), // Makes the type filter optional
}).strip();


// 1. GET /categories (List all my categories, with optional type filter)
// categoryRouter.ts

// ... imports and schema definitions ...

// 1. GET /categories (List all my categories, with optional type filter)
categoryRouter.get(
  '/', 
  zValidator('query', categoryQuerySchema),
  async (c) => {
    const userId = c.get('jwtPayload').sub
    const { type } = c.req.valid('query') // Get the validated 'type' parameter

    // 1. Start with the mandatory condition in an array
    const potentialConditions = [
        eq(categories.userId, userId)
    ];

    // 2. Add the optional condition if it exists
    if (type) {
        potentialConditions.push(eq(categories.type, type));
    }

    // 3. ⭐️ FIX: Use the 'and' helper by spreading the array. ⭐️
    //    Since we only push defined conditions, we avoid the 'undefined' error
    //    in this specific case, but this is the robust pattern.
    const finalCondition = and(...potentialConditions); 
    
    // In scenarios where conditions might be null/undefined, 
    // you would use .filter(Boolean) on potentialConditions before spreading.

    const result = await db.select()
      .from(categories)
      // 4. Apply the single combined condition
      .where(finalCondition); 
      
    return c.json(result)
  }
)

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
    // In a production app, you might check for unique constraint errors here
    console.error("Category insertion error:", error);
    return c.json({ error: 'Category creation failed.' }, 500)
  }
})

export default categoryRouter