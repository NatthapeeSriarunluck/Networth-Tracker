import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

print(f"Connecting to: {url}")
if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
    exit(1)

try:
    supabase: Client = create_client(url, key)
    # Try a simple select to verify connection and permissions
    response = supabase.table("networth_entries").select("*", count="exact").limit(1).execute()
    print("Successfully connected to Supabase!")
    print(f"Table 'networth_entries' count: {response.count}")
    if response.data:
        print("Successfully fetched at least one record.")
    else:
        print("Table is empty, but connection is valid.")
except Exception as e:
    print(f"Failed to connect to Supabase: {e}")
