import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// --- USERS ---
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  avatarUrl: text('avatar_url'),
});

// --- WALLETS (New!) ---
// Stores "Cash", "BCA", "OVO", etc.
export const wallets = sqliteTable('wallets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  name: text('name').notNull(), // e.g., "BCA", "Cash"
  type: text('type').default('cash'), // e.g., 'bank', 'ewallet', 'cash'
  balance: integer('balance').default(0), // Current balance in cents
});

// --- TRANSACTIONS (Updated) ---
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  
  // Link to Wallet (Required)
  walletId: integer('wallet_id').references(() => wallets.id).notNull(),
  
  // For Transfers (Optional)
  toWalletId: integer('to_wallet_id').references(() => wallets.id), 

  amount: integer('amount').notNull(),
  
  // Added 'transfer' to the list
  type: text('type', { enum: ["income", "expense", "transfer"] }).notNull(),
  
  category: text('category').notNull(),
  description: text('description'),
  
  // Allow user to pick a date (defaults to now if empty)
  date: integer('date', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
    
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

// --- TODOS (Keeping this for reference) ---
export const todos = sqliteTable('todos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  task: text('task').notNull(),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  userId: integer('user_id').references(() => users.id).notNull(),
});