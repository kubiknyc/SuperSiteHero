#!/usr/bin/env python
"""Wrapper to run superclaude without emoji encoding errors on Windows"""
import sys
import os
import re

# Force UTF-8 encoding
os.environ['PYTHONIOENCODING'] = 'utf-8'
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Monkey patch click.echo to strip emojis
import click

original_echo = click.echo

def patched_echo(message=None, file=None, nl=True, err=False, color=None):
    """Echo with emoji stripped"""
    if message is not None:
        # Remove emoji characters (Unicode ranges for emojis)
        message = re.sub(r'[\U0001F300-\U0001F9FF]', '', str(message))
    return original_echo(message, file, nl, err, color)

click.echo = patched_echo

# Now run superclaude
from superclaude.cli.main import cli

if __name__ == '__main__':
    sys.exit(cli())