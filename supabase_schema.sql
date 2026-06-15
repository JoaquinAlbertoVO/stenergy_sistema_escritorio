-- Supabase Schema for ST Energy Sistema
-- Run this in the Supabase SQL Editor

-- 1. Create tables
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  shortName TEXT NOT NULL,
  color TEXT NOT NULL,
  instructor TEXT,
  startDate TEXT,
  duration TEXT,
  price NUMERIC,
  status TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  password TEXT NOT NULL,
  avatar TEXT,
  status TEXT
);

CREATE TABLE IF NOT EXISTS calendar (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  type TEXT NOT NULL,
  description TEXT,
  courseId TEXT,
  instructor TEXT
);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  clientId TEXT,
  clientName TEXT NOT NULL,
  clientDni TEXT,
  clientPhone TEXT,
  clientEmail TEXT,
  courseId TEXT NOT NULL,
  courseName TEXT NOT NULL,
  modality TEXT,
  sellerId TEXT NOT NULL,
  sellerName TEXT NOT NULL,
  status TEXT NOT NULL,
  totalAmount NUMERIC NOT NULL,
  paidAmount NUMERIC NOT NULL,
  certificateGenerated BOOLEAN DEFAULT FALSE,
  certificateOverrides JSONB
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  saleId TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  account TEXT NOT NULL
);

-- 2. Optional: Set up Row Level Security (RLS)
-- For now, we will disable RLS so that the application can read/write directly 
-- without needing Supabase Auth. In a production app with sensitive data, 
-- you should use Supabase Auth and enable RLS.
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE calendar DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
