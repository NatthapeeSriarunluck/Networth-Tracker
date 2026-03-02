import pandas as pd
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
TABLE_NAME = "networth_entries"

def import_csv():
    if not url or not key:
        print("Error: SUPABASE_URL or SUPABASE_KEY not found in .env")
        return

    supabase: Client = create_client(url, key)
    
    # Check if CSV exists
    if not os.path.exists("networth_data.csv"):
        print("Error: networth_data.csv not found")
        return

    # Read CSV
    df = pd.read_csv("networth_data.csv")
    print(f"Read {len(df)} records from CSV.")

    # Convert to list of dicts for Supabase
    # Supabase might lowercase keys, so check that
    data = df.to_dict(orient="records")

    try:
        # Check if table exists by trying to select
        response = supabase.table(TABLE_NAME).select("*", count="exact").limit(1).execute()
        print("Table exists, importing data...")
    except Exception as e:
        print(f"Error: Table '{TABLE_NAME}' might not exist. Run the SQL script first.")
        print(f"Detailed error: {e}")
        return

    # Import data
    try:
        # We might want to use upsert if Year and Month are unique
        response = supabase.table(TABLE_NAME).upsert(data, on_conflict="Year, Month").execute()
        print(f"Successfully imported/updated {len(response.data)} records.")
    except Exception as e:
        print(f"Failed to import data: {e}")

if __name__ == "__main__":
    import_csv()
