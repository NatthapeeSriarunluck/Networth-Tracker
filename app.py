import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import os
import yfinance as yf
from datetime import datetime

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

# --- DATA ENGINE ---
DATA_FILE = "networth_data.csv"

def load_data():
    if not os.path.exists(DATA_FILE):
        df = pd.DataFrame(columns=["Year", "Month", "Cash", "Investments", "Real Estate", "Other Assets", "Liabilities"])
        df.to_csv(DATA_FILE, index=False)
    else:
        df = pd.read_csv(DATA_FILE)
        if "Month" not in df.columns:
            df["Month"] = 12 # Default to Dec for old year-only records
            df.to_csv(DATA_FILE, index=False)
    return df

def save_data(df):
    df.to_csv(DATA_FILE, index=False)

@st.cache_data(ttl=3600) # Cache rate for 1 hour
def get_usd_thb_rate():
    try:
        data = yf.Ticker("USDTHB=X").history(period="1d")
        if not data.empty:
            return data['Close'].iloc[-1]
        return 35.0
    except Exception as e:
        return 35.0

# Month names for selection
MONTH_NAMES = ["January", "February", "March", "April", "May", "June", 
               "July", "August", "September", "October", "November", "December"]

# --- SIDEBAR: ARCHITECT CONTROL ---
with st.sidebar:
    st.markdown("<h2 style='font-family:Syncopate; color:#d4af37; font-size:1.2rem;'>SYSTEM // CONFIG</h2>", unsafe_allow_html=True)
    currency = st.selectbox("BASE CURRENCY", ["THB", "USD"])
    
    rate = 1.0
    symbol = "฿"
    if currency == "USD":
        rate = get_usd_thb_rate()
        symbol = "$"
        st.caption(f"LIVE RATE: 1 USD = {rate:.2f} THB")

    st.markdown("<div class='gold-divider'></div>", unsafe_allow_html=True)
    st.markdown("<h2 style='font-family:Syncopate; color:#d4af37; font-size:1.2rem;'>ARCHITECT // INPUT</h2>", unsafe_allow_html=True)
    
    with st.form("entry_form"):
        year_input = st.number_input("YEAR", min_value=2000, max_value=2100, value=datetime.now().year, step=1)
        month_input = st.selectbox("MONTH", range(1, 13), format_func=lambda x: MONTH_NAMES[x-1], index=datetime.now().month-1)
        st.caption(f"Enter values in {currency}")
        cash = st.number_input("CASH RESERVES", min_value=0.0, step=1000.0)
        investments = st.number_input("PORTFOLIO ASSETS", min_value=0.0, step=1000.0)
        real_estate = st.number_input("IMMOBILIER", min_value=0.0, step=1000.0)
        other_assets = st.number_input("ALTERNATIVE ASSETS", min_value=0.0, step=1000.0)
        liabilities = st.number_input("TOTAL OBLIGATIONS", min_value=0.0, step=1000.0)
        
        submitted = st.form_submit_button("RECORD POSITION")

# --- APP LOGIC ---
df = load_data()

if submitted:
    stored_cash = cash * rate if currency == "USD" else cash
    stored_inv = investments * rate if currency == "USD" else investments
    stored_re = real_estate * rate if currency == "USD" else real_estate
    stored_oa = other_assets * rate if currency == "USD" else other_assets
    stored_liab = liabilities * rate if currency == "USD" else liabilities

    new_entry = {
        "Year": int(year_input), 
        "Month": int(month_input),
        "Cash": stored_cash, 
        "Investments": stored_inv,
        "Real Estate": stored_re, 
        "Other Assets": stored_oa, 
        "Liabilities": stored_liab
    }
    
    mask = (df['Year'] == year_input) & (df['Month'] == month_input)
    if mask.any():
        df.loc[mask, ["Cash", "Investments", "Real Estate", "Other Assets", "Liabilities"]] = [
            stored_cash, stored_inv, stored_re, stored_oa, stored_liab
        ]
    else:
        df = pd.concat([df, pd.DataFrame([new_entry])], ignore_index=True)
    
    df['Year'] = df['Year'].astype(int)
    df['Month'] = df['Month'].astype(int)
    df = df.sort_values(by=["Year", "Month"])
    save_data(df)
    st.rerun()

# --- MAIN DASHBOARD ---
st.markdown("<h1 class='main-header'>AURUM // NET WORTH ARCHITECTURE</h1>", unsafe_allow_html=True)

