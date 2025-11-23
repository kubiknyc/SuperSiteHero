#!/usr/bin/env python3
"""
Automated database migration script for SUPER SITE HERO
Connects directly to Supabase PostgreSQL and runs all migrations
"""

import os
import sys
import io

# Fix encoding for Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg2
from psycopg2 import sql
from urllib.parse import urlparse
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

def parse_supabase_url(url):
    """Extract host from Supabase URL"""
    parsed = urlparse(url)
    # Supabase URL format: https://xxxx.supabase.co
    # Database host: xxxx.supabase.co
    host = parsed.netloc
    return host

def get_database_password():
    """Get database password from environment variable or prompt user"""
    # First try to get from environment variable
    password = os.getenv('SUPABASE_DB_PASSWORD')

    if password:
        return password

    # If not in environment, prompt user
    print("\n" + "="*60)
    print("PASSWORD REQUIRED")
    print("="*60)
    print("\nTo get your database password:")
    print("1. Go to https://supabase.com/dashboard")
    print("2. Select your 'SuperSiteHero' project")
    print("3. Click Settings → Database")
    print("4. Look for 'Password' field")
    print("5. If you don't see it, click 'Reset Password' to create one")
    print("\nEnter your database password (will be hidden):")

    import getpass
    password = getpass.getpass("Password: ")

    if not password:
        print("\nPassword cannot be empty")
        sys.exit(1)

    return password

def run_migrations():
    """Main migration function"""
    print("\n🚀 SUPER SITE HERO - Database Migration")
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

    # Get password from user
    db_password = get_database_password()

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

    # Read migration files
    migrations_dir = Path(__file__).parent / 'migrations'

    migration_files = sorted([
        f for f in migrations_dir.glob('???_*.sql')
        if f.name != 'COMBINED_ALL_MIGRATIONS.sql'
    ])

    if not migration_files:
        print(f"Error: No migration files found in {migrations_dir}")
        sys.exit(1)

    print(f"\nFound {len(migration_files)} migration files")

    # Connect and run migrations
    print(f"\n⏳ Connecting to database...")

    try:
        conn = psycopg2.connect(**db_config)
        conn.autocommit = True
        cursor = conn.cursor()

        print("Connected successfully\n")
        print("Executing migrations...\n")

        # Execute each migration file
        for i, migration_file in enumerate(migration_files, 1):
            filename = migration_file.name
            with open(migration_file, 'r', encoding='utf-8') as f:
                migration_sql = f.read()

            try:
                print(f"[{i}/{len(migration_files)}] {filename}...", end=' ', flush=True)
                cursor.execute(migration_sql)
                print("OK")
            except Exception as e:
                print(f"FAILED")
                print(f"Error: {e}")
                raise

        print("\nAll migrations completed successfully!")
        print("\n🎉 Database is ready for development!\n")
        print("="*60)
        print("Next steps:")
        print("1. npm run dev")
        print("2. Open http://localhost:5173")
        print("3. Sign in with your Supabase Auth")
        print("="*60 + "\n")

        cursor.close()
        conn.close()

    except psycopg2.Error as e:
        print(f"\n❌ Database error: {e}")
        print(f"   Make sure your password is correct")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    try:
        run_migrations()
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
