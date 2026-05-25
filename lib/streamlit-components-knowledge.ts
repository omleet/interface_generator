// ---------------------------------------------------------------------------
// Streamlit Third-Party Components Knowledge Base
// ---------------------------------------------------------------------------
// Curated collection of the most popular & actively-maintained community
// components, each with:
//   • exact pip install string
//   • verified import statement
//   • minimal working example (copy-paste ready)
//   • requirements.txt entry
//   • tags for BM25 matching
//
// Why this file exists:
//   The official llms.txt covers only the core Streamlit API. When a user
//   asks for a map, a rich grid, Lottie animations, or an option menu, the
//   LLM has no grounded reference and hallucinates the API. This knowledge
//   base gives it exact, tested call signatures so it generates runnable code.
//
// Selection criteria (all entries must satisfy ≥ 2):
//   • ≥ 50k PyPI downloads/month OR ≥ 500 GitHub stars
//   • Actively maintained (last release < 12 months)
//   • Covers a capability not available in core Streamlit
// ---------------------------------------------------------------------------

export interface StreamlitComponent {
  /** PyPI package name */
  id: string
  /** Human-readable display name */
  name: string
  /** One-sentence description of what this component does */
  description: string
  /** pip install command(s) — may include companion packages */
  install: string
  /** requirements.txt line(s) */
  requirements: string
  /** Import statement(s) to use in app.py */
  importStatement: string
  /** Minimal working example — must be copy-paste runnable */
  example: string
  /** Tags for BM25 search matching (EN + PT common terms) */
  tags: string[]
  /** Category for grouping */
  category: 'map' | 'grid' | 'chart' | 'ui' | 'media' | 'auth' | 'data' | 'layout' | 'ai'
}

