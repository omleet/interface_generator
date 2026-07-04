import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Streamlit Dashboard Examples endpoint
// ---------------------------------------------------------------------------
// Returns curated, hand-crafted boilerplate examples for common dashboard
// patterns in Streamlit. These are self-contained Python apps used as
// few-shot examples in the RAG pipeline so the LLM generates real, runnable
// dashboard code — not chatbot code.
//
// Examples are embedded directly (no external fetch) so the endpoint is
// fast, reliable, and works offline. Each example is a complete, working
// Streamlit dashboard covering a distinct pattern.
// ---------------------------------------------------------------------------

export interface ExampleEntry {
  title: string
  description: string
  content: string // full Python source
  format: 'py'
  url: string
  tags: string[]
}

// ---------------------------------------------------------------------------
// Curated dashboard examples — embedded inline, no GitHub dependency
// ---------------------------------------------------------------------------
const DASHBOARD_EXAMPLES: ExampleEntry[] = [
  // ─── 1. KPI METRICS DASHBOARD ────────────────────────────────────────────
  {
    title: 'KPI Metrics Dashboard',
    description:
      'Multi-column KPI cards with delta indicators, a line chart for trends, and a bar chart for comparisons. Sidebar filters that actually filter the data. Uses st.metric, st.columns, st.line_chart, st.bar_chart.',
    format: 'py',
    url: 'https://docs.streamlit.io/develop/api-reference/data/st.metric',
    tags: ['kpi', 'metric', 'dashboard', 'cards', 'delta', 'columns', 'line_chart', 'bar_chart', 'sidebar', 'filter', 'vendas', 'receita', 'revenue'],
    content: `import streamlit as st
import pandas as pd
import numpy as np

st.set_page_config(page_title="KPI Dashboard", layout="wide")
st.title("KPI Dashboard")

# ── Sidebar filters ──────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Filters")
    period = st.selectbox("Period", ["Last 7 days", "Last 30 days", "Last 90 days"], key="period_sel")
    region = st.multiselect("Region", ["North", "South", "East", "West"],
                            default=["North", "South"], key="region_sel")

# ── Synthetic data (all columns share the same length = days) ────────────────
days = {"Last 7 days": 7, "Last 30 days": 30, "Last 90 days": 90}[period]
rng = np.random.default_rng(42)
dates = pd.date_range(end=pd.Timestamp.today(), periods=days)

# Build one row per (date, region) combination so the region filter is useful
region_list = region if region else ["North", "South", "East", "West"]
rows = []
for d in dates:
    for r in region_list:
        rows.append({
            "date": d,
            "region": r,
            "revenue": int(rng.integers(8_000, 15_000)),
            "users": int(rng.integers(200, 600)),
            "orders": int(rng.integers(50, 200)),
            "churn": float(rng.uniform(0.01, 0.05)),
        })
df = pd.DataFrame(rows)

# ── KPI row ──────────────────────────────────────────────────────────────────
col1, col2, col3, col4 = st.columns(4)
col1.metric("Total Revenue", f"€{df['revenue'].sum():,.0f}")
col2.metric("Total Users", f"{df['users'].sum():,}")
col3.metric("Total Orders", f"{df['orders'].sum():,}")
col4.metric("Avg Churn Rate", f"{df['churn'].mean():.1%}", delta_color="inverse")

st.divider()

# ── Charts ───────────────────────────────────────────────────────────────────
daily = df.groupby("date")[["revenue", "orders"]].sum().reset_index()

c1, c2 = st.columns(2)
with c1:
    st.subheader("Revenue Over Time")
    st.line_chart(daily.set_index("date")["revenue"])

with c2:
    st.subheader("Orders per Day")
    st.bar_chart(daily.set_index("date")["orders"])

# ── Data table ───────────────────────────────────────────────────────────────
with st.expander("Raw data"):
    st.dataframe(df, use_container_width=True, hide_index=True)
`,
  },

  // ─── 2. PLOTLY INTERACTIVE DASHBOARD ─────────────────────────────────────
  {
    title: 'Plotly Interactive Dashboard',
    description:
      'Advanced dashboard using Plotly Express and st.plotly_chart for interactive charts: scatter plot with color coding, histogram, pie/donut chart. Demonstrates st.tabs, st.plotly_chart, and plotly.express.',
    format: 'py',
    url: 'https://docs.streamlit.io/develop/api-reference/charts/st.plotly_chart',
    tags: ['plotly', 'interactive', 'scatter', 'histogram', 'pie', 'donut', 'tabs', 'plotly_chart', 'plotly_express', 'chart', 'grafico'],
    content: `import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

st.set_page_config(page_title="Sales Analytics", layout="wide")
st.title("🛒 Sales Analytics Dashboard")

# ── Sample data ──────────────────────────────────────────────────────────────
df = px.data.gapminder().query("year == 2007")

# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("⚙️ Settings")
    continents = st.multiselect("Continent", df["continent"].unique(), default=list(df["continent"].unique()))
    min_pop, max_pop = int(df["pop"].min()), int(df["pop"].max())
    pop_range = st.slider("Population range", min_pop, max_pop, (min_pop, max_pop), step=1_000_000)

filtered = df[
    df["continent"].isin(continents) &
    df["pop"].between(pop_range[0], pop_range[1])
]

# ── Tabs ─────────────────────────────────────────────────────────────────────
tab1, tab2, tab3 = st.tabs(["🌍 Bubble Chart", "📊 Distribution", "🥧 Share by Continent"])

with tab1:
    fig = px.scatter(
        filtered, x="gdpPercap", y="lifeExp",
        size="pop", color="continent", hover_name="country",
        log_x=True, size_max=60,
        title="GDP per Capita vs Life Expectancy (2007)",
        labels={"gdpPercap": "GDP per Capita (log)", "lifeExp": "Life Expectancy"},
    )
    st.plotly_chart(fig, use_container_width=True)

with tab2:
    col1, col2 = st.columns(2)
    with col1:
        fig2 = px.histogram(filtered, x="lifeExp", color="continent", nbins=30,
                            title="Life Expectancy Distribution")
        st.plotly_chart(fig2, use_container_width=True)
    with col2:
        fig3 = px.box(filtered, x="continent", y="gdpPercap", color="continent",
                      log_y=True, title="GDP per Capita by Continent")
        st.plotly_chart(fig3, use_container_width=True)

with tab3:
    share = filtered.groupby("continent")["pop"].sum().reset_index()
    fig4 = px.pie(share, names="continent", values="pop",
                  hole=0.4, title="Population Share by Continent")
    st.plotly_chart(fig4, use_container_width=True)
`,
  },

  // ─── 3. DATA TABLE + FILTERS DASHBOARD ───────────────────────────────────
  {
    title: 'Filterable Data Table Dashboard',
    description:
      'Dashboard with dynamic sidebar filters (selectbox, multiselect, slider, date_input), an ag-grid-style st.dataframe with column config, download button, and summary stats. Pattern for any data exploration app.',
    format: 'py',
    url: 'https://docs.streamlit.io/develop/api-reference/data/st.dataframe',
    tags: ['table', 'dataframe', 'filter', 'selectbox', 'multiselect', 'slider', 'download', 'csv', 'column_config', 'data', 'dados', 'tabela', 'filtro'],
    content: `import streamlit as st
import pandas as pd
import numpy as np

st.set_page_config(page_title="Data Explorer", layout="wide")
st.title("🔍 Data Explorer")

# ── Generate sample dataset ──────────────────────────────────────────────────
@st.cache_data
def load_data() -> pd.DataFrame:
    rng = np.random.default_rng(0)
    n = 500
    return pd.DataFrame({
        "id": range(1, n + 1),
        "name": [f"Product {i}" for i in range(1, n + 1)],
        "category": rng.choice(["Electronics", "Clothing", "Food", "Books", "Sports"], n),
        "price": rng.uniform(5, 500, n).round(2),
        "stock": rng.integers(0, 1000, n),
        "rating": rng.uniform(1, 5, n).round(1),
        "date_added": pd.date_range("2023-01-01", periods=n, freq="12h"),
        "active": rng.choice([True, False], n, p=[0.85, 0.15]),
    })

df = load_data()

# ── Sidebar filters ──────────────────────────────────────────────────────────
with st.sidebar:
    st.header("🔧 Filters")
    categories = st.multiselect("Category", sorted(df["category"].unique()), default=list(df["category"].unique()))
    price_range = st.slider("Price range (€)", 0.0, 500.0, (0.0, 500.0), step=5.0)
    min_rating = st.slider("Minimum rating", 1.0, 5.0, 1.0, step=0.5)
    only_active = st.checkbox("Active products only", value=False)
    date_range = st.date_input("Date added", [df["date_added"].min(), df["date_added"].max()])

# ── Apply filters ────────────────────────────────────────────────────────────
mask = (
    df["category"].isin(categories) &
    df["price"].between(price_range[0], price_range[1]) &
    (df["rating"] >= min_rating)
)
if only_active:
    mask &= df["active"]
if len(date_range) == 2:
    mask &= df["date_added"].dt.date.between(date_range[0], date_range[1])

filtered = df[mask].copy()

# ── Summary stats ────────────────────────────────────────────────────────────
c1, c2, c3, c4 = st.columns(4)
c1.metric("Products shown", len(filtered))
c2.metric("Avg price", f"€{filtered['price'].mean():.2f}" if len(filtered) else "—")
c3.metric("Avg rating", f"{filtered['rating'].mean():.1f} ⭐" if len(filtered) else "—")
c4.metric("Total stock", f"{filtered['stock'].sum():,}" if len(filtered) else "—")

st.divider()

# ── Table ────────────────────────────────────────────────────────────────────
st.subheader(f"Results ({len(filtered)} rows)")
st.dataframe(
    filtered,
    use_container_width=True,
    column_config={
        "price": st.column_config.NumberColumn("Price", format="€%.2f"),
        "rating": st.column_config.NumberColumn("Rating", format="%.1f ⭐"),
        "stock": st.column_config.ProgressColumn("Stock", max_value=1000),
        "active": st.column_config.CheckboxColumn("Active"),
        "date_added": st.column_config.DateColumn("Date Added"),
    },
    hide_index=True,
)

# ── Download ─────────────────────────────────────────────────────────────────
csv = filtered.to_csv(index=False).encode("utf-8")
st.download_button("⬇️ Download CSV", csv, "filtered_data.csv", "text/csv")
`,
  },

  // ─── 4. REAL-TIME / AUTO-REFRESH DASHBOARD ────────────────────────────────
  {
    title: 'Real-Time Auto-Refresh Dashboard',
    description:
      'Live dashboard using st.empty placeholders and st.rerun() for auto-refresh. Shows a live gauge chart, updating metrics, and a rolling time-series chart. Pattern for monitoring dashboards.',
    format: 'py',
    url: 'https://docs.streamlit.io/develop/api-reference/layout/st.empty',
    tags: ['realtime', 'real-time', 'live', 'auto-refresh', 'autorefresh', 'monitoring', 'gauge', 'empty', 'rerun', 'tempo_real', 'monitoramento', 'atualização'],
    content: `import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import time

st.set_page_config(page_title="Live Monitor", layout="wide")
st.title("Live System Monitor")

# ── Controls ─────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Controls")
    running = st.toggle("Live updates", value=True, key="running_toggle")
    refresh_interval = st.slider("Refresh interval (s)", 1, 10, 2, key="refresh_slider")
    max_points = st.slider("History length", 10, 120, 60, key="max_points_slider")

# ── Rolling history (session state) ──────────────────────────────────────────
if "history" not in st.session_state:
    st.session_state.history = pd.DataFrame(columns=["time", "cpu", "memory", "requests"])

# ── Simulate one live reading ─────────────────────────────────────────────────
rng = np.random.default_rng()
cpu = float(rng.uniform(20, 95))
memory = float(rng.uniform(40, 85))
requests = int(rng.integers(50, 500))

new_row = pd.DataFrame([{
    "time": pd.Timestamp.now(),
    "cpu": cpu,
    "memory": memory,
    "requests": requests,
}])
st.session_state.history = pd.concat(
    [st.session_state.history, new_row], ignore_index=True
).tail(max_points)
hist = st.session_state.history

# ── KPI metrics ───────────────────────────────────────────────────────────────
col1, col2, col3 = st.columns(3)
prev_cpu = hist["cpu"].iloc[-2] if len(hist) > 1 else cpu
prev_mem = hist["memory"].iloc[-2] if len(hist) > 1 else memory
prev_req = hist["requests"].iloc[-2] if len(hist) > 1 else requests

col1.metric("CPU", f"{cpu:.1f}%", delta=f"{cpu - prev_cpu:+.1f}%", delta_color="inverse")
col2.metric("Memory", f"{memory:.1f}%", delta=f"{memory - prev_mem:+.1f}%", delta_color="inverse")
col3.metric("Requests/s", requests, delta=int(requests - prev_req))

# ── Rolling chart ─────────────────────────────────────────────────────────────
st.subheader("Rolling History")
st.line_chart(hist.set_index("time")[["cpu", "memory"]], use_container_width=True)

# ── Gauge ─────────────────────────────────────────────────────────────────────
fig = go.Figure(go.Indicator(
    mode="gauge+number+delta",
    value=cpu,
    delta={"reference": 70, "increasing": {"color": "red"}, "decreasing": {"color": "green"}},
    gauge={
        "axis": {"range": [0, 100]},
        "bar": {"color": "#1f77b4"},
        "steps": [
            {"range": [0, 50], "color": "#d4edda"},
            {"range": [50, 80], "color": "#fff3cd"},
            {"range": [80, 100], "color": "#f8d7da"},
        ],
        "threshold": {"line": {"color": "red", "width": 4}, "thickness": 0.75, "value": 80},
    },
    title={"text": "CPU Usage (%)"},
))
fig.update_layout(height=250, margin=dict(t=40, b=10))
st.plotly_chart(fig, use_container_width=True)

# ── Auto-rerun ────────────────────────────────────────────────────────────────
if running:
    time.sleep(refresh_interval)
    st.rerun()
`,
  },

  // ─── 5. MULTI-PAGE ADMIN DASHBOARD ───────────────────────────────────────
  {
    title: 'Multi-Page Admin Dashboard with Sidebar Nav',
    description:
      'Admin-style dashboard with sidebar navigation using st.sidebar radio (simulating pages): Overview with metrics+charts, User Management table, Products charts, and a Settings form. Pattern for admin panels.',
    format: 'py',
    url: 'https://docs.streamlit.io/develop/concepts/multipage-apps',
    tags: ['multipage', 'admin', 'navigation', 'sidebar', 'session_state', 'radio', 'pages', 'admin_panel', 'painel', 'admin', 'navegação', 'paginas'],
    content: `import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px

st.set_page_config(page_title="Admin Panel", layout="wide", initial_sidebar_state="expanded")

# ── Sidebar navigation ────────────────────────────────────────────────────────
with st.sidebar:
    st.title("Admin Panel")
    page = st.radio(
        "Navigate",
        ["Overview", "Users", "Products", "Settings"],
        key="main_nav",
    )

# ── Inline data (all columns have matching lengths) ───────────────────────────
rng = np.random.default_rng(1)
dates = pd.date_range("2024-01-01", periods=90)                          # 90
revenue_df = pd.DataFrame({
    "date": dates,                                                        # 90
    "revenue": rng.integers(5000, 20000, 90).cumsum(),                   # 90
})
users_df = pd.DataFrame({
    "name": [f"User {i}" for i in range(1, 21)],                        # 20
    "role": rng.choice(["Admin", "Editor", "Viewer"], 20),               # 20
    "status": rng.choice(["Active", "Inactive"], 20, p=[0.8, 0.2]),      # 20
    "joined": pd.date_range("2023-01-01", periods=20, freq="15D"),       # 20
})
products_df = pd.DataFrame({
    "product": [f"SKU-{i:03d}" for i in range(1, 31)],                  # 30
    "category": rng.choice(["A", "B", "C"], 30),                        # 30
    "sales": rng.integers(10, 500, 30),                                  # 30
    "price": rng.uniform(10, 200, 30).round(2),                          # 30
})

# ── Pages ─────────────────────────────────────────────────────────────────────
if page == "Overview":
    st.title("Overview")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Total Revenue", f"€{revenue_df['revenue'].iloc[-1]:,.0f}", "+12%")
    c2.metric("Active Users", str(len(users_df[users_df["status"] == "Active"])), "+3")
    c3.metric("Products", str(len(products_df)))
    c4.metric("Avg Price", f"€{products_df['price'].mean():.2f}")
    st.plotly_chart(
        px.line(revenue_df, x="date", y="revenue", title="Cumulative Revenue"),
        use_container_width=True,
    )

elif page == "Users":
    st.title("User Management")
    status_filter = st.selectbox("Filter by status", ["All", "Active", "Inactive"], key="status_filter")
    shown = users_df if status_filter == "All" else users_df[users_df["status"] == status_filter]
    st.dataframe(shown, use_container_width=True, hide_index=True)

elif page == "Products":
    st.title("Products")
    col1, col2 = st.columns(2)
    with col1:
        fig = px.bar(
            products_df.nlargest(10, "sales"), x="product", y="sales",
            color="category", title="Top 10 Products by Sales",
            color_discrete_sequence=px.colors.qualitative.Set2,
        )
        st.plotly_chart(fig, use_container_width=True)
    with col2:
        fig2 = px.pie(products_df, names="category", values="sales",
                      title="Sales by Category", hole=0.35)
        st.plotly_chart(fig2, use_container_width=True)

elif page == "Settings":
    st.title("Settings")
    with st.form("settings_form"):
        st.subheader("General")
        app_name = st.text_input("App Name", "My Dashboard", key="app_name_input")
        language = st.selectbox("Language", ["Portuguese", "English", "Spanish"], key="lang_select")
        st.subheader("Notifications")
        email_notif = st.toggle("Email notifications", value=True, key="email_toggle")
        threshold = st.slider("Alert threshold (%)", 0, 100, 80, key="threshold_slider")
        if st.form_submit_button("Save"):
            st.success("Settings saved!")
`,
  },

  // ─── 6. FINANCIAL / STOCK DASHBOARD ──────────────────────────────────────
  {
    title: 'Financial Data Dashboard',
    description:
      'Financial dashboard with candlestick chart (Plotly), volume bars, moving averages, performance table with conditional formatting via st.dataframe column_config. Pattern for stock, crypto, or financial reporting apps.',
    format: 'py',
    url: 'https://docs.streamlit.io/develop/api-reference/charts/st.plotly_chart',
    tags: ['finance', 'financial', 'stock', 'candlestick', 'ohlc', 'moving_average', 'volume', 'portfolio', 'finança', 'bolsa', 'ações', 'investimento'],
    content: `import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots

st.set_page_config(page_title="Financial Dashboard", layout="wide")
st.title("💹 Financial Dashboard")

# ── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Settings")
    ticker = st.selectbox("Asset", ["AAPL", "TSLA", "MSFT", "AMZN", "BTC"], key="ticker_sel")
    period = st.selectbox("Period", ["1M", "3M", "6M", "1Y"], index=2, key="period_sel")
    ma_short = st.slider("Short MA (days)", 5, 20, 10, key="ma_short_sl")
    ma_long = st.slider("Long MA (days)", 25, 200, 50, key="ma_long_sl")

# ── Synthetic OHLCV data ──────────────────────────��──────────────────────────
@st.cache_data
def generate_ohlcv(ticker: str, period: str) -> pd.DataFrame:
    days = {"1M": 22, "3M": 66, "6M": 130, "1Y": 252}[period]
    rng = np.random.default_rng(abs(hash(ticker)) % 2**32)
    close = 100 * np.cumprod(1 + rng.normal(0.0005, 0.02, days))
    high = close * rng.uniform(1.00, 1.03, days)
    low = close * rng.uniform(0.97, 1.00, days)
    open_ = np.roll(close, 1); open_[0] = close[0]
    volume = rng.integers(1_000_000, 10_000_000, days)
    return pd.DataFrame({"date": pd.bdate_range(end=pd.Timestamp.today(), periods=days),
                         "open": open_, "high": high, "low": low, "close": close, "volume": volume})

df = generate_ohlcv(ticker, period)

# Cap ma_long to the number of available trading days so it never exceeds
# the DataFrame length (which would make the entire MA column NaN).
effective_long = min(ma_long, len(df))
effective_short = min(ma_short, effective_long - 1) if effective_long > 1 else 1

df[f"MA{effective_short}"] = df["close"].rolling(effective_short).mean()
df[f"MA{effective_long}"] = df["close"].rolling(effective_long).mean()

if ma_short >= ma_long:
    st.warning(f"Short MA ({ma_short}) must be less than Long MA ({ma_long}). Adjust the sliders.")
    st.stop()

# ── KPIs ─────────────────────────────────────────────────────────────────────
ret = (df["close"].iloc[-1] / df["close"].iloc[0] - 1)
vol = df["close"].pct_change().std() * np.sqrt(252)
c1, c2, c3, c4 = st.columns(4)
c1.metric(ticker, f"\${df['close'].iloc[-1]:.2f}", f"{ret:+.2%}")
c2.metric("Period High", f"\${df['high'].max():.2f}")
c3.metric("Period Low", f"\${df['low'].min():.2f}")
c4.metric("Annualised Vol", f"{vol:.1%}")

# ── Candlestick + MAs + Volume ───────────────────────────────────────────────
fig = make_subplots(rows=2, cols=1, shared_xaxes=True, row_heights=[0.7, 0.3],
                    vertical_spacing=0.03)

fig.add_trace(go.Candlestick(
    x=df["date"], open=df["open"], high=df["high"], low=df["low"], close=df["close"],
    name=ticker, increasing_line_color="#2ecc71", decreasing_line_color="#e74c3c",
), row=1, col=1)

fig.add_trace(go.Scatter(x=df["date"], y=df[f"MA{effective_short}"], name=f"MA{effective_short}",
                          line=dict(color="#3498db", width=1.5)), row=1, col=1)
fig.add_trace(go.Scatter(x=df["date"], y=df[f"MA{effective_long}"], name=f"MA{effective_long}",
                          line=dict(color="#e67e22", width=1.5)), row=1, col=1)

colors = ["#2ecc71" if c >= o else "#e74c3c" for c, o in zip(df["close"], df["open"])]
fig.add_trace(go.Bar(x=df["date"], y=df["volume"], name="Volume",
                     marker_color=colors, opacity=0.7), row=2, col=1)

fig.update_layout(xaxis_rangeslider_visible=False, height=550, showlegend=True,
                  legend=dict(orientation="h", yanchor="bottom", y=1.02))
fig.update_yaxes(title_text="Price ($)", row=1, col=1)
fig.update_yaxes(title_text="Volume", row=2, col=1)

st.plotly_chart(fig, use_container_width=True)
`,
  },
]

// ---------------------------------------------------------------------------
// GET handler — returns the embedded examples directly (no network calls)
// ---------------------------------------------------------------------------
export async function GET() {
  return NextResponse.json(DASHBOARD_EXAMPLES, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Examples-Fetched': String(DASHBOARD_EXAMPLES.length),
      'X-Examples-Errors': 'none',
    },
  })
}
