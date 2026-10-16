"""
Utility Script: Find the correct Supabase connection pooler region.
Usage:
    python scripts/find_region.py [project_ref] [password]
"""

import os
import sys
import psycopg2

REGIONS = [
    "ap-northeast-1", "ap-northeast-2", "ap-south-1", "ap-southeast-1", "ap-southeast-2",
    "ca-central-1", "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "sa-east-1",
    "us-east-1", "us-east-2", "us-west-1", "us-west-2"
]

def scan_regions(project_ref: str, password: str):
    print(f"Scanning Supabase pooler regions for project: {project_ref} ...")
    found = None

    for region in REGIONS:
        host = f"aws-0-{region}.pooler.supabase.com"
        user = f"postgres.{project_ref}"
        port = 6543
        dbname = "postgres"

        try:
            conn = psycopg2.connect(
                host=host,
                database=dbname,
                user=user,
                password=password,
                port=port,
                connect_timeout=2
            )
            conn.close()
            print(f"\n[SUCCESS] Found active region pooler: {region}")
            found = region
            break
        except psycopg2.OperationalError:
            sys.stdout.write(".")
            sys.stdout.flush()

    if found:
        url = f"postgresql://{user}:{password}@{host}:{port}/{dbname}"
        print(f"\nYour correct DATABASE_URL is:\n{url}")
    else:
        print("\nCould not find the correct region. Please check credentials or project status.")

if __name__ == "__main__":
    project = sys.argv[1] if len(sys.argv) > 1 else os.getenv("SUPABASE_PROJECT_REF", "lgdvyuqrnydozbvbgrhl")
    pwd = sys.argv[2] if len(sys.argv) > 2 else os.getenv("SUPABASE_PASSWORD", "rohitshah-9")
    scan_regions(project, pwd)
