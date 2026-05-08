import type { LLMConfig, LLMMessage } from './llm-client'
import { generateCompletion } from './llm-client'

// ─── Output types ─────────────────────────────────────────────────────────────

export interface QtGeneratedCode {
  python: string
  /** Flat representation used by the code viewer — same as python */
  fullHtml: string
  /** Always 'qt-python' so consumers can branch on it */
  format: 'qt-python'
  dependencies: string[]
}

export interface QtGenerationCallbacks {
  onToken: (token: string) => void
  onComplete: (code: QtGeneratedCode) => void
  onError: (error: Error) => void
  onRefinementStart?: () => void
}

export interface QtPlanCallbacks {
  onToken: (token: string) => void
  onComplete: (plan: string) => void
  onError: (error: Error) => void
}

// ─── Qt Python RAG knowledge base ────────────────────────────────────────────
// This is an intentionally lean seed — enough to anchor the LLM on correct
// PySide6/PyQt6 idioms without overwhelming the context window. As users
// generate more Qt interfaces the snippets here can be expanded.

interface QtKnowledgeItem {
  name: string
  description: string
  tags: string[]
  snippet: string
}

const QT_KNOWLEDGE: QtKnowledgeItem[] = [
  {
    name: 'Main Window skeleton',
    description: 'Minimal PySide6 QMainWindow with central widget, status bar, and toolbar',
    tags: ['window', 'mainwindow', 'skeleton', 'layout', 'base'],
    snippet: `from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QStatusBar, QToolBar
)
from PySide6.QtCore import Qt
import sys

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Dashboard")
        self.setMinimumSize(1200, 700)
        central = QWidget()
        self.setCentralWidget(central)
        self.layout = QVBoxLayout(central)
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())`,
  },
  {
    name: 'QGridLayout dashboard grid',
    description: 'Responsive grid of KPI cards using QGridLayout',
    tags: ['grid', 'layout', 'kpi', 'card', 'widget'],
    snippet: `from PySide6.QtWidgets import QGridLayout, QFrame, QLabel, QVBoxLayout
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont

class KPICard(QFrame):
    def __init__(self, title: str, value: str, unit: str = "", color: str = "#3498db"):
        super().__init__()
        self.setFrameShape(QFrame.StyledPanel)
        self.setStyleSheet(f"""
            KPICard {{ background: {color}; border-radius: 8px; padding: 12px; }}
            QLabel#value {{ color: white; font-size: 28px; font-weight: bold; }}
            QLabel#title {{ color: rgba(255,255,255,0.85); font-size: 13px; }}
            QLabel#unit  {{ color: rgba(255,255,255,0.7);  font-size: 11px; }}
        """)
        layout = QVBoxLayout(self)
        lbl_title = QLabel(title); lbl_title.setObjectName("title")
        lbl_value = QLabel(value); lbl_value.setObjectName("value")
        lbl_unit  = QLabel(unit);  lbl_unit.setObjectName("unit")
        layout.addWidget(lbl_title)
        layout.addWidget(lbl_value)
        layout.addWidget(lbl_unit)`,
  },
  {
    name: 'QChart line/bar chart',
    description: 'QtCharts QChartView with line series and axis labels — requires PyQt6-Charts or PySide6',
    tags: ['chart', 'line', 'bar', 'qtcharts', 'visualization', 'graph'],
    snippet: `from PySide6.QtCharts import QChart, QChartView, QLineSeries, QValueAxis, QBarSeries, QBarSet
from PySide6.QtWidgets import QWidget, QVBoxLayout
from PySide6.QtCore import Qt
from PySide6.QtGui import QPainter

class LineChartWidget(QWidget):
    def __init__(self, title: str, x_data: list, y_data: list, parent=None):
        super().__init__(parent)
        series = QLineSeries()
        for x, y in zip(x_data, y_data):
            series.append(x, y)
        chart = QChart()
        chart.addSeries(series)
        chart.setTitle(title)
        chart.createDefaultAxes()
        chart.setAnimationOptions(QChart.SeriesAnimations)
        view = QChartView(chart)
        view.setRenderHint(QPainter.Antialiasing)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(view)`,
  },
  {
    name: 'QTableWidget data table',
    description: 'Sortable, read-only QTableWidget with custom column headers and alternating row colors',
    tags: ['table', 'grid', 'data', 'rows', 'columns', 'list'],
    snippet: `from PySide6.QtWidgets import QTableWidget, QTableWidgetItem, QHeaderView
from PySide6.QtCore import Qt

def make_table(headers: list[str], rows: list[list]) -> QTableWidget:
    table = QTableWidget(len(rows), len(headers))
    table.setHorizontalHeaderLabels(headers)
    table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
    table.setAlternatingRowColors(True)
    table.setEditTriggers(QTableWidget.NoEditTriggers)
    table.setSelectionBehavior(QTableWidget.SelectRows)
    for r, row in enumerate(rows):
        for c, cell in enumerate(row):
            item = QTableWidgetItem(str(cell))
            item.setTextAlignment(Qt.AlignCenter)
            table.setItem(r, c, item)
    return table`,
  },
  {
    name: 'QSplitter sidebar layout',
    description: 'Two-panel layout with a collapsible left sidebar (QListWidget nav) and main content area',
    tags: ['sidebar', 'navigation', 'nav', 'panel', 'splitter', 'layout'],
    snippet: `from PySide6.QtWidgets import QSplitter, QListWidget, QListWidgetItem, QStackedWidget
from PySide6.QtCore import Qt

class SidebarLayout(QSplitter):
    def __init__(self, nav_items: list[str]):
        super().__init__(Qt.Horizontal)
        self.nav = QListWidget()
        self.nav.setFixedWidth(200)
        for item in nav_items:
            self.nav.addItem(QListWidgetItem(item))
        self.stack = QStackedWidget()
        self.addWidget(self.nav)
        self.addWidget(self.stack)
        self.setStretchFactor(1, 1)
        self.nav.currentRowChanged.connect(self.stack.setCurrentIndex)`,
  },
  {
    name: 'QPushButton with icon and stylesheet',
    description: 'Styled QPushButton with icon, hover state, and click handler',
    tags: ['button', 'action', 'icon', 'interactive', 'click'],
    snippet: `from PySide6.QtWidgets import QPushButton
from PySide6.QtGui import QIcon
from PySide6.QtCore import QSize

def make_button(label: str, color: str = "#2980b9", on_click=None) -> QPushButton:
    btn = QPushButton(label)
    btn.setStyleSheet(f"""
        QPushButton {{
            background-color: {color}; color: white; border: none;
            border-radius: 4px; padding: 6px 14px; font-size: 13px;
        }}
        QPushButton:hover {{ background-color: {color}cc; }}
        QPushButton:pressed {{ background-color: {color}99; }}
    """)
    if on_click:
        btn.clicked.connect(on_click)
    return btn`,
  },
  {
    name: 'QProgressBar metric widget',
    description: 'Styled QProgressBar for displaying percentage-based KPIs',
    tags: ['progress', 'bar', 'kpi', 'percent', 'metric'],
    snippet: `from PySide6.QtWidgets import QProgressBar, QWidget, QVBoxLayout, QLabel

class MetricBar(QWidget):
    def __init__(self, label: str, value: int, color: str = "#27ae60"):
        super().__init__()
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 4)
        lbl = QLabel(f"{label}  {value}%")
        bar = QProgressBar()
        bar.setRange(0, 100)
        bar.setValue(value)
        bar.setTextVisible(False)
        bar.setFixedHeight(8)
        bar.setStyleSheet(f"""
            QProgressBar {{ border-radius: 4px; background: #ecf0f1; }}
            QProgressBar::chunk {{ border-radius: 4px; background: {color}; }}
        """)
        layout.addWidget(lbl)
        layout.addWidget(bar)`,
  },
  {
    name: 'Global dark stylesheet',
    description: 'Full application dark-mode QSS stylesheet mimicking a dark dashboard theme',
    tags: ['stylesheet', 'dark', 'theme', 'css', 'qss', 'style'],
    snippet: `DARK_STYLE = """
QMainWindow, QWidget { background-color: #1e2130; color: #e0e0e0; font-family: Segoe UI, Arial, sans-serif; }
QFrame[frameShape="4"], QFrame[frameShape="5"] { color: #2d3250; }
QGroupBox { border: 1px solid #2d3250; border-radius: 6px; margin-top: 8px; padding: 6px; }
QGroupBox::title { subcontrol-origin: margin; left: 8px; }
QTableWidget { gridline-color: #2d3250; alternate-background-color: #252840; }
QHeaderView::section { background: #2d3250; padding: 4px 8px; border: none; }
QScrollBar:vertical { background: #1e2130; width: 8px; border-radius: 4px; }
QScrollBar::handle:vertical { background: #3d4470; border-radius: 4px; }
QListWidget { background: #16192a; border: none; }
QListWidget::item:selected { background: #3d4470; border-radius: 4px; }
"""`,
  },
  {
    name: 'QPieSeries pie / doughnut chart',
    description: 'QtCharts QPieSeries pie chart with labelled slices and a centre hole for doughnut style',
    tags: ['chart', 'pie', 'doughnut', 'qtcharts', 'distribution', 'breakdown', 'visualization'],
    snippet: `from PySide6.QtCharts import QChart, QChartView, QPieSeries, QPieSlice
from PySide6.QtWidgets import QWidget, QVBoxLayout
from PySide6.QtCore import Qt
from PySide6.QtGui import QPainter, QColor

class PieChartWidget(QWidget):
    def __init__(self, title: str, data: dict, hole: float = 0.0, parent=None):
        """data = {"Label": value, ...}  |  hole=0.5 gives doughnut style"""
        super().__init__(parent)
        series = QPieSeries()
        for label, value in data.items():
            slc: QPieSlice = series.append(label, value)
            slc.setLabelVisible(True)
        series.setHoleSize(hole)          # 0.0 = solid pie, 0.5 = doughnut
        chart = QChart()
        chart.addSeries(series)
        chart.setTitle(title)
        chart.legend().setAlignment(Qt.AlignRight)
        chart.setAnimationOptions(QChart.SeriesAnimations)
        view = QChartView(chart)
        view.setRenderHint(QPainter.Antialiasing)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(view)`,
  },
  {
    name: 'QBarSeries vertical bar chart',
    description: 'QtCharts vertical bar chart with multiple named series and category axis',
    tags: ['chart', 'bar', 'column', 'qtcharts', 'comparison', 'grouped', 'visualization'],
    snippet: `from PySide6.QtCharts import (
    QChart, QChartView, QBarSeries, QBarSet,
    QBarCategoryAxis, QValueAxis
)
from PySide6.QtWidgets import QWidget, QVBoxLayout
from PySide6.QtCore import Qt
from PySide6.QtGui import QPainter

class BarChartWidget(QWidget):
    def __init__(self, title: str, categories: list[str],
                 series_data: dict, parent=None):
        """series_data = {"Series A": [v1, v2, ...], "Series B": [...]}"""
        super().__init__(parent)
        bar_series = QBarSeries()
        for name, values in series_data.items():
            bar_set = QBarSet(name)
            bar_set.append(values)
            bar_series.append(bar_set)
        axis_x = QBarCategoryAxis()
        axis_x.append(categories)
        axis_y = QValueAxis()
        chart = QChart()
        chart.addSeries(bar_series)
        chart.setTitle(title)
        chart.addAxis(axis_x, Qt.AlignBottom)
        chart.addAxis(axis_y, Qt.AlignLeft)
        bar_series.attachAxis(axis_x)
        bar_series.attachAxis(axis_y)
        chart.setAnimationOptions(QChart.SeriesAnimations)
        view = QChartView(chart)
        view.setRenderHint(QPainter.Antialiasing)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(view)`,
  },
  {
    name: 'Header bar with title and action buttons',
    description: 'Styled top header widget with application title label and right-aligned action buttons',
    tags: ['header', 'toolbar', 'title', 'navbar', 'topbar', 'buttons', 'layout'],
    snippet: `from PySide6.QtWidgets import QWidget, QHBoxLayout, QLabel, QPushButton
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont

class HeaderBar(QWidget):
    def __init__(self, title: str, actions: list[tuple[str, callable]] = None, parent=None):
        """actions = [("Refresh", self.on_refresh), ("Export", self.on_export)]"""
        super().__init__(parent)
        self.setFixedHeight(54)
        self.setStyleSheet("""
            HeaderBar { background-color: #2c3e50; border-bottom: 2px solid #1a252f; }
            QLabel#title { color: white; font-size: 16px; font-weight: bold; padding-left: 16px; }
            QPushButton { color: white; background: rgba(255,255,255,0.12); border: none;
                          border-radius: 4px; padding: 5px 12px; font-size: 12px; }
            QPushButton:hover { background: rgba(255,255,255,0.22); }
        """)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 12, 0)
        title_lbl = QLabel(title)
        title_lbl.setObjectName("title")
        layout.addWidget(title_lbl)
        layout.addStretch()
        for label, handler in (actions or []):
            btn = QPushButton(label)
            btn.clicked.connect(handler)
            layout.addWidget(btn)`,
  },
  {
    name: 'Status badge / alarm indicator',
    description: 'Coloured QLabel badge showing OK / WARNING / CRITICAL alarm states with QSS',
    tags: ['alarm', 'status', 'badge', 'indicator', 'alert', 'severity', 'scada', 'critical', 'warning'],
    snippet: `from PySide6.QtWidgets import QLabel
from PySide6.QtCore import Qt

SEVERITY_COLORS = {
    "ok":       ("#27ae60", "white"),
    "warning":  ("#f39c12", "white"),
    "critical": ("#e74c3c", "white"),
    "info":     ("#2980b9", "white"),
    "inactive": ("#95a5a6", "white"),
}

class StatusBadge(QLabel):
    def __init__(self, text: str, severity: str = "ok", parent=None):
        super().__init__(text, parent)
        self.setAlignment(Qt.AlignCenter)
        self.setFixedHeight(22)
        self.set_severity(severity)

    def set_severity(self, severity: str):
        bg, fg = SEVERITY_COLORS.get(severity.lower(), ("#95a5a6", "white"))
        self.setStyleSheet(f"""
            QLabel {{
                background-color: {bg}; color: {fg};
                border-radius: 10px; padding: 2px 10px;
                font-size: 11px; font-weight: bold;
            }}
        """)
        self.setText(self.text())`,
  },
  {
    name: 'QTabWidget multi-section panel',
    description: 'QTabWidget with multiple dashboard sections, styled tab bar',
    tags: ['tab', 'tabs', 'tabwidget', 'sections', 'panel', 'navigation', 'multi'],
    snippet: `from PySide6.QtWidgets import QTabWidget, QWidget, QVBoxLayout

class TabbedPanel(QTabWidget):
    """Drop-in replacement for a stacked content area with styled tabs."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet("""
            QTabWidget::pane { border: 1px solid #2d3250; border-radius: 4px; }
            QTabBar::tab {
                background: #252840; color: #a0a8c0; padding: 8px 18px;
                border: none; border-bottom: 2px solid transparent;
                font-size: 13px; min-width: 100px;
            }
            QTabBar::tab:selected { color: #ffffff; border-bottom: 2px solid #3d88ff; }
            QTabBar::tab:hover { color: #d0d8f0; }
        """)

    def add_section(self, title: str, widget: QWidget):
        self.addTab(widget, title)`,
  },
  {
    name: 'QComboBox and QDateEdit filter bar',
    description: 'Horizontal filter bar with a QComboBox dropdown and QDateEdit date picker',
    tags: ['filter', 'combobox', 'dropdown', 'date', 'dateedit', 'toolbar', 'control', 'input', 'select'],
    snippet: `from PySide6.QtWidgets import QWidget, QHBoxLayout, QComboBox, QDateEdit, QLabel, QPushButton
from PySide6.QtCore import QDate, Qt

class FilterBar(QWidget):
    def __init__(self, combo_label: str, combo_items: list[str],
                 on_apply: callable = None, parent=None):
        super().__init__(parent)
        self.setFixedHeight(44)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(8, 4, 8, 4)
        layout.setSpacing(12)
        layout.addWidget(QLabel(combo_label + ":"))
        self.combo = QComboBox()
        self.combo.addItems(combo_items)
        self.combo.setMinimumWidth(140)
        layout.addWidget(self.combo)
        layout.addWidget(QLabel("From:"))
        self.date_from = QDateEdit(QDate.currentDate().addDays(-30))
        self.date_from.setCalendarPopup(True)
        layout.addWidget(self.date_from)
        layout.addWidget(QLabel("To:"))
        self.date_to = QDateEdit(QDate.currentDate())
        self.date_to.setCalendarPopup(True)
        layout.addWidget(self.date_to)
        layout.addStretch()
        apply_btn = QPushButton("Apply")
        if on_apply:
            apply_btn.clicked.connect(on_apply)
        layout.addWidget(apply_btn)`,
  },
  {
    name: 'QDialog detail modal',
    description: 'Modal QDialog with a form layout for detail view or confirmation actions',
    tags: ['dialog', 'modal', 'popup', 'form', 'detail', 'confirm', 'action'],
    snippet: `from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout,
    QLabel, QPushButton, QDialogButtonBox
)
from PySide6.QtCore import Qt

class DetailDialog(QDialog):
    def __init__(self, title: str, fields: dict, parent=None):
        """fields = {"Field Label": "value", ...}"""
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setMinimumWidth(380)
        self.setModal(True)
        layout = QVBoxLayout(self)
        form = QFormLayout()
        form.setLabelAlignment(Qt.AlignRight)
        for label, value in fields.items():
            val_lbl = QLabel(str(value))
            val_lbl.setTextInteractionFlags(Qt.TextSelectableByMouse)
            form.addRow(label + ":", val_lbl)
        layout.addLayout(form)
        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)`,
  },
]

// Exported so the UI can display the correct snippet count in the RAG badge
export const QT_KNOWLEDGE_COUNT = QT_KNOWLEDGE.length

// ─── Simple BM25-lite search for Qt snippets ──────────────────────────────────

function getQtContext(query: string, topK = 4): string {
  const q = query.toLowerCase()
  const scored = QT_KNOWLEDGE.map((item) => {
    const corpus = [item.name, item.description, ...item.tags].join(' ').toLowerCase()
    const words = q.split(/\s+/).filter(Boolean)
    let score = 0
    for (const w of words) {
      if (corpus.includes(w)) score += 10
    }
    // boost exact tag matches
    for (const tag of item.tags) {
      if (q.includes(tag)) score += 20
    }
    return { item, score }
  })

  const top = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.item)

  // If nothing matched, return a spread of foundational items
  const items = top.length > 0 ? top : QT_KNOWLEDGE.slice(0, topK)

  return items
    .map(
      (item) =>
        `### ${item.name}\n${item.description}\n\`\`\`python\n${item.snippet}\n\`\`\``,
    )
    .join('\n\n---\n\n')
}

// ─── System prompt ────────────────────────────────────────────────────────────

const QT_SYSTEM_PROMPT = `<role>
You are an expert PySide6/Qt6 Python GUI developer. You write complete, production-ready Python files that create rich dashboard interfaces using PySide6. Your code runs without modification on Python 3.10+ with PySide6 installed.
</role>

<output_format>
Output ONLY raw Python code — no markdown code fences, no explanations, no preamble.
The very first character of your response must be the first character of the Python source code (typically a comment or import statement).
The very last character must be the last character of the Python source.
</output_format>

<framework_lock>
Use PySide6 EXCLUSIVELY. You MUST NOT use:
- PyQt5 (use PySide6 equivalents instead)
- Tkinter, wxPython, Kivy, Dear PyGui, or any other GUI toolkit
- Web-based frameworks (Flask, FastAPI, Django, Streamlit, Dash)
- HTML/CSS/JavaScript — the output must be a native desktop Qt application

ALLOWED: PySide6.QtWidgets, PySide6.QtCore, PySide6.QtGui, PySide6.QtCharts, PySide6.QtNetwork
</framework_lock>

<core_principles>
1. COMPLETENESS — every file must run with: python app.py (no missing pieces, no TODO comments)
2. SINGLE FILE — output one .py file that contains all classes and the if __name__ == "__main__" entry point
3. REALISTIC DATA — use domain-specific mock data; never "Lorem ipsum" or generic placeholders
4. MODULARITY — define each widget/panel as a separate class; compose them in MainWindow
5. STYLED — apply QSS stylesheets directly in __init__ for a polished, professional look
6. RESPONSIVE — use QSplitter, QGridLayout, and stretch factors so the window resizes sensibly
</core_principles>

<structure_rules>
Every generated file MUST include ALL of:
1. Module-level imports (PySide6 only, plus math/datetime/random for sample data)
2. A theme/colour constant block (COLORS dict or named constants)
3. One or more widget classes for KPI cards, charts, tables, or panels
4. A MainWindow class that:
   - Sets window title and minimum size
   - Creates a sidebar navigation with relevant sections
   - Adds a header bar with title and action buttons
   - Populates a main content area with at least:
       a) A row of 4+ KPI cards (QFrame-based) showing key metrics
       b) At least one QtCharts QChartView (line, bar, or pie chart) with sample data
       c) At least one QTableWidget with 5+ rows of realistic data
5. The if __name__ == "__main__" block with QApplication, window.show(), sys.exit(app.exec())
</structure_rules>

<python_rules>
- ALL chart initialization and signal connections must happen inside __init__ methods
- Use Python's random/math/datetime modules to generate realistic-looking sample data
- Connect signals with self.widget.signal.connect(self.handler) syntax — never use lambda in a loop without a default argument capture
- Guard QCharts imports with try/except ImportError and show a fallback QLabel if unavailable
- Use f-strings for QSS templates that require dynamic colours
</python_rules>

<example>
# Typical composition pattern — follow this structure for every dashboard:
#
#  MainWindow
#  ├── HeaderBar (title + action buttons)
#  ├── QSplitter (horizontal)
#  │   ├── Sidebar (QListWidget, 200px fixed)
#  │   └── Content QWidget (QVBoxLayout)
#  │       ├── FilterBar (QComboBox + QDateEdit + Apply button)
#  │       ├── KPI row (QHBoxLayout of 4 × KPICard)
#  │       ├── TabbedPanel or QSplitter
#  │       │   ├── LineChartWidget / BarChartWidget / PieChartWidget
#  │       │   └── QTableWidget (via make_table helper)
#  │       └── StatusBadge indicators
#
# Each class (HeaderBar, KPICard, BarChartWidget, StatusBadge, ...) is defined
# separately above MainWindow and instantiated in MainWindow.__init__.
# DetailDialog is opened from a QPushButton.clicked signal in the table row.
</example>`

// ─── Refinement prompt ────────────────────────────────────────────────────────

const QT_REFINEMENT_SYSTEM_PROMPT = `<role>
You are a senior PySide6 code reviewer. You receive generated Python GUI code and fix any issues. Output ONLY the corrected Python source — no markdown, no explanations.
</role>`

function buildQtRefinementUserMessage(code: string): string {
  return `<task>
Review the following PySide6 dashboard code and fix ALL issues from this checklist. Output ONLY the corrected Python.

<checklist>
1. All imports must be valid PySide6 imports — no PyQt5, no Tkinter, no web frameworks.
2. Every class referenced must be defined in the file.
3. The file must end with the if __name__ == "__main__" block.
4. No syntax errors — every def/class/if must be properly indented and closed.
5. No placeholder comments like # TODO, # Add content here, pass without context.
6. Every QChartView must have its chart populated with sample data.
7. Every QTableWidget must have its rows populated with realistic sample data.
8. QSS stylesheets must use valid Qt CSS property names (not HTML/CSS names).
</checklist>

Return the complete corrected Python file.
</task>

<code_to_review>
${code}
</code_to_review>`
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateQtCode(code: string): { isComplete: boolean; issues: string[] } {
  const issues: string[] = []

  if (!code.includes('if __name__')) {
    issues.push('Missing if __name__ == "__main__" entry point')
  }
  if (!code.includes('QMainWindow') && !code.includes('QWidget')) {
    issues.push('No main window class found (QMainWindow or QWidget)')
  }
  if (!code.includes('from PySide6') && !code.includes('import PySide6')) {
    issues.push('No PySide6 imports found')
  }
  // Detect empty pass-only classes
  if (/class\s+\w+[^:]*:\s*\n\s+pass\b/.test(code)) {
    issues.push('One or more widget classes contain only `pass` — they need real content')
  }
  // Very short output is almost always a truncated/empty generation
  if (code.trim().length < 600) {
    issues.push('Output is too short — the file appears incomplete or truncated')
  }

  return { isComplete: issues.length === 0, issues }
}

// ─── Plan generation ──────────────────────────────────────────────────────────

const QT_PLANNING_SYSTEM_PROMPT = `<role>
You are an expert PySide6/Qt6 GUI architect. Your job is to produce a clear, structured implementation plan for a PySide6 desktop dashboard BEFORE any code is written.
</role>

<output_format>
Output a concise, structured plan in plain text (no code fences, no Python). Use numbered sections and bullet points. Cover:

1. OVERVIEW — one sentence describing the application's purpose.
2. WINDOW LAYOUT — main window size, splitter structure, sidebar sections.
3. KPI WIDGETS — each KPI card: metric name, unit, sample value, background colour.
4. CHARTS — for each chart: type (QLineSeries/QBarSeries/QPieSeries), title, axis labels, sample data.
5. TABLES — each QTableWidget: title, column headers, row count, what each row represents.
6. INTERACTIVITY — buttons, filters, signals/slots, modals (QDialog) and what they do.
7. COLOUR SCHEME — primary/accent/background/text colours as hex values.
8. DATA — confirm all data is realistic and domain-specific.

Keep the plan concise but complete.
</output_format>

<constraints>
- PySide6 ONLY. No web frameworks, no Tkinter, no PyQt5.
- Charts via PySide6.QtCharts only.
</constraints>`

export async function generateQtPlan(
  prompt: string,
  config: LLMConfig,
  callbacks: QtPlanCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const context = getQtContext(prompt, 3)

  const messages: LLMMessage[] = [
    { role: 'system', content: QT_PLANNING_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `<reference_snippets>\n${context}\n</reference_snippets>`,
    },
    {
      role: 'assistant',
      content: 'Understood. I have the PySide6 component reference ready.',
    },
    {
      role: 'user',
      content: `<request>
Create a comprehensive implementation plan for the following PySide6 Qt dashboard:

${prompt.trim()}
</request>

Write the plan now. Do not write any Python code — only the structured plan text.`,
    },
  ]

  let fullPlan = ''
  await generateCompletion(
    config,
    messages,
    {
      onToken: (token) => { fullPlan += token; callbacks.onToken(token) },
      onComplete: () => callbacks.onComplete(fullPlan.trim()),
      onError: callbacks.onError,
    },
    signal,
  )
}

// ─── Main Qt generation function ──────────────────────────────────────────────

export async function generateQtDashboard(
  prompt: string,
  config: LLMConfig,
  callbacks: QtGenerationCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const context = getQtContext(prompt, 5)

  const messages: LLMMessage[] = [
    { role: 'system', content: QT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `<reference_snippets>\n${context}\n</reference_snippets>`,
    },
    {
      role: 'assistant',
      content: 'Understood. I will use these PySide6 patterns as building blocks.',
    },
    {
      role: 'user',
      content: `<request>
Create a COMPLETE PySide6 Python dashboard application for the following requirements:

${prompt.trim()}
</request>

<reminder>
- Output ONLY raw Python source code. Start immediately with the first import or comment.
- No markdown fences, no explanations before or after the code.
- Include ALL mandatory sections: KPI cards, chart(s), table(s), sidebar, header.
- Every QtCharts series must have sample data; every QTableWidget must have populated rows.
- End with if __name__ == "__main__": app = QApplication(sys.argv); ...
</reminder>`,
    },
  ]

  let fullResponse = ''

  await generateCompletion(
    config,
    messages,
    {
      onToken: (token) => {
        fullResponse += token
        callbacks.onToken(token)
      },
      onComplete: async () => {
        if (signal?.aborted) return
        try {
          let finalCode = fullResponse.trim()

          // Strip markdown fences if the model wrapped the code anyway
          finalCode = finalCode.replace(/^```python\s*/i, '').replace(/\s*```\s*$/i, '').trim()

          const validation = validateQtCode(finalCode)

          if (!validation.isComplete && !signal?.aborted) {
            callbacks.onRefinementStart?.()

            const refinementMessages: LLMMessage[] = [
              { role: 'system', content: QT_REFINEMENT_SYSTEM_PROMPT },
              { role: 'user', content: buildQtRefinementUserMessage(finalCode) },
            ]

            let refinedCode = ''
            await generateCompletion(
              config,
              refinementMessages,
              {
                onToken: (token) => {
                  refinedCode += token
                  callbacks.onToken(token)
                },
                onComplete: () => {
                  const trimmed = refinedCode.trim()
                    .replace(/^```python\s*/i, '').replace(/\s*```\s*$/i, '').trim()
                  if (trimmed.length > 400 && trimmed.includes('if __name__')) {
                    finalCode = trimmed
                  }
                },
                onError: () => { /* fall through with original */ },
              },
              signal,
            )
          }

          if (signal?.aborted) return

          const result: QtGeneratedCode = {
            python: finalCode,
            fullHtml: finalCode,   // unified field used by code viewer
            format: 'qt-python',
            dependencies: extractQtDependencies(finalCode),
          }
          callbacks.onComplete(result)
        } catch (error) {
          if (signal?.aborted) return
          callbacks.onError(error instanceof Error ? error : new Error('Failed to parse Qt output'))
        }
      },
      onError: callbacks.onError,
    },
    signal,
  )
}

function extractQtDependencies(code: string): string[] {
  const deps: string[] = ['PySide6']
  if (code.includes('QtCharts')) deps.push('PySide6-Charts')
  if (code.includes('QtNetwork')) deps.push('PySide6-Network')
  return deps
}
