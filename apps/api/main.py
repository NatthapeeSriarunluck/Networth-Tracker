import os
import yfinance as yf
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- CONFIGURATION ---
app = FastAPI(
    title="AURUM // Core Architecture API",
    description="Financial intelligence layer for Net Worth Tracking",
    version="3.0.0"
)

# CORS Configuration for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE ENGINE ---
def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(status_code=500, detail="Supabase configuration missing in .env")
    return create_client(url, key)

# --- SCHEMAS ---
class VaultEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: Optional[int] = None
    Year: int = Field(..., ge=2000, le=2100)
    Month: int = Field(..., ge=1, le=12)
    Cash_Reserves: float = Field(0, alias="Cash Reserves")
    Bitcoin: float = Field(0)
    US_Portfolio: float = Field(0, alias="U.S Portfolio")
    Liabilities: float = Field(0)

class TargetAllocation(BaseModel):
    category_name: str
    target_percentage: float = Field(..., ge=0, le=100)

# --- UTILITIES ---
def fetch_live_rate(symbol: str = "USDTHB=X") -> float:
    """Fetch live FX rate using yfinance with a fallback."""
    try:
        ticker = yf.Ticker(symbol)
        data = ticker.history(period="1d")
        if not data.empty:
            return float(data['Close'].iloc[-1])
        return 35.0
    except Exception:
        return 35.0

# --- ENDPOINTS ---

@app.get("/api/health")
async def health_check():
    return {"status": "operational", "timestamp": datetime.now().isoformat()}

@app.get("/api/rate")
async def get_fx_rate():
    """Returns the latest USD/THB exchange rate."""
    rate = fetch_live_rate()
    return {"rate": rate, "symbol": "THB", "base": "USD"}

@app.get("/api/data", response_model=List[Dict[str, Any]])
async def get_vault_data(db: Client = Depends(get_supabase)):
    """Fetch all historical net worth entries."""
    try:
        response = db.table("networth_entries").select("*").execute()
        # Transform data to ensure frontend-friendly naming
        transformed = []
        for row in response.data:
            transformed.append({
                "id": row.get("id"),
                "Year": row.get("Year"),
                "Month": row.get("Month"),
                "Cash Reserves": float(row.get("Cash Reserves", 0)),
                "Bitcoin": float(row.get("Bitcoin", 0)),
                "U.S Portfolio": float(row.get("U.S Portfolio", 0)),
                "Liabilities": float(row.get("Liabilities", 0))
            })
        return sorted(transformed, key=lambda x: (x["Year"], x["Month"]))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database Fetch Error: {str(e)}")

@app.post("/api/save")
async def record_position(entry: VaultEntry, db: Client = Depends(get_supabase)):
    """Save or update a net worth entry for a specific month/year."""
    try:
        # Pydantic handles aliasing, but Supabase needs the exact column names
        data = {
            "Year": entry.Year,
            "Month": entry.Month,
            "Cash Reserves": entry.Cash_Reserves,
            "Bitcoin": entry.Bitcoin,
            "U.S Portfolio": entry.US_Portfolio,
            "Liabilities": entry.Liabilities
        }
        
        # Check for existing record to perform upsert
        check = db.table("networth_entries").select("id").match({
            "Year": entry.Year, 
            "Month": entry.Month
        }).execute()

        if check.data:
            entry_id = check.data[0]['id']
            db.table("networth_entries").update(data).eq("id", entry_id).execute()
            return {"status": "updated", "id": entry_id}
        else:
            res = db.table("networth_entries").insert(data).execute()
            return {"status": "created", "data": res.data}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transaction Failure: {str(e)}")

@app.get("/api/targets")
async def get_rebalance_targets(db: Client = Depends(get_supabase)):
    """Fetch user-defined allocation targets."""
    try:
        response = db.table("rebalance_targets").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/targets")
async def update_rebalance_targets(targets: List[TargetAllocation], db: Client = Depends(get_supabase)):
    """Update rebalancing strategy configuration."""
    try:
        for t in targets:
            db.table("rebalance_targets").upsert({
                "category_name": t.category_name,
                "target_percentage": t.target_percentage
            }, on_conflict="category_name").execute()
        return {"status": "strategy_updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Strategy Update Failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Set to port 5001 to match the Vite proxy configuration
    uvicorn.run(app, host="0.0.0.0", port=5001)
