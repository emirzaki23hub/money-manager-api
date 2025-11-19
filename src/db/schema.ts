import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- USERS --- (Unchanged)
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  avatarUrl: text('avatar_url'),
});

// --- WALLETS --- (Unchanged)
export const wallets = sqliteTable('wallets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  type: text('type').default('cash'),
  balance: integer('balance').default(0),
});

// --- CATEGORIES (NEW!) ---
// User-defined categories (e.g., "Food", "Rent", "Salary")
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  // Type is useful for filtering "Income Categories" vs "Expense Categories"
  type: text('type', { enum: ["income", "expense"] }).notNull(),
});

// --- TRANSACTIONS (UPDATED) ---
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),
  toWalletId: integer('to_wallet_id').references(() => wallets.id), 

  amount: integer('amount').notNull(),
  
  type: text('type', { enum: ["income", "expense", "transfer"] }).notNull(),
  
  // FIX: Change 'category: text' to 'categoryId: integer'
  categoryId: integer('category_id').references(() => categories.id).notNull(), 
  
  description: text('description'),
  date: integer('date', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// --- TODOS ---
export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  task: text('task').notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  userId: integer('user_id').references(() => users.id).notNull(),
});