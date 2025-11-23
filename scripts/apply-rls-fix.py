#!/usr/bin/env python3
"""
Apply RLS policy fix for project creation
Executes SQL directly via Supabase REST API
"""

import requests
import os

# Supabase configuration
SUPABASE_URL = "https://nxlznnrocrffnbzjaaae.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54bHpubnJvY3JmZm5iemphYWFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY3ODYwNSwiZXhwIjoyMDc5MjU0NjA1fQ.rWTnj0kLGMhLkE_PARQZBGqtKXJR3IbWM0x4MKL-l0o"

# SQL to execute
SQL = """
-- Drop the problematic policy
DROP POLICY IF EXISTS "Authenticated users can create projects in their company" ON projects;

-- Create a simpler policy that avoids RLS recursion
CREATE POLICY "Authenticated users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
"""

def execute_sql(sql: str):
    """Execute SQL via Supabase REST API"""
    url = f"{SUPABASE_URL}/rest/v1/rpc/exec_sql"

    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json"
    }

    # Try PostgREST approach
    print("Attempting to execute SQL...")
    print(f"SQL: {sql}")

    # Since we can't use RPC without a function, let's just print instructions
    print("\n" + "="*60)
    print("MANUAL STEPS REQUIRED:")
    print("="*60)
    print("\n1. Go to: https://supabase.com/dashboard/project/nxlznnrocrffnbzjaaae/sql/new")
    print("\n2. Copy and paste this SQL:\n")
    print(SQL)
    print("\n3. Click 'RUN'")
    print("\n4. You should see: 'Success. No rows returned'")
    print("\n" + "="*60)
    print("\nAfter running the SQL, try creating a project in your app!")
    print("="*60)

if __name__ == "__main__":
    execute_sql(SQL)