export const STREAMLIT_COMPONENTS: StreamlitComponent[] = [
  // ─── MAPS ────────────────────────────────────────────────────────────────

  {
    id: 'streamlit-folium',
    name: 'streamlit-folium',
    description: 'Render interactive Folium/Leaflet maps inside Streamlit. Returns click/zoom events back to Python.',
    install: 'pip install streamlit-folium folium',
    requirements: 'streamlit-folium\nfolium',
    importStatement: 'from streamlit_folium import st_folium\nimport folium',
    example: `import streamlit as st
import folium
from streamlit_folium import st_folium

st.set_page_config(page_title='Map Demo', layout='wide')
st.title('🗺️ Interactive Map')

m = folium.Map(location=[38.716, -9.139], zoom_start=13)  # Lisbon default
folium.Marker(
    [38.716, -9.139],
    popup='<b>Location</b>',
    tooltip='Click me',
    icon=folium.Icon(color='red', icon='info-sign'),
).add_to(m)

map_data = st_folium(m, width='100%', height=500)

if map_data and map_data.get('last_clicked'):
    lat = map_data['last_clicked']['lat']
    lng = map_data['last_clicked']['lng']
    st.success(f'Clicked at: {lat:.4f}, {lng:.4f}')`,
    tags: ['map', 'mapa', 'leaflet', 'folium', 'geo', 'location', 'coordinates', 'marker', 'interative', 'click'],
    category: 'map',
  },

  {
    id: 'pydeck',
    name: 'pydeck (st.pydeck_chart)',
    description: 'High-performance 3D maps via deck.gl — built into Streamlit, no extra install. Scatter plots, hexbins, arcs, etc. on top of maps.',
    install: 'pip install pydeck',
    requirements: 'pydeck',
    importStatement: 'import pydeck as pdk',
    example: `import streamlit as st
import pydeck as pdk
import pandas as pd

st.set_page_config(page_title='Deck.gl Map', layout='wide')
st.title('📍 Pydeck Map')

df = pd.DataFrame({
    'lat': [38.716, 38.720, 38.710, 38.725, 38.705],
    'lon': [-9.139, -9.145, -9.130, -9.150, -9.135],
    'name': ['Point A', 'Point B', 'Point C', 'Point D', 'Point E'],
    'value': [100, 250, 180, 320, 90],
})

layer = pdk.Layer(
    'ScatterplotLayer',
    data=df,
    get_position='[lon, lat]',
    get_color='[200, 30, 0, 160]',
    get_radius='value',
    pickable=True,
)
view_state = pdk.ViewState(latitude=38.716, longitude=-9.139, zoom=12, pitch=40)
r = pdk.Deck(layers=[layer], initial_view_state=view_state, tooltip={'text': '{name}\\nValue: {value}'})
st.pydeck_chart(r)`,
    tags: ['map', 'mapa', 'pydeck', 'deck.gl', '3d', 'scatter', 'hexbin', 'arc', 'geospatial', 'heatmap'],
    category: 'map',
  },

  // ─── GRID / DATA TABLE ───────────────────────────────────────────────────

  {
    id: 'streamlit-aggrid',
    name: 'streamlit-aggrid',
    description: 'AG Grid inside Streamlit — editable cells, sorting, filtering, pagination, row selection, Excel export.',
    install: 'pip install streamlit-aggrid',
    requirements: 'streamlit-aggrid',
    importStatement: 'from st_aggrid import AgGrid, GridOptionsBuilder, GridUpdateMode',
    example: `import streamlit as st
import pandas as pd
from st_aggrid import AgGrid, GridOptionsBuilder, GridUpdateMode

st.set_page_config(page_title='AG Grid Demo', layout='wide')
st.title('📊 Editable AG Grid')

df = pd.DataFrame({
    'Name': ['Alice', 'Bob', 'Carol', 'David', 'Eve'],
    'Department': ['Engineering', 'Sales', 'Marketing', 'Engineering', 'HR'],
    'Salary': [85000, 72000, 68000, 91000, 63000],
    'Active': [True, True, False, True, True],
})

gb = GridOptionsBuilder.from_dataframe(df)
gb.configure_pagination(paginationAutoPageSize=True)
gb.configure_side_bar()
gb.configure_selection('multiple', use_checkbox=True)
gb.configure_default_column(editable=True, groupable=True)
grid_options = gb.build()

grid_response = AgGrid(
    df,
    gridOptions=grid_options,
    update_mode=GridUpdateMode.MODEL_CHANGED,
    fit_columns_on_grid_load=True,
    height=350,
    theme='streamlit',
)

selected = grid_response['selected_rows']
if selected is not None and len(selected) > 0:
    st.write('### Selected Rows')
    st.dataframe(pd.DataFrame(selected), use_container_width=True)`,
    tags: ['grid', 'table', 'tabela', 'aggrid', 'editable', 'filter', 'sort', 'pagination', 'select', 'excel', 'export'],
    category: 'grid',
  },

  // ─── CHARTS ──────────────────────────────────────────────────────────────

  {
    id: 'streamlit-echarts',
    name: 'streamlit-echarts',
    description: 'Apache ECharts in Streamlit — rich interactive charts: gauge, radar, sunburst, sankey, heatmap, candlestick.',
    install: 'pip install streamlit-echarts',
    requirements: 'streamlit-echarts',
    importStatement: 'from streamlit_echarts import st_echarts',
    example: `import streamlit as st
from streamlit_echarts import st_echarts

st.set_page_config(page_title='ECharts Demo', layout='wide')
st.title('📈 ECharts — Gauge + Bar')

col1, col2 = st.columns(2)

with col1:
    st.subheader('Gauge')
    gauge_options = {
        'series': [{
            'type': 'gauge',
            'startAngle': 180, 'endAngle': 0,
            'min': 0, 'max': 100,
            'splitNumber': 5,
            'data': [{'value': 73, 'name': 'Progress'}],
            'axisLine': {'lineStyle': {'width': 12, 'color': [
                [0.3, '#fd666d'], [0.7, '#37a2da'], [1, '#67e0e3']
            ]}},
        }]
    }
    st_echarts(options=gauge_options, height='300px', key='gauge')

with col2:
    st.subheader('Bar Chart')
    bar_options = {
        'xAxis': {'type': 'category', 'data': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']},
        'yAxis': {'type': 'value'},
        'series': [{'data': [120, 200, 150, 80, 70, 110, 130], 'type': 'bar', 'color': '#37a2da'}],
        'tooltip': {'trigger': 'axis'},
    }
    st_echarts(options=bar_options, height='300px', key='bar')`,
    tags: ['chart', 'grafico', 'gauge', 'radar', 'sankey', 'heatmap', 'candlestick', 'sunburst', 'echarts', 'apache'],
    category: 'chart',
  },

  // ─── UI / NAVIGATION ─────────────────────────────────────────────────────

  {
    id: 'streamlit-option-menu',
    name: 'streamlit-option-menu',
    description: 'Horizontal or vertical navigation menu with icons — replaces st.radio for app-level navigation.',
    install: 'pip install streamlit-option-menu',
    requirements: 'streamlit-option-menu',
    importStatement: 'from streamlit_option_menu import option_menu',
    example: `import streamlit as st
from streamlit_option_menu import option_menu

st.set_page_config(page_title='Option Menu Demo', layout='wide')

# ── Sidebar vertical nav ──────────────────────────────────────────────────
with st.sidebar:
    page = option_menu(
        menu_title='Navigation',
        options=['Dashboard', 'Analytics', 'Data', 'Settings'],
        icons=['house-fill', 'bar-chart-fill', 'table', 'gear-fill'],
        menu_icon='cast',
        default_index=0,
        styles={
            'container': {'padding': '5px', 'background-color': '#f0f2f6'},
            'icon': {'color': '#4c78b0', 'font-size': '18px'},
            'nav-link-selected': {'background-color': '#4c78b0'},
        },
    )

# ── Page content based on selection ──────────────────────────────────────
if page == 'Dashboard':
    st.title('🏠 Dashboard')
    col1, col2, col3 = st.columns(3)
    col1.metric('Revenue', '$82,500', '+12%')
    col2.metric('Users', '4,521', '+8%')
    col3.metric('Orders', '1,204', '-3%')
elif page == 'Analytics':
    st.title('📊 Analytics')
    st.info('Analytics content here')
elif page == 'Data':
    st.title('🗃️ Data')
    st.info('Data content here')
elif page == 'Settings':
    st.title('⚙️ Settings')
    st.info('Settings content here')`,
    tags: ['menu', 'navigation', 'nav', 'sidebar', 'option', 'icons', 'navbar', 'navigacao', 'menu lateral'],
    category: 'ui',
  },

  {
    id: 'streamlit-lottie',
    name: 'streamlit-lottie',
    description: 'Play Lottie JSON animations in Streamlit — useful for loading states, empty states, and decorative UI.',
    install: 'pip install streamlit-lottie requests',
    requirements: 'streamlit-lottie\nrequests',
    importStatement: 'from streamlit_lottie import st_lottie\nimport requests',
    example: `import streamlit as st
import requests
from streamlit_lottie import st_lottie

st.set_page_config(page_title='Lottie Demo', layout='wide')

def load_lottie_url(url: str):
    r = requests.get(url)
    if r.status_code != 200:
        return None
    return r.json()

# Free animations from LottieFiles
lottie_coding = load_lottie_url('https://assets5.lottiefiles.com/packages/lf20_fcfjwiyb.json')
lottie_hello = load_lottie_url('https://assets9.lottiefiles.com/packages/lf20_M9p23l.json')

col1, col2 = st.columns(2)
with col1:
    st.subheader('Coding Animation')
    if lottie_coding:
        st_lottie(lottie_coding, speed=1, height=300, key='coding')
    else:
        st.error('Could not load animation')

with col2:
    st.subheader('Hello Animation')
    if lottie_hello:
        st_lottie(lottie_hello, speed=1, height=300, key='hello')
    else:
        st.error('Could not load animation')`,
    tags: ['lottie', 'animation', 'animacao', 'loading', 'spinner', 'decorative', 'json animation', 'lottiefiles'],
    category: 'media',
  },

  {
    id: 'streamlit-drawable-canvas',
    name: 'streamlit-drawable-canvas',
    description: 'Freehand drawing canvas using Fabric.js — draw shapes, annotate images, collect sketches.',
    install: 'pip install streamlit-drawable-canvas',
    requirements: 'streamlit-drawable-canvas',
    importStatement: 'from streamlit_drawable_canvas import st_canvas',
    example: `import streamlit as st
from streamlit_drawable_canvas import st_canvas
from PIL import Image
import numpy as np

st.set_page_config(page_title='Drawing Canvas', layout='wide')
st.title('✏️ Drawing Canvas')

col1, col2 = st.columns([3, 1])
with col2:
    drawing_mode = st.selectbox('Drawing tool', ['freedraw', 'line', 'rect', 'circle', 'polygon'], key='mode')
    stroke_color = st.color_picker('Stroke colour', '#000000')
    stroke_width = st.slider('Stroke width', 1, 25, 3)
    fill_color = st.color_picker('Fill colour', '#ffffff')
    realtime = st.checkbox('Realtime update', True)

with col1:
    canvas_result = st_canvas(
        fill_color=fill_color + '55',  # add alpha
        stroke_width=stroke_width,
        stroke_color=stroke_color,
        background_color='#ffffff',
        height=400,
        width=600,
        drawing_mode=drawing_mode,
        update_streamlit=realtime,
        key='canvas',
    )

if canvas_result.image_data is not None:
    st.write(f'Canvas size: {canvas_result.image_data.shape[1]}×{canvas_result.image_data.shape[0]} px')
if canvas_result.json_data is not None:
    objects = canvas_result.json_data.get('objects', [])
    if objects:
        st.write(f'{len(objects)} object(s) drawn')`,
    tags: ['canvas', 'draw', 'desenho', 'sketch', 'annotation', 'anotacao', 'freehand', 'shapes', 'image annotation'],
    category: 'media',
  },

  // ─── AUTH ─────────────────────────────────────────────────────────────────

  {
    id: 'streamlit-authenticator',
    name: 'streamlit-authenticator',
    description: 'Login/logout/register widgets with hashed passwords, cookie-based remember-me, and YAML config.',
    install: 'pip install streamlit-authenticator pyyaml',
    requirements: 'streamlit-authenticator\npyyaml',
    importStatement: 'import streamlit_authenticator as stauth\nimport yaml\nfrom yaml.loader import SafeLoader',
    example: `import streamlit as st
import streamlit_authenticator as stauth
import yaml
from yaml.loader import SafeLoader

st.set_page_config(page_title='Auth Demo', layout='wide')

# ── Config (in production, load from a YAML file) ─────────────────────────
config = {
    'credentials': {
        'usernames': {
            'admin': {
                'email': 'admin@example.com',
                'name': 'Admin User',
                # Pre-hashed password — generate with stauth.Hasher(['password']).generate()
                'password': '$2b$12$TMseNWFX3yvCm2SfPhKMqO0ZXIkk0NOFgwDEJJKHwpbSMGBOJ1kYa',
            },
        },
    },
    'cookie': {'expiry_days': 30, 'key': 'some_signature_key', 'name': 'streamlit_auth'},
    'pre-authorized': {'emails': []},
}

authenticator = stauth.Authenticate(
    config['credentials'],
    config['cookie']['name'],
    config['cookie']['key'],
    config['cookie']['expiry_days'],
)

authenticator.login()

if st.session_state.get('authentication_status'):
    authenticator.logout('Logout', 'sidebar')
    st.sidebar.write(f"Welcome, **{st.session_state['name']}**!")
    st.title('🔐 Protected Dashboard')
    st.success('You are logged in.')
elif st.session_state.get('authentication_status') is False:
    st.error('Username or password is incorrect.')
elif st.session_state.get('authentication_status') is None:
    st.warning('Please enter your username and password.')`,
    tags: ['auth', 'login', 'logout', 'password', 'autenticacao', 'authentication', 'cookie', 'register', 'users', 'secure'],
    category: 'auth',
  },

  // ─── DATA / AI ────────────────────────────────────────────────────────────

  {
    id: 'streamlit-feedback',
    name: 'streamlit-feedback',
    description: 'Thumbs up/down or star-rating feedback widgets — designed for LLM chat apps to collect user ratings on responses.',
    install: 'pip install streamlit-feedback',
    requirements: 'streamlit-feedback',
    importStatement: 'from streamlit_feedback import streamlit_feedback',
    example: `import streamlit as st
from streamlit_feedback import streamlit_feedback

st.set_page_config(page_title='Feedback Demo', layout='wide')
st.title('💬 Chat with Feedback')

if 'messages' not in st.session_state:
    st.session_state.messages = [{'role': 'assistant', 'content': 'Hello! How can I help?'}]
if 'feedback_given' not in st.session_state:
    st.session_state.feedback_given = {}

for i, msg in enumerate(st.session_state.messages):
    with st.chat_message(msg['role']):
        st.write(msg['content'])
        if msg['role'] == 'assistant' and i > 0:
            if i not in st.session_state.feedback_given:
                feedback = streamlit_feedback(
                    feedback_type='thumbs',
                    optional_text_label='[Optional] Tell us more',
                    key=f'feedback_{i}',
                )
                if feedback:
                    st.session_state.feedback_given[i] = feedback
                    st.toast('Thanks for your feedback!', icon='📝')
            else:
                st.caption('✅ Feedback submitted')

if prompt := st.chat_input('Ask something...'):
    st.session_state.messages.append({'role': 'user', 'content': prompt})
    response = f'You said: "{prompt}". This is a demo response.'
    st.session_state.messages.append({'role': 'assistant', 'content': response})
    st.rerun()`,
    tags: ['feedback', 'thumbs', 'rating', 'stars', 'avaliacao', 'llm', 'chat', 'review', 'vote'],
    category: 'ai',
  },

  {
    id: 'streamlit-tags',
    name: 'streamlit-tags',
    description: 'Tag/keyword input widget with autocomplete suggestions — users type and press Enter to add tags.',
    install: 'pip install streamlit-tags',
    requirements: 'streamlit-tags',
    importStatement: 'from streamlit_tags import st_tags',
    example: `import streamlit as st
from streamlit_tags import st_tags

st.set_page_config(page_title='Tags Demo', layout='wide')
st.title('🏷️ Tag Input')

keywords = st_tags(
    label='## Enter Keywords:',
    text='Press enter to add more',
    value=['Python', 'Streamlit'],
    suggestions=['Machine Learning', 'Data Science', 'AI', 'Deep Learning', 'NLP', 'Computer Vision'],
    maxtags=10,
    key='tags_input',
)
st.write(f'**Selected tags ({len(keywords)}):** {", ".join(keywords)}')`,
    tags: ['tags', 'keywords', 'chip', 'badge', 'input', 'autocomplete', 'multi', 'etiquetas'],
    category: 'ui',
  },

  {
    id: 'streamlit-agraph',
    name: 'streamlit-agraph',
    description: 'Interactive network/graph visualisation using react-graph-vis — nodes, edges, physics layout.',
    install: 'pip install streamlit-agraph',
    requirements: 'streamlit-agraph',
    importStatement: 'from streamlit_agraph import agraph, Node, Edge, Config',
    example: `import streamlit as st
from streamlit_agraph import agraph, Node, Edge, Config

st.set_page_config(page_title='Graph Demo', layout='wide')
st.title('🕸️ Network Graph')

nodes = [
    Node(id='1', label='Alice', size=25, color='#4c78b0'),
    Node(id='2', label='Bob', size=20, color='#f28e2b'),
    Node(id='3', label='Carol', size=20, color='#e15759'),
    Node(id='4', label='David', size=18, color='#76b7b2'),
    Node(id='5', label='Eve', size=18, color='#59a14f'),
]
edges = [
    Edge(source='1', target='2', label='knows'),
    Edge(source='1', target='3', label='works with'),
    Edge(source='2', target='4', label='manages'),
    Edge(source='3', target='5', label='collaborates'),
    Edge(source='4', target='5', label='reports to'),
]
config = Config(
    width=700, height=450,
    directed=False,
    physics=True,
    hierarchical=False,
)
return_value = agraph(nodes=nodes, edges=edges, config=config)
if return_value:
    st.write(f'Clicked node: **{return_value}**')`,
    tags: ['graph', 'network', 'node', 'edge', 'grafo', 'rede', 'relationship', 'vis', 'topology'],
    category: 'chart',
  },

  {
    id: 'streamlit-image-coordinates',
    name: 'streamlit-image-coordinates',
    description: 'Returns pixel coordinates when user clicks on an image — useful for image annotation and region selection.',
    install: 'pip install streamlit-image-coordinates',
    requirements: 'streamlit-image-coordinates',
    importStatement: 'from streamlit_image_coordinates import streamlit_image_coordinates',
    example: `import streamlit as st
from streamlit_image_coordinates import streamlit_image_coordinates

st.set_page_config(page_title='Image Coordinates', layout='wide')
st.title('🖱️ Click on the Image')
st.caption('Click anywhere on the image to get pixel coordinates.')

value = streamlit_image_coordinates(
    'https://placekitten.com/400/300',
    key='image_coords',
)

if value is not None:
    st.success(f'Clicked at: x={value["x"]}, y={value["y"]}')`,
    tags: ['image', 'click', 'coordinates', 'annotation', 'pixel', 'imagem', 'clique', 'detection'],
    category: 'media',
  },

  {
    id: 'plotly-express-advanced',
    name: 'Plotly Express — Advanced Patterns',
    description: 'Advanced Plotly Express chart patterns not covered by core Streamlit: candlestick, treemap, sunburst, funnel, timeline (Gantt), 3D scatter.',
    install: 'pip install plotly',
    requirements: 'plotly',
    importStatement: 'import plotly.express as px\nimport plotly.graph_objects as go',
    example: `import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

st.set_page_config(page_title='Advanced Plotly', layout='wide')
st.title('📊 Advanced Plotly Charts')

tab1, tab2, tab3 = st.tabs(['Treemap', 'Candlestick', '3D Scatter'])

with tab1:
    df_tree = pd.DataFrame({
        'region': ['North', 'North', 'South', 'South', 'East', 'West'],
        'product': ['A', 'B', 'C', 'D', 'E', 'F'],
        'sales': [120, 80, 200, 150, 90, 170],
    })
    fig = px.treemap(df_tree, path=['region', 'product'], values='sales', title='Sales Treemap')
    st.plotly_chart(fig, use_container_width=True)

with tab2:
    df_ohlc = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=30),
        'open': [100+i+(-1)**i*2 for i in range(30)],
        'high': [105+i for i in range(30)],
        'low': [95+i for i in range(30)],
        'close': [102+i+(-1)**i*1.5 for i in range(30)],
    })
    fig2 = go.Figure(go.Candlestick(
        x=df_ohlc['date'], open=df_ohlc['open'], high=df_ohlc['high'],
        low=df_ohlc['low'], close=df_ohlc['close'],
    ))
    fig2.update_layout(title='OHLC Candlestick', xaxis_rangeslider_visible=False)
    st.plotly_chart(fig2, use_container_width=True)

with tab3:
    df_3d = pd.DataFrame({
        'x': [1,2,3,4,5,6,7,8], 'y': [2,4,1,3,6,2,5,4], 'z': [3,1,4,2,5,3,2,6],
        'category': ['A','A','B','B','C','C','A','B'],
        'size': [10,15,12,18,8,20,14,11],
    })
    fig3 = px.scatter_3d(df_3d, x='x', y='y', z='z', color='category', size='size',
                         title='3D Scatter Plot')
    st.plotly_chart(fig3, use_container_width=True)`,
    tags: ['plotly', 'candlestick', 'treemap', 'sunburst', 'funnel', 'gantt', 'timeline', '3d', 'ohlc', 'finance', 'stock'],
    category: 'chart',
  },

  {
    id: 'streamlit-pandas-profiling',
    name: 'ydata-profiling (pandas profiling)',
    description: 'One-click exploratory data analysis report for any DataFrame — distributions, correlations, missing values.',
    install: 'pip install ydata-profiling streamlit-pandas-profiling',
    requirements: 'ydata-profiling\nstreamlit-pandas-profiling',
    importStatement: 'from ydata_profiling import ProfileReport\nfrom streamlit_pandas_profiling import st_profile_report',
    example: `import streamlit as st
import pandas as pd
from ydata_profiling import ProfileReport
from streamlit_pandas_profiling import st_profile_report

st.set_page_config(page_title='Data Profile', layout='wide')
st.title('🔍 Automated EDA')

uploaded = st.file_uploader('Upload a CSV file', type=['csv'])
if uploaded:
    df = pd.read_csv(uploaded)
    st.write(f'Shape: {df.shape[0]} rows × {df.shape[1]} columns')
    with st.spinner('Generating profile report…'):
        pr = ProfileReport(df, explorative=True, minimal=True)
    st_profile_report(pr)
else:
    st.info('Upload a CSV to generate an automated exploratory data analysis report.')`,
    tags: ['profiling', 'eda', 'exploratory', 'analysis', 'statistics', 'correlations', 'missing', 'distribution', 'analise'],
    category: 'data',
  },
]

// ---------------------------------------------------------------------------
// BM25-ready context builder for the components knowledge base
// ---------------------------------------------------------------------------

export function getComponentContext(query: string, topK = 3): string {
  const q = query.toLowerCase()
  const words = q.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length >= 2)

  // Score each component by tag + name + description overlap
  const scored = STREAMLIT_COMPONENTS.map((comp) => {
    const allText = [
      ...comp.tags,
      comp.name.toLowerCase(),
      comp.description.toLowerCase(),
      comp.id.toLowerCase(),
    ].join(' ')

    let score = 0
    for (const word of words) {
      // Exact tag match — highest weight
      if (comp.tags.some((t) => t.toLowerCase() === word)) score += 5
      // Partial tag match
      else if (comp.tags.some((t) => t.toLowerCase().includes(word))) score += 3
      // Name/ID match
      if (comp.id.includes(word) || comp.name.toLowerCase().includes(word)) score += 4
      // Description match
      if (comp.description.toLowerCase().includes(word)) score += 2
      // General text match
      if (allText.includes(word)) score += 1
    }
    return { comp, score }
  })

  const relevant = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ comp }) => comp)

  if (relevant.length === 0) return ''

  const sections = relevant.map(
    (comp) =>
      `### ${comp.name}\n` +
      `${comp.description}\n\n` +
      `**Install:** \`${comp.install}\`\n` +
      `**requirements.txt:** \`\`\`\n${comp.requirements}\n\`\`\`\n\n` +
      `**Import:**\n\`\`\`python\n${comp.importStatement}\n\`\`\`\n\n` +
      `**Working example:**\n\`\`\`python\n${comp.example}\n\`\`\`\n`,
  )

  return (
    '# Streamlit Third-Party Components\n' +
    'Use these when the user needs functionality beyond the core Streamlit API.\n' +
    'The examples below are verified and copy-paste ready.\n\n' +
    sections.join('\n---\n\n')
  )
}

// ---------------------------------------------------------------------------
// Utility: get requirements for components referenced in generated code
// ---------------------------------------------------------------------------
export function detectRequiredComponents(code: string): string[] {
  const requirements: string[] = []
  for (const comp of STREAMLIT_COMPONENTS) {
    const importPkg = comp.importStatement.split('\n')[0]
    // Check if any import line appears in the generated code
    const pkgName = importPkg.replace('import ', '').replace('from ', '').split(' ')[0]
    if (code.includes(pkgName)) {
      requirements.push(...comp.requirements.split('\n').filter(Boolean))
    }
  }
  return [...new Set(requirements)]
}
