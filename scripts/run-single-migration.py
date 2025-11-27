#!/usr/bin/env python3
"""
Run a single migration file on Supabase database
"""

import os
import sys
import io
import psycopg2
from urllib.parse import urlparse
from pathlib import Path
from dotenv import load_dotenv

# Fix encoding for Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Load environment variables from .env
load_dotenv()

def parse_supabase_url(url):
    """Extract host from Supabase URL"""
    parsed = urlparse(url)
    host = parsed.netloc
    return host

def get_database_password():
    """Get database password from environment variable"""
    password = os.getenv('SUPABASE_DB_PASSWORD')
    if not password:
        print("\n❌ SUPABASE_DB_PASSWORD not found in environment")
        print("Please set it: set SUPABASE_DB_PASSWORD=your_password")
        sys.exit(1)
    return password

def run_migration(migration_file, password=None):
    """Run a specific migration file"""
    print(f"\n🚀 Running Migration: {migration_file}")
    print("="*60)

    # Load environment variables
    supabase_url = os.getenv('VITE_SUPABASE_URL')
    if not supabase_url:
        print("❌ VITE_SUPABASE_URL not found in .env file")
        sys.exit(1)

    # Extract database host
    db_host = parse_supabase_url(supabase_url)
    print(f"\n📍 Supabase Project: {supabase_url}")
    print(f"🗄️  Database Host: {db_host}")

    # Get password from parameter or environment
    db_password = password if password else get_database_password()

    # Connection parameters
    db_config = {
        'host': db_host,
        'user': 'postgres',
        'password': db_password,
        'database': 'postgres',
        'port': '5432',
        'sslmode': 'require',
        'connect_timeout': 30
    }

    # Read migration file
    migration_path = Path(migration_file)
    if not migration_path.exists():
        print(f"❌ Migration file not found: {migration_path}")
        sys.exit(1)

    with open(migration_path, 'r', encoding='utf-8') as f:
        migration_sql = f.read()

    print(f"\n⏳ Connecting to database...")

    try:
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()

        print("✓ Connected successfully\n")
        print("📝 Executing migration...\n")

        cursor.execute(migration_sql)
        print("✅ Migration completed successfully!\n")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"   Make sure your password is correct and migration hasn't already been applied")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2 or len(sys.argv) > 3:
        print("Usage: python run-single-migration.py <migration_file> [password]")
        sys.exit(1)

    migration_file = sys.argv[1]
    password = sys.argv[2] if len(sys.argv) == 3 else None

    try:
        run_migration(migration_file, password)
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
