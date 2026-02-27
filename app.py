import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import os
import yfinance as yf
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# --- CONFIG & STYLING ---
st.set_page_config(
    page_title="AURUM // Net Worth Architecture",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for "Industrial Luxury / Swiss Editorial" Aesthetic
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syncopate:wght@400;700&family=Inter:wght@300;400;600&display=swap');

    :root {
        --bg-dark: #0a0a0a;
        --accent-gold: #d4af37;
        --accent-gold-muted: rgba(212, 175, 55, 0.1);
        --text-main: #e0e0e0;
        --border-color: #262626;
        --card-bg: #111111;
    }

    .stApp {
        background-color: var(--bg-dark);
        color: var(--text-main);
    }

    h1, h2, h3, .stText, p {
        font-family: 'Inter', sans-serif !important;
    }
    
    .mono {
        font-family: 'Space Mono', monospace !important;
    }

    .main-header {
        font-family: 'Syncopate', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.3em;
        color: var(--accent-gold);
        border-bottom: 1px solid var(--accent-gold);
        padding-bottom: 10px;
        margin-bottom: 30px;
    }

    section[data-testid="stSidebar"] {
        background-color: #050505 !important;
        border-right: 1px solid var(--border-color);
    }
    
    div[data-testid="stMetric"] {
        background-color: var(--card-bg);
        border: 1px solid var(--border-color);
        padding: 20px !important;
        border-radius: 0px !important;
        transition: all 0.3s ease;
    }
    
    div[data-testid="stMetricLabel"] {
        font-family: 'Space Mono', monospace !important;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #888 !important;
        font-size: 0.8rem !important;
    }

    div[data-testid="stMetricValue"] {
        font-family: 'Syncopate', sans-serif !important;
        color: #fff !important;
        font-size: 1.8rem !important;
    }

    .stButton>button {
        width: 100%;
        background-color: transparent !important;
        color: var(--accent-gold) !important;
        border: 1px solid var(--accent-gold) !important;
        border-radius: 0px !important;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        font-family: 'Space Mono', monospace;
        transition: 0.4s;
    }
    
    .stButton>button:hover {
        background-color: var(--accent-gold) !important;
        color: #000 !important;
    }

    .stDataFrame {
        border: 1px solid var(--border-color);
    }
    
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    .gold-divider {
        height: 1px;
        background: linear-gradient(90deg, var(--accent-gold) 0%, transparent 100%);
        margin: 20px 0;
    }
</style>
""", unsafe_allow_html=True)

# --- DATA ENGINE (SUPABASE) ---
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
TABLE_NAME = "networth_entries"
ASSET_COLS = ["Cash Reserves", "Bitcoin", "U.S Portfolio"]
DATA_COLS = ["Year", "Month"] + ASSET_COLS + ["Liabilities"]

# Create supabase client
supabase: Client = create_client(url, key) if url and key else None

def load_data():
    if not supabase:
        return pd.DataFrame(columns=DATA_COLS)
    
    try:
        response = supabase.table(TABLE_NAME).select("*").execute()
        if response.data:
            df = pd.DataFrame(response.data)
            # Rename for display if needed (supabase might lowercase keys)
            # Ensure columns match our expected names
            return df.sort_values(by=["Year", "Month"])
        return pd.DataFrame(columns=DATA_COLS)
    except Exception as e:
        st.error(f"Supabase fetch error: {e}")
        return pd.DataFrame(columns=DATA_COLS)

def save_entry(data):
    if not supabase:
        st.error("Supabase client not initialized. Check .env")
        return False
    
    try:
        # Check for existing record
        mask = {"Year": data["Year"], "Month": data["Month"]}
        response = supabase.table(TABLE_NAME).select("id").match(mask).execute()
        
        if response.data:
            # Update existing
            entry_id = response.data[0]['id']
            supabase.table(TABLE_NAME).update(data).eq("id", entry_id).execute()
        else:
            # Insert new
            supabase.table(TABLE_NAME).insert(data).execute()
        return True
    except Exception as e:
        st.error(f"Supabase save error: {e}")
        return False

@st.cache_data(ttl=3600)
def get_usd_thb_rate():
    try:
        data = yf.Ticker("USDTHB=X").history(period="1d")
        if not data.empty:
            return data['Close'].iloc[-1]
        return 35.0
    except Exception:
        return 35.0

MONTH_NAMES = ["January", "February", "March", "April", "May", "June", 
               "July", "August", "September", "October", "November", "December"]

# --- SIDEBAR: ARCHITECT CONTROL ---
with st.sidebar:
    st.markdown("<h2 style='font-family:Syncopate; color:#d4af37; font-size:1.2rem;'>SYSTEM CONFIG</h2>", unsafe_allow_html=True)
    currency = st.selectbox("BASE CURRENCY", ["THB", "USD"])
    
    rate = 1.0
    symbol = "฿"
    if currency == "USD":
        rate = get_usd_thb_rate()
        symbol = "$"
        st.caption(f"LIVE RATE: 1 USD = {rate:.2f} THB")

    st.markdown("<div class='gold-divider'></div>", unsafe_allow_html=True)
    st.markdown("<h2 style='font-family:Syncopate; color:#d4af37; font-size:1.2rem;'>ARCHITECT INPUT</h2>", unsafe_allow_html=True)
    
    with st.form("entry_form"):
        year_input = st.number_input("YEAR", min_value=2000, max_value=2100, value=datetime.now().year, step=1)
        month_input = st.selectbox("MONTH", range(1, 13), format_func=lambda x: MONTH_NAMES[x-1], index=datetime.now().month-1)
        st.caption(f"Enter values in {currency}")
        
        cash = st.number_input("CASH RESERVES", min_value=0.0, step=1000.0)
        bitcoin = st.number_input("BITCOIN", min_value=0.0, step=0.0001, format="%.4f")
        us_portfolio = st.number_input("U.S PORTFOLIO", min_value=0.0, step=1000.0)
        liabilities = st.number_input("TOTAL OBLIGATIONS", min_value=0.0, step=1000.0)
        
        submitted = st.form_submit_button("RECORD POSITION")

# --- APP LOGIC ---
if not supabase:
    st.warning("SUPABASE CONNECTION REQUIRED. PLEASE CONFIGURE .ENV")

df = load_data()

if submitted:
    stored_vals = [val * rate if currency == "USD" else val for val in [cash, bitcoin, us_portfolio, liabilities]]

    new_entry = {
        "Year": int(year_input), 
        "Month": int(month_input),
        "Cash Reserves": stored_vals[0], 
        "Bitcoin": stored_vals[1],
        "U.S Portfolio": stored_vals[2], 
        "Liabilities": stored_vals[3]
    }
    
    if save_entry(new_entry):
        st.sidebar.success("POSITION SECURED")
        st.rerun()

# --- MAIN DASHBOARD ---
st.markdown("<h1 class='main-header'>AURUM NET WORTH ARCHITECTURE</h1>", unsafe_allow_html=True)

if not df.empty:
    display_df = df.copy()
    display_df = display_df.sort_values(by=["Year", "Month"])
    
    convert_cols = ASSET_COLS + ["Liabilities"]
    for col in convert_cols:
        display_df[col] = display_df[col].astype(float) / rate

    display_df['Total Net Worth'] = display_df[ASSET_COLS].sum(axis=1) - display_df['Liabilities']
    display_df['Date'] = display_df.apply(lambda x: f"{MONTH_NAMES[int(x['Month'])-1][:3]} {int(x['Year'])}", axis=1)
    
    latest = display_df.iloc[-1]
    prev = display_df.iloc[-2] if len(display_df) > 1 else None

    # Top Metrics
    m1, m2, m3 = st.columns(3)
    
    with m1:
        delta = (latest['Total Net Worth'] - prev['Total Net Worth']) if prev is not None else None
        st.metric("AGGREGATED EQUITY", f"{symbol}{latest['Total Net Worth']:,.2f}", delta=f"{delta:,.0f}" if delta else None)
    
    with m2:
        total_assets = latest[ASSET_COLS].sum()
        st.metric("GROSS EXPOSURE", f"{symbol}{total_assets:,.2f}")
        
    with m3:
        st.metric("LEVERAGE / DEBT", f"{symbol}{latest['Liabilities']:,.0f}", delta_color="inverse")

    st.markdown("<div style='margin-top:40px;'></div>", unsafe_allow_html=True)

    # Charts Row
    c1, c2 = st.columns([2, 1])

    with c1:
        st.markdown(f"<h3 style='font-family:Space Mono; font-size:0.9rem; color:#888;'>PROJECTION GROWTH CURVE ({currency})</h3>", unsafe_allow_html=True)
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=display_df['Date'], y=display_df['Total Net Worth'],
            mode='lines+markers',
            line=dict(color='#d4af37', width=3),
            marker=dict(size=10, color='#fff', line=dict(color='#d4af37', width=2)),
            fill='tozeroy',
            fillcolor='rgba(212, 175, 55, 0.05)'
        ))
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
            margin=dict(l=0, r=0, t=20, b=0),
            xaxis=dict(showgrid=False, color='#555', tickfont=dict(family='Space Mono')),
            yaxis=dict(showgrid=True, gridcolor='#222', color='#555', tickfont=dict(family='Space Mono')),
            height=400
        )
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.markdown(f"<h3 style='font-family:Space Mono; font-size:0.9rem; color:#888;'>ALLOCATION STRUCTURE ({currency})</h3>", unsafe_allow_html=True)
        values = [latest[col] for col in ASSET_COLS]
        
        fig_pie = go.Figure(data=[go.Pie(
            labels=ASSET_COLS, values=values,
            hole=.6,
            marker=dict(colors=['#1a1a1a', '#d4af37', '#888']),
            textinfo='none'
        )])
        fig_pie.update_layout(
            showlegend=True,
            legend=dict(font=dict(family='Space Mono', color='#888', size=10), orientation="h", yanchor="bottom", y=-0.2),
            paper_bgcolor='rgba(0,0,0,0)',
            margin=dict(l=0, r=0, t=20, b=0),
            height=400
        )
        st.plotly_chart(fig_pie, use_container_width=True)

    # Ledger
    st.markdown("<div style='margin-top:40px;'></div>", unsafe_allow_html=True)
    st.markdown(f"<h3 style='font-family:Space Mono; font-size:0.9rem; color:#888;'>HISTORICAL LEDGER RAW DATA ({currency})</h3>", unsafe_allow_html=True)
    
    ledger_df = display_df.drop(columns=['Total Net Worth', 'Date', 'id' if 'id' in display_df else '']).sort_values(['Year', 'Month'], ascending=False)
    ledger_df['Month'] = ledger_df['Month'].apply(lambda x: MONTH_NAMES[int(x)-1])
    
    st.dataframe(
        ledger_df.style.format({col: "{:,.2f}" for col in convert_cols + ["Year"]}),
        use_container_width=True
    )

else:
    st.markdown("<div style='text-align:center; padding: 100px; border: 1px dashed #333;'>", unsafe_allow_html=True)
    st.markdown("<h2 style='font-family:Syncopate; color:#444;'>NO POSITIONS RECORDED</h2>", unsafe_allow_html=True)
    st.markdown("<p style='font-family:Space Mono; color:#666;'>INITIALize YOUR ARCHITECTURE IN THE SIDEBAR</p>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

# Footer Overlay
st.markdown(f"""
<div style='position: fixed; bottom: 20px; right: 20px; font-family: Space Mono; font-size: 0.7rem; color: #333;'>
    SYSTEM VER 2.0.26 FX_RATE: {rate:.2f} ENCRYPTED_VAULT
</div>
""", unsafe_allow_html=True)