if not df.empty:
    display_df = df.copy()
    # Sort correctly before processing
    display_df = display_df.sort_values(by=["Year", "Month"])
    
    cols_to_convert = ["Cash", "Investments", "Real Estate", "Other Assets", "Liabilities"]
    for col in cols_to_convert:
        display_df[col] = display_df[col] / rate

    display_df['Total Net Worth'] = display_df['Cash'] + display_df['Investments'] + display_df['Real Estate'] + display_df['Other Assets'] - display_df['Liabilities']
    
    # Create a Date column for plotting
    display_df['Date'] = display_df.apply(lambda x: f"{MONTH_NAMES[int(x['Month'])-1][:3]} {int(x['Year'])}", axis=1)
    
    latest = display_df.iloc[-1]
    prev = display_df.iloc[-2] if len(display_df) > 1 else None

    # Top Metrics
    m1, m2, m3 = st.columns(3)
    
    with m1:
        delta = (latest['Total Net Worth'] - prev['Total Net Worth']) if prev is not None else None
        st.metric("AGGREGATED EQUITY", f"{symbol}{latest['Total Net Worth']:,.0f}", delta=f"{delta:,.0f}" if delta else None)
    
    with m2:
        total_assets = latest['Cash'] + latest['Investments'] + latest['Real Estate'] + latest['Other Assets']
        st.metric("GROSS EXPOSURE", f"{symbol}{total_assets:,.0f}")
        
    with m3:
        st.metric("LEVERAGE / DEBT", f"{symbol}{latest['Liabilities']:,.0f}", delta_color="inverse")

    st.markdown("<div style='margin-top:40px;'></div>", unsafe_allow_html=True)

    # Charts Row
    c1, c2 = st.columns([2, 1])

    with c1:
        st.markdown(f"<h3 style='font-family:Space Mono; font-size:0.9rem; color:#888;'>PROJECTION // GROWTH CURVE ({currency})</h3>", unsafe_allow_html=True)
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
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            margin=dict(l=0, r=0, t=20, b=0),
            xaxis=dict(showgrid=False, color='#555', tickfont=dict(family='Space Mono')),
            yaxis=dict(showgrid=True, gridcolor='#222', color='#555', tickfont=dict(family='Space Mono')),
            height=400
        )
        st.plotly_chart(fig, use_container_width=True)

    with c2:
        st.markdown(f"<h3 style='font-family:Space Mono; font-size:0.9rem; color:#888;'>ALLOCATION // STRUCTURE ({currency})</h3>", unsafe_allow_html=True)
        labels = ["Cash", "Investments", "Real Estate", "Other"]
        values = [latest['Cash'], latest['Investments'], latest['Real Estate'], latest['Other Assets']]
        
        fig_pie = go.Figure(data=[go.Pie(
            labels=labels, values=values,
            hole=.6,
            marker=dict(colors=['#1a1a1a', '#d4af37', '#444', '#888']),
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
    st.markdown(f"<h3 style='font-family:Space Mono; font-size:0.9rem; color:#888;'>HISTORICAL LEDGER // RAW DATA ({currency})</h3>", unsafe_allow_html=True)
    
    ledger_df = display_df.drop(columns=['Total Net Worth', 'Date']).sort_values(['Year', 'Month'], ascending=False)
    # Map month numbers to names for better readability in the table
    ledger_df['Month'] = ledger_df['Month'].apply(lambda x: MONTH_NAMES[int(x)-1])
    
    st.dataframe(
        ledger_df.style.format({col: "{:,.0f}" for col in cols_to_convert + ["Year"]}),
        use_container_width=True
    )

else:
    st.markdown("<div style='text-align:center; padding: 100px; border: 1px dashed #333;'>", unsafe_allow_html=True)
    st.markdown("<h2 style='font-family:Syncopate; color:#444;'>NO POSITIONS RECORDED</h2>", unsafe_allow_html=True)
    st.markdown("<p style='font-family:Space Mono; color:#666;'>INITIALIZE YOUR ARCHITECTURE IN THE SIDEBAR</p>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

# Footer Overlay
st.markdown(f"""
<div style='position: fixed; bottom: 20px; right: 20px; font-family: Space Mono; font-size: 0.7rem; color: #333;'>
    SYSTEM // VER 2.0.26 // FX_RATE: {rate:.2f} // ENCRYPTED_VAULT
</div>
""", unsafe_allow_html=True)
