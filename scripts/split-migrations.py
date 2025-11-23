#!/usr/bin/env python3
"""Split the combined migration file into individual migration files"""

import re
from pathlib import Path

# Read the combined migration file
migrations_dir = Path('migrations')
combined_file = migrations_dir / 'COMBINED_ALL_MIGRATIONS.sql'

print('Reading combined migration file...')
with open(combined_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Split by migration markers
migration_pattern = r'-- Migration: (\d+)_(.+?)\.sql'
migrations = {}
current_number = None
current_name = None
buffer = []

for line in content.split('\n'):
    match = re.match(migration_pattern, line)
    if match:
        # Save previous migration
        if current_number is not None:
            migration_key = f"{current_number:03d}"
            migrations[migration_key] = {
                'name': current_name,
                'content': '\n'.join(buffer)
            }
        # Start new migration
        current_number = int(match.group(1))
        current_name = match.group(2)
        buffer = [line]
    else:
        buffer.append(line)

# Save last migration
if current_number is not None:
    migration_key = f"{current_number:03d}"
    migrations[migration_key] = {
        'name': current_name,
        'content': '\n'.join(buffer)
    }

# Write individual migration files
print(f'\nSplitting into {len(migrations)} migration files...\n')

for migration_key in sorted(migrations.keys()):
    migration = migrations[migration_key]
    filename = f'{migration_key}_{migration["name"]}.sql'
    filepath = migrations_dir / filename

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(migration['content'])

    size_kb = len(migration['content']) / 1024
    print(f'[OK] {filename:50} ({size_kb:8.1f} KB)')

print(f'\nSplit complete! {len(migrations)} files created in migrations/ folder')
print('\nNext steps:')
print('1. Go to Supabase SQL Editor')
print('2. Open each migration file in order (001, 002, 003...)')
print('3. Copy the contents and paste into SQL Editor')
print('4. Run each one')
