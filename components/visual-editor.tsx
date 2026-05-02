'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  X,
  Save,
  Undo2,
  Redo2,
  Eye,
  Code,
  Send,
  Loader2,
  Bot,
  MousePointer,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Layers,
  GripVertical,
  Move,
  XCircle,
  User,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Wand2,
  FileCode2,
  Blocks,
  CornerUpLeft,
  CornerUpRight,
  History,
  Search,
  Code2,
  LayoutGrid,
  Gauge,
  BarChart3,
  Table2,
  FormInput,
  Navigation,
  Image,
  Zap,
  AlertTriangle,
  ToggleLeft,
  List,
  PanelLeft,
  Activity,
  Thermometer,
  Radio,
  CheckSquare,
} from 'lucide-react'
import { type LLMConfig, generateCompletion, type LLMMessage, DEFAULT_CONFIGS, getDefaultModel } from '@/lib/llm-client'
import { type GeneratedCode, createPreviewHtml } from '@/lib/code-generator'

interface VisualEditorProps {
  code: GeneratedCode
  onSave: (code: GeneratedCode) => void
  onClose: () => void
  llmConfig?: LLMConfig
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Component library ──────────────────────────────────────────────────────
// Scalable registry: add a new category object or push items into an existing
// one — the UI renders everything automatically. Each item needs only
// label, icon (emoji or React element key), tags, and html.

interface ComponentItem {
  label: string
  icon: string          // emoji used as visual thumbnail
  tags: string[]        // for search/filter
  html: string
}

interface ComponentCategory {
  category: string
  iconKey: string       // maps to CATEGORY_ICONS below
  color: string         // tailwind bg/text pair for the badge
  items: ComponentItem[]
}

const COMPONENT_TEMPLATES: ComponentCategory[] = [
  // ── Stats & KPIs ──────────────────────────────────────────────────────────
  {
    category: 'Stats & KPIs',
    iconKey: 'gauge',
    color: 'bg-blue-500/10 text-blue-600',
    items: [
      {
        label: 'Small Box',
        icon: '📊',
        tags: ['stat', 'kpi', 'metric', 'counter'],
        html: `<div class="col-lg-3 col-6">
  <div class="small-box bg-info">
    <div class="inner"><h3>150</h3><p>New Metric</p></div>
    <div class="icon"><i class="ion ion-stats-bars"></i></div>
    <a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a>
  </div>
</div>`,
      },
      {
        label: 'Info Box',
        icon: '📋',
        tags: ['stat', 'info', 'kpi', 'icon'],
        html: `<div class="col-md-3 col-sm-6 col-12">
  <div class="info-box">
    <span class="info-box-icon bg-info elevation-1"><i class="fas fa-cog"></i></span>
    <div class="info-box-content">
      <span class="info-box-text">New Info</span>
      <span class="info-box-number">1,410</span>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Info Box — Progress',
        icon: '📶',
        tags: ['stat', 'progress', 'kpi', 'percent'],
        html: `<div class="col-md-3 col-sm-6 col-12">
  <div class="info-box mb-3">
    <span class="info-box-icon bg-success elevation-1"><i class="fas fa-thumbs-up"></i></span>
    <div class="info-box-content">
      <span class="info-box-text">Completion</span>
      <span class="info-box-number">76<small>%</small></span>
      <div class="progress"><div class="progress-bar bg-success" style="width:76%"></div></div>
      <span class="progress-description">76% complete</span>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Metric Row (4-up)',
        icon: '🔢',
        tags: ['stat', 'row', 'grid', 'kpi', 'four'],
        html: `<div class="col-12">
  <div class="row">
    <div class="col-lg-3 col-6">
      <div class="small-box bg-info"><div class="inner"><h3>150</h3><p>New Orders</p></div><div class="icon"><i class="ion ion-bag"></i></div><a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a></div>
    </div>
    <div class="col-lg-3 col-6">
      <div class="small-box bg-success"><div class="inner"><h3>53<sup style="font-size:20px">%</sup></h3><p>Bounce Rate</p></div><div class="icon"><i class="ion ion-stats-bars"></i></div><a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a></div>
    </div>
    <div class="col-lg-3 col-6">
      <div class="small-box bg-warning"><div class="inner"><h3>44</h3><p>User Registrations</p></div><div class="icon"><i class="ion ion-person-add"></i></div><a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a></div>
    </div>
    <div class="col-lg-3 col-6">
      <div class="small-box bg-danger"><div class="inner"><h3>65</h3><p>Unique Visitors</p></div><div class="icon"><i class="ion ion-pie-graph"></i></div><a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a></div>
    </div>
  </div>
</div>`,
      },
    ],
  },

  // ── Charts ────────────────────────────────────────────────────────────────
  {
    category: 'Charts',
    iconKey: 'chart',
    color: 'bg-violet-500/10 text-violet-600',
    items: [
      {
        label: 'Line Chart',
        icon: '📈',
        tags: ['chart', 'line', 'trend', 'graph'],
        html: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Line Chart</h3></div>
    <div class="card-body"><canvas id="lineChart_${Math.random().toString(36).slice(2,7)}" style="min-height:250px;height:250px;max-height:250px;max-width:100%;"></canvas></div>
  </div>
</div>`,
      },
      {
        label: 'Bar Chart',
        icon: '📊',
        tags: ['chart', 'bar', 'column', 'graph'],
        html: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Bar Chart</h3></div>
    <div class="card-body"><canvas id="barChart_${Math.random().toString(36).slice(2,7)}" style="min-height:250px;height:250px;max-height:250px;max-width:100%;"></canvas></div>
  </div>
</div>`,
      },
      {
        label: 'Pie / Donut Chart',
        icon: '🥧',
        tags: ['chart', 'pie', 'donut', 'circular'],
        html: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Pie Chart</h3></div>
    <div class="card-body"><canvas id="pieChart_${Math.random().toString(36).slice(2,7)}" style="min-height:250px;height:250px;max-height:250px;max-width:100%;"></canvas></div>
  </div>
</div>`,
      },
      {
        label: 'Sparkline Card',
        icon: '〰️',
        tags: ['chart', 'sparkline', 'mini', 'trend', 'inline'],
        html: `<div class="col-md-3 col-sm-6 col-12">
  <div class="card">
    <div class="card-body">
      <p class="text-muted mb-0">Revenue</p>
      <h4 class="mb-0">$18,230</h4>
      <span class="text-success"><i class="fas fa-arrow-up"></i> 12.5%</span>
      <div class="mt-2" style="height:40px;background:linear-gradient(90deg,rgba(60,141,188,0.2),rgba(60,141,188,0.6));border-radius:4px;"></div>
    </div>
  </div>
</div>`,
      },
    ],
  },

  // ── Tables ────────────────────────────────────────────────────────────────
  {
    category: 'Tables',
    iconKey: 'table',
    color: 'bg-emerald-500/10 text-emerald-600',
    items: [
      {
        label: 'Basic Table',
        icon: '🗂️',
        tags: ['table', 'list', 'data', 'rows'],
        html: `<div class="col-12">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Data Table</h3></div>
    <div class="card-body table-responsive p-0">
      <table class="table table-hover text-nowrap">
        <thead><tr><th>#</th><th>Name</th><th>Status</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Item One</td><td><span class="badge badge-success">Active</span></td><td>$100</td></tr>
          <tr><td>2</td><td>Item Two</td><td><span class="badge badge-warning">Pending</span></td><td>$200</td></tr>
          <tr><td>3</td><td>Item Three</td><td><span class="badge badge-danger">Inactive</span></td><td>$150</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Striped Table',
        icon: '📑',
        tags: ['table', 'striped', 'zebra', 'list'],
        html: `<div class="col-12">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Striped Table</h3></div>
    <div class="card-body table-responsive p-0">
      <table class="table table-striped">
        <thead><tr><th>Column A</th><th>Column B</th><th>Column C</th><th>Column D</th></tr></thead>
        <tbody>
          <tr><td>Row 1 A</td><td>Row 1 B</td><td>Row 1 C</td><td>Row 1 D</td></tr>
          <tr><td>Row 2 A</td><td>Row 2 B</td><td>Row 2 C</td><td>Row 2 D</td></tr>
          <tr><td>Row 3 A</td><td>Row 3 B</td><td>Row 3 C</td><td>Row 3 D</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Table with Actions',
        icon: '🔧',
        tags: ['table', 'actions', 'buttons', 'crud', 'edit', 'delete'],
        html: `<div class="col-12">
  <div class="card">
    <div class="card-header">
      <h3 class="card-title">Items</h3>
      <div class="card-tools"><button class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> Add New</button></div>
    </div>
    <div class="card-body table-responsive p-0">
      <table class="table table-hover">
        <thead><tr><th>Name</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          <tr><td>Item Alpha</td><td>2024-01-15</td><td><span class="badge badge-success">Active</span></td><td><button class="btn btn-xs btn-info mr-1"><i class="fas fa-edit"></i></button><button class="btn btn-xs btn-danger"><i class="fas fa-trash"></i></button></td></tr>
          <tr><td>Item Beta</td><td>2024-01-16</td><td><span class="badge badge-warning">Review</span></td><td><button class="btn btn-xs btn-info mr-1"><i class="fas fa-edit"></i></button><button class="btn btn-xs btn-danger"><i class="fas fa-trash"></i></button></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>`,
      },
    ],
  },

  // ── Alerts & Notifications ────────────────────────────────────────────────
  {
    category: 'Alerts',
    iconKey: 'alert',
    color: 'bg-amber-500/10 text-amber-600',
    items: [
      {
        label: 'Warning Alert',
        icon: '⚠️',
        tags: ['alert', 'warning', 'notification', 'message'],
        html: `<div class="col-12">
  <div class="alert alert-warning alert-dismissible">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>
    <h5><i class="icon fas fa-exclamation-triangle"></i> Warning!</h5>
    This is a warning alert message.
  </div>
</div>`,
      },
      {
        label: 'Success Alert',
        icon: '✅',
        tags: ['alert', 'success', 'ok', 'done', 'notification'],
        html: `<div class="col-12">
  <div class="alert alert-success alert-dismissible">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>
    <h5><i class="icon fas fa-check"></i> Success!</h5>
    Operation completed successfully.
  </div>
</div>`,
      },
      {
        label: 'Danger Alert',
        icon: '🚨',
        tags: ['alert', 'danger', 'error', 'critical', 'notification'],
        html: `<div class="col-12">
  <div class="alert alert-danger alert-dismissible">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>
    <h5><i class="icon fas fa-ban"></i> Error!</h5>
    Something went wrong. Please try again.
  </div>
</div>`,
      },
      {
        label: 'Callout Box',
        icon: '💬',
        tags: ['callout', 'info', 'note', 'aside'],
        html: `<div class="col-12">
  <div class="callout callout-info">
    <h5>This is an info callout!</h5>
    <p>There is a bit of text here. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  </div>
</div>`,
      },
    ],
  },

  // ── Forms & Inputs ────────────────────────────────────────────────────────
  {
    category: 'Forms',
    iconKey: 'form',
    color: 'bg-sky-500/10 text-sky-600',
    items: [
      {
        label: 'Basic Form Card',
        icon: '📝',
        tags: ['form', 'input', 'fields', 'submit'],
        html: `<div class="col-md-6">
  <div class="card card-primary">
    <div class="card-header"><h3 class="card-title">Basic Form</h3></div>
    <form>
      <div class="card-body">
        <div class="form-group"><label>Name</label><input type="text" class="form-control" placeholder="Enter name"></div>
        <div class="form-group"><label>Email</label><input type="email" class="form-control" placeholder="Enter email"></div>
        <div class="form-group"><label>Description</label><textarea class="form-control" rows="3"></textarea></div>
      </div>
      <div class="card-footer">
        <button type="submit" class="btn btn-primary">Submit</button>
        <button type="reset" class="btn btn-default ml-2">Reset</button>
      </div>
    </form>
  </div>
</div>`,
      },
      {
        label: 'Search Bar',
        icon: '🔍',
        tags: ['search', 'input', 'filter', 'query'],
        html: `<div class="col-12">
  <div class="card">
    <div class="card-body">
      <div class="input-group">
        <input type="search" class="form-control form-control-lg" placeholder="Search…">
        <div class="input-group-append">
          <button type="button" class="btn btn-lg btn-default"><i class="fas fa-search"></i></button>
        </div>
      </div>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Date Range Filter',
        icon: '📅',
        tags: ['form', 'date', 'range', 'filter', 'period'],
        html: `<div class="col-12">
  <div class="card">
    <div class="card-body">
      <div class="row align-items-end">
        <div class="col-md-4 form-group mb-0"><label>From</label><input type="date" class="form-control"></div>
        <div class="col-md-4 form-group mb-0"><label>To</label><input type="date" class="form-control"></div>
        <div class="col-md-4"><button class="btn btn-primary btn-block"><i class="fas fa-filter mr-1"></i>Apply Filter</button></div>
      </div>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Toggle / Switch Row',
        icon: '🔘',
        tags: ['toggle', 'switch', 'boolean', 'settings', 'on off'],
        html: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Settings</h3></div>
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span>Enable Notifications</span>
        <div class="custom-control custom-switch"><input type="checkbox" class="custom-control-input" id="sw1" checked><label class="custom-control-label" for="sw1"></label></div>
      </div>
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span>Dark Mode</span>
        <div class="custom-control custom-switch"><input type="checkbox" class="custom-control-input" id="sw2"><label class="custom-control-label" for="sw2"></label></div>
      </div>
      <div class="d-flex justify-content-between align-items-center">
        <span>Auto-refresh</span>
        <div class="custom-control custom-switch"><input type="checkbox" class="custom-control-input" id="sw3" checked><label class="custom-control-label" for="sw3"></label></div>
      </div>
    </div>
  </div>
</div>`,
      },
    ],
  },

  // ── Navigation ────────────────────────────────────────────────────────────
  {
    category: 'Navigation',
    iconKey: 'nav',
    color: 'bg-slate-500/10 text-slate-600',
    items: [
      {
        label: 'Breadcrumb',
        icon: '🗺️',
        tags: ['breadcrumb', 'navigation', 'path', 'nav'],
        html: `<div class="col-12">
  <div class="card">
    <div class="card-body">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item"><a href="#">Home</a></li>
        <li class="breadcrumb-item"><a href="#">Section</a></li>
        <li class="breadcrumb-item active">Current Page</li>
      </ol>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Nav Tabs',
        icon: '📂',
        tags: ['tabs', 'navigation', 'nav', 'tab', 'panel'],
        html: `<div class="col-12">
  <div class="card">
    <div class="card-header p-0">
      <ul class="nav nav-tabs" id="customTab">
        <li class="nav-item"><a class="nav-link active" href="#tab1" data-toggle="tab">Tab One</a></li>
        <li class="nav-item"><a class="nav-link" href="#tab2" data-toggle="tab">Tab Two</a></li>
        <li class="nav-item"><a class="nav-link" href="#tab3" data-toggle="tab">Tab Three</a></li>
      </ul>
    </div>
    <div class="card-body">
      <div class="tab-content">
        <div class="tab-pane active" id="tab1"><p>Content for Tab One.</p></div>
        <div class="tab-pane" id="tab2"><p>Content for Tab Two.</p></div>
        <div class="tab-pane" id="tab3"><p>Content for Tab Three.</p></div>
      </div>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Pagination',
        icon: '📄',
        tags: ['pagination', 'pages', 'navigation', 'next', 'prev'],
        html: `<div class="col-12">
  <div class="card">
    <div class="card-body">
      <ul class="pagination justify-content-center mb-0">
        <li class="page-item disabled"><a class="page-link" href="#">«</a></li>
        <li class="page-item active"><a class="page-link" href="#">1</a></li>
        <li class="page-item"><a class="page-link" href="#">2</a></li>
        <li class="page-item"><a class="page-link" href="#">3</a></li>
        <li class="page-item"><a class="page-link" href="#">»</a></li>
      </ul>
    </div>
  </div>
</div>`,
      },
    ],
  },

  // ── Widgets & Content ─────────────────────────────────────────────────────
  {
    category: 'Widgets',
    iconKey: 'widget',
    color: 'bg-rose-500/10 text-rose-600',
    items: [
      {
        label: 'Profile Widget',
        icon: '👤',
        tags: ['profile', 'user', 'widget', 'avatar', 'card'],
        html: `<div class="col-md-4">
  <div class="card card-widget widget-user shadow">
    <div class="widget-user-header bg-primary">
      <h3 class="widget-user-username">User Name</h3>
      <h5 class="widget-user-desc">Role / Title</h5>
    </div>
    <div class="widget-user-image"><img class="img-circle elevation-2" src="/placeholder-user.jpg" alt="User Avatar"></div>
    <div class="card-footer">
      <div class="row">
        <div class="col-sm-4 border-right"><div class="description-block"><h5 class="description-header">3,200</h5><span class="description-text">SALES</span></div></div>
        <div class="col-sm-4 border-right"><div class="description-block"><h5 class="description-header">13%</h5><span class="description-text">GROWTH</span></div></div>
        <div class="col-sm-4"><div class="description-block"><h5 class="description-header">7</h5><span class="description-text">TASKS</span></div></div>
      </div>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Text Card',
        icon: '📝',
        tags: ['text', 'content', 'card', 'note'],
        html: `<div class="col-md-6">
  <div class="card card-default">
    <div class="card-header"><h3 class="card-title">Text Card</h3></div>
    <div class="card-body"><p>Add your content here. This is a general purpose text card that can be used for notes, descriptions, or any other textual content.</p></div>
  </div>
</div>`,
      },
      {
        label: 'Timeline',
        icon: '🕐',
        tags: ['timeline', 'history', 'events', 'log', 'activity'],
        html: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Activity Timeline</h3></div>
    <div class="card-body">
      <div class="timeline timeline-inverse">
        <div class="time-label"><span class="bg-danger">Today</span></div>
        <div><i class="fas fa-envelope bg-blue"></i><div class="timeline-item"><span class="time"><i class="far fa-clock"></i> 12 mins ago</span><h3 class="timeline-header">Event Title</h3><div class="timeline-body">Event description goes here.</div></div></div>
        <div><i class="fas fa-user bg-green"></i><div class="timeline-item"><span class="time"><i class="far fa-clock"></i> 1 hour ago</span><h3 class="timeline-header">Another Event</h3><div class="timeline-body">More details about this event.</div></div></div>
        <div><i class="far fa-clock bg-gray"></i></div>
      </div>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Progress Bars',
        icon: '▰',
        tags: ['progress', 'bar', 'percent', 'completion', 'loading'],
        html: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Progress</h3></div>
    <div class="card-body">
      <p class="text-muted mb-1">Task A <span class="float-right">70%</span></p>
      <div class="progress progress-sm mb-3"><div class="progress-bar bg-primary" style="width:70%"></div></div>
      <p class="text-muted mb-1">Task B <span class="float-right">40%</span></p>
      <div class="progress progress-sm mb-3"><div class="progress-bar bg-success" style="width:40%"></div></div>
      <p class="text-muted mb-1">Task C <span class="float-right">90%</span></p>
      <div class="progress progress-sm"><div class="progress-bar bg-warning" style="width:90%"></div></div>
    </div>
  </div>
</div>`,
      },
    ],
  },

  // ── Industrial / SCADA ────────────────────────────────────────────────────
  {
    category: 'Industrial',
    iconKey: 'industrial',
    color: 'bg-orange-500/10 text-orange-600',
    items: [
      {
        label: 'Sensor Reading Card',
        icon: '🌡️',
        tags: ['sensor', 'reading', 'temperature', 'humidity', 'industrial', 'iot'],
        html: `<div class="col-md-3 col-sm-6 col-12">
  <div class="info-box bg-gradient-info">
    <span class="info-box-icon"><i class="fas fa-thermometer-half"></i></span>
    <div class="info-box-content">
      <span class="info-box-text">Temperature</span>
      <span class="info-box-number">72.4 °F</span>
      <div class="progress"><div class="progress-bar" style="width:72%"></div></div>
      <span class="progress-description">Within normal range</span>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Device Status Grid',
        icon: '🔌',
        tags: ['device', 'status', 'grid', 'iot', 'industrial', 'online', 'offline'],
        html: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Device Status</h3></div>
    <div class="card-body p-0">
      <table class="table table-sm">
        <thead><tr><th>Device</th><th>Zone</th><th>Status</th><th>Last Seen</th></tr></thead>
        <tbody>
          <tr><td><i class="fas fa-circle text-success mr-1"></i>Sensor-01</td><td>Zone A</td><td><span class="badge badge-success">Online</span></td><td>Just now</td></tr>
          <tr><td><i class="fas fa-circle text-success mr-1"></i>Sensor-02</td><td>Zone B</td><td><span class="badge badge-success">Online</span></td><td>1 min ago</td></tr>
          <tr><td><i class="fas fa-circle text-danger mr-1"></i>Sensor-03</td><td>Zone C</td><td><span class="badge badge-danger">Offline</span></td><td>2 hrs ago</td></tr>
          <tr><td><i class="fas fa-circle text-warning mr-1"></i>Sensor-04</td><td>Zone A</td><td><span class="badge badge-warning">Warning</span></td><td>5 min ago</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Alarm Summary Panel',
        icon: '🚨',
        tags: ['alarm', 'alert', 'industrial', 'scada', 'fault', 'summary'],
        html: `<div class="col-12">
  <div class="card card-danger card-outline">
    <div class="card-header">
      <h3 class="card-title"><i class="fas fa-bell mr-2"></i>Active Alarms</h3>
      <div class="card-tools"><span class="badge badge-danger">3 Active</span></div>
    </div>
    <div class="card-body p-0">
      <table class="table table-sm table-hover">
        <thead><tr><th>Severity</th><th>Tag</th><th>Description</th><th>Time</th><th>Action</th></tr></thead>
        <tbody>
          <tr class="table-danger"><td><span class="badge badge-danger">Critical</span></td><td>TT-101</td><td>Temperature exceeds limit</td><td>09:42</td><td><button class="btn btn-xs btn-warning">ACK</button></td></tr>
          <tr class="table-warning"><td><span class="badge badge-warning">Warning</span></td><td>FT-205</td><td>Flow rate low</td><td>09:38</td><td><button class="btn btn-xs btn-warning">ACK</button></td></tr>
          <tr class="table-warning"><td><span class="badge badge-warning">Warning</span></td><td>PT-310</td><td>Pressure above setpoint</td><td>09:31</td><td><button class="btn btn-xs btn-warning">ACK</button></td></tr>
        </tbody>
      </table>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Machine Health Score',
        icon: '⚙️',
        tags: ['machine', 'health', 'oee', 'score', 'industrial', 'predictive', 'maintenance'],
        html: `<div class="col-md-4">
  <div class="card">
    <div class="card-body text-center">
      <p class="text-muted mb-1 text-sm">Machine Health</p>
      <div style="font-size:3rem;font-weight:700;color:#28a745;">87<small style="font-size:1.5rem;">%</small></div>
      <div class="progress progress-sm mt-2 mb-2"><div class="progress-bar bg-success" style="width:87%"></div></div>
      <div class="row text-center mt-3">
        <div class="col-4"><small class="text-muted d-block">Availability</small><strong class="text-success">94%</strong></div>
        <div class="col-4"><small class="text-muted d-block">Performance</small><strong class="text-warning">88%</strong></div>
        <div class="col-4"><small class="text-muted d-block">Quality</small><strong class="text-success">99%</strong></div>
      </div>
    </div>
  </div>
</div>`,
      },
    ],
  },

  // ── Layout ────────────────────────────────────────────────────────────────
  {
    category: 'Layout',
    iconKey: 'layout',
    color: 'bg-teal-500/10 text-teal-600',
    items: [
      {
        label: 'Two-Column Row',
        icon: '⬜',
        tags: ['layout', 'columns', 'grid', 'row', 'two'],
        html: `<div class="col-12">
  <div class="row">
    <div class="col-md-6"><div class="card"><div class="card-body"><p class="text-muted">Left column content</p></div></div></div>
    <div class="col-md-6"><div class="card"><div class="card-body"><p class="text-muted">Right column content</p></div></div></div>
  </div>
</div>`,
      },
      {
        label: 'Three-Column Row',
        icon: '🔲',
        tags: ['layout', 'columns', 'grid', 'row', 'three'],
        html: `<div class="col-12">
  <div class="row">
    <div class="col-md-4"><div class="card"><div class="card-body"><p class="text-muted">Column 1</p></div></div></div>
    <div class="col-md-4"><div class="card"><div class="card-body"><p class="text-muted">Column 2</p></div></div></div>
    <div class="col-md-4"><div class="card"><div class="card-body"><p class="text-muted">Column 3</p></div></div></div>
  </div>
</div>`,
      },
      {
        label: 'Section Divider',
        icon: '➖',
        tags: ['divider', 'separator', 'section', 'heading', 'layout'],
        html: `<div class="col-12">
  <div class="d-flex align-items-center my-2">
    <hr class="grow">
    <span class="mx-3 text-muted font-weight-bold text-uppercase" style="font-size:11px;letter-spacing:0.1em;">Section Title</span>
    <hr class="grow">
  </div>
</div>`,
      },
    ],
  },

  // ── Custom HTML ───────────────────────────────────────────────────────────
  {
    category: 'Custom HTML',
    iconKey: 'code',
    color: 'bg-gray-500/10 text-gray-600',
    items: [], // populated dynamically via CustomHtmlEntry
  },
]

// Icon map for category icons
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  gauge:      Gauge,
  chart:      BarChart3,
  table:      Table2,
  alert:      AlertTriangle,
  form:       FormInput,
  nav:        Navigation,
  widget:     LayoutGrid,
  industrial: Activity,
  layout:     PanelLeft,
  code:       Code2,
}

interface HtmlNode {
  id: string
  tag: string
  label: string
  depth: number
  childCount: number
  classes: string[]
  /**
   * Primary selector — always a full nth-of-type path from <body>.
   * Unique for every element, even siblings with identical class lists.
   * e.g. "div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3)"
   */
  selector: string
  /**
   * Fallback selectors tried in order when the primary fails.
   * Class-based; may match the wrong sibling after a DOM reorder,
   * but provide resilience against minor DOM differences.
   */
  selectorFallbacks: string[]
  /**
   * 1-based position of this element among all elements in the document that
   * match its primary fallback class selector. Used by resolveElement in the
   * iframe to pick the right sibling when the nth-of-type path fails and a
   * class-based fallback (which may match multiple siblings) is used instead.
   */
  matchIndex: number
}

/**
 * Build a full :nth-of-type path from <body> to the element.
 *
 * This is the ONLY selector strategy that is guaranteed to be unique even when
 * multiple siblings share identical class lists (e.g. four "div.col-lg-3.col-md-6.col-12"
 * stat cards). Class-based selectors always resolve to the FIRST matching element
 * via querySelector, so they cannot distinguish between siblings.
 *
 * Example output: "div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(3)"
 * The path is relative to <body> children so it stays short and readable.
 */
function buildNthChildPath(el: Element, docBody: Element): string {
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur !== docBody) {
    const tag = cur.tagName.toLowerCase()
    const parent: HTMLElement | null = cur.parentElement
    if (!parent) break
    // Count same-tag siblings before this element (1-based)
    const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === cur!.tagName)
    const idx = siblings.indexOf(cur) + 1
    // Always emit nth-of-type — even idx=1 must be explicit so the path is
    // unambiguous when read in isolation (no implicit "first of type" shortcut).
    parts.unshift(`${tag}:nth-of-type(${idx})`)
    cur = parent === docBody ? null : parent
  }
  return parts.length ? parts.join(' > ') : `${el.tagName.toLowerCase()}:nth-of-type(1)`
}

/**
 * Build the selector set for a node.
 *
 * PRIMARY  — always the full nth-of-type path. It is 100% unique regardless of
 *            class collisions, because it encodes the exact DOM position.
 *
 * FALLBACKS — class-based selectors, ordered most→least specific. These are
 *            tried only when the nth-of-type path fails (e.g. after a drag-drop
 *            reorder changes positions). They may match the wrong sibling in
 *            that edge-case, but that is acceptable graceful degradation.
 *
 * ID — when present it is prepended as the very first fallback (most robust
 *      single-token selector, immune to both class and position changes).
 */
function buildSelectorSet(el: Element, nthChildPath: string): { primary: string; fallbacks: string[] } {
  const tag = el.tagName.toLowerCase()
  const classes = Array.from(el.classList).filter(c => !c.startsWith('__ve'))

  // Build class-based alternatives (used only as fallbacks)
  const classFallbacks: string[] = []
  if (classes.length > 0) {
    // all classes — most specific class-based selector
    classFallbacks.push(`${tag}.${classes.map(c => CSS.escape(c)).join('.')}`)
    // first 3 classes — tolerates extra runtime classes
    if (classes.length > 3) {
      classFallbacks.push(`${tag}.${classes.slice(0, 3).map(c => CSS.escape(c)).join('.')}`)
    }
    // first class only — broadest class-based selector
    if (classes.length > 1) {
      classFallbacks.push(`${tag}.${CSS.escape(classes[0])}`)
    }
  }

  // id selector — immune to both class and position changes
  const idFallback = (el.id && !el.id.startsWith('__ve'))
    ? [`#${CSS.escape(el.id)}`]
    : []

  return {
    // nth-of-type path is ALWAYS the primary — it is unique by construction
    primary: nthChildPath,
    fallbacks: [...idFallback, ...classFallbacks],
  }
}

function parseHtmlToNodes(html: string): HtmlNode[] {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const nodes: HtmlNode[] = []
    let idCounter = 0

    const interesting = new Set(['div', 'section', 'nav', 'aside', 'header', 'footer', 'main', 'article', 'table', 'form', 'ul'])
    // Classes that indicate a component we want to manage
    const componentClasses = ['card', 'small-box', 'info-box', 'alert', 'widget', 'box', 'row', 'col-']

    function isInterestingElement(el: Element): boolean {
      const tag = el.tagName.toLowerCase()
      if (interesting.has(tag)) return true
      const classList = Array.from(el.classList)
      return componentClasses.some(cc => classList.some(c => c.includes(cc)))
    }

    /**
     * Compute the 1-based index of `el` among all elements in the document that
     * match the first class-based fallback selector. This lets the iframe pick
     * the exact sibling when class selectors match multiple elements.
     */
    function computeMatchIndex(el: Element, fallbacks: string[]): number {
      if (fallbacks.length === 0) return 1
      // Use the first class-based fallback (most specific class selector)
      const classSel = fallbacks[0]
      try {
        const matches = Array.from(doc.querySelectorAll(classSel)).filter(
          e => !e.id.startsWith('__ve') && !e.classList.contains('__ve_handle__')
        )
        const idx = matches.indexOf(el)
        return idx >= 0 ? idx + 1 : 1
      } catch {
        return 1
      }
    }

    function walk(el: Element, depth: number) {
      const tag = el.tagName.toLowerCase()
      if (!isInterestingElement(el)) return
      if (depth > 5) return

      // Skip visual editor injected elements
      if (el.id?.startsWith('__ve') || el.classList.contains('__ve_handle__')) return

      const classes = Array.from(el.classList).filter(c => !c.startsWith('__ve'))
      const classStr = classes.slice(0, 3).join('.')
      const label = classStr ? `${tag}.${classStr}` : tag

      const nthPath = buildNthChildPath(el, doc.body)
      const { primary, fallbacks } = buildSelectorSet(el, nthPath)
      const matchIndex = computeMatchIndex(el, fallbacks)

      nodes.push({
        id: `node_${idCounter++}`,
        tag,
        label,
        depth,
        childCount: el.children.length,
        classes,
        selector: primary,
        selectorFallbacks: fallbacks,
        matchIndex,
      })

      if (el.children.length < 30) {
        Array.from(el.children).forEach(child => walk(child, depth + 1))
      }
    }

    Array.from(doc.body.children).forEach(child => walk(child, 0))

    return nodes
  } catch {
    return []
  }
}

// Sends a postMessage to the iframe to highlight/clear elements.
// Passes the primary selector, fallback list, and matchIndex so the iframe
// can pinpoint the exact element even among identical-class siblings.
function iframeHighlight(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  selector: string | null,
  fallbacks: string[] = [],
  matchIndex: number = 1
) {
  try {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'HIGHLIGHT_ELEMENT', selector, fallbacks, matchIndex },
      '*'
    )
  } catch { /* ignore */ }
}

// Sends a postMessage to the iframe to show insertion point indicator
function iframeShowInsertionPoint(
  iframeRef: React.RefObject<HTMLIFrameElement | null>,
  position: 'start' | 'end' | null
) {
  try {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'SHOW_INSERT_POINT', position },
      '*'
    )
  } catch { /* ignore */ }
}

// The script injected into the iframe that listens for highlight commands
const IFRAME_HIGHLIGHT_SCRIPT = `
<script>
(function() {
  var overlay = null;
  var insertBar = null;

  function removeOverlay() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  function removeInsertBar() {
    if (insertBar && insertBar.parentNode) insertBar.parentNode.removeChild(insertBar);
    insertBar = null;
  }

  /**
   * Resolve the exact live DOM element for a node.
   *
   * The primary selector is always a full nth-of-type path, so it pinpoints
   * one specific element regardless of class collisions. When that fails
   * (e.g. after a drag reorder), fallbacks are tried — but because a class
   * selector like "div.col-lg-3" may match many siblings, we also receive
   * the element's 1-based position among same-selector matches (matchIndex)
   * so we can pick the right one even from class-based fallbacks.
   */
  function resolveElement(selector, fallbacks, matchIndex) {
    if (!selector) return null;
    var idx = (typeof matchIndex === 'number' && matchIndex >= 1) ? matchIndex : 1;
    var selectors = [selector].concat(fallbacks || []);

    for (var i = 0; i < selectors.length; i++) {
      var sel = selectors[i];
      if (!sel) continue;
      try {
        if (i === 0) {
          // Primary selector (nth-of-type path) — always uniquely identifies
          // one element; querySelector is fine here.
          var el = document.querySelector(sel);
          if (el) return el;
        } else {
          // Class-based fallback — may match multiple siblings.
          // Use querySelectorAll + the stored matchIndex to pick the right one.
          var els = document.querySelectorAll(sel);
          // Filter out VE injected elements
          var filtered = Array.prototype.filter.call(els, function(e) {
            return !e.id.startsWith('__ve') && !e.classList.contains('__ve_handle__');
          });
          if (filtered.length > 0) {
            // matchIndex is 1-based; clamp to available count
            return filtered[Math.min(idx, filtered.length) - 1];
          }
        }
      } catch (e) { /* invalid selector syntax — skip */ }
    }
    return null;
  }

  function highlightElement(selector, fallbacks, matchIndex) {
    removeOverlay();
    removeInsertBar();
    if (!selector) return;

    var el = resolveElement(selector, fallbacks, matchIndex);
    if (!el) return;

    // Scroll first so the rect is computed against the final position.
    // Use 'nearest' to avoid jarring jumps for elements already visible.
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    // Re-read rect after a short delay so scrollIntoView has settled.
    // For elements that are already visible the delay is imperceptible.
    setTimeout(function() {
      if (!el) return;
      // position:fixed + getBoundingClientRect is robust across AdminLTE
      // layouts where .content-wrapper (not body) is the scroll container.
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return; // element is hidden

      // Remove any previous overlay before painting the new one
      removeOverlay();

      overlay = document.createElement('div');
      overlay.id = '__ve_overlay__';
      overlay.style.cssText = [
        'position:fixed',
        'pointer-events:none',
        'z-index:2147483646',
        'border:2px solid #ef4444',
        'background:rgba(239,68,68,0.08)',
        'border-radius:4px',
        'box-shadow:0 0 0 4px rgba(239,68,68,0.18)',
        'top:' + (rect.top - 2) + 'px',
        'left:' + (rect.left - 2) + 'px',
        'width:' + (rect.width + 4) + 'px',
        'height:' + (rect.height + 4) + 'px',
      ].join(';');

      // Label badge — show the selector that actually worked
      var matchedSel = selector;
      try { if (document.querySelector(selector) !== el) { matchedSel = (fallbacks||[])[0] || selector; } } catch(e) {}
      var label = document.createElement('div');
      label.textContent = el.tagName.toLowerCase() +
        (el.id ? '#' + el.id : '') +
        (el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).filter(function(c){ return !c.startsWith('__ve'); }).slice(0,3).join('.')
          : '');
      label.style.cssText = [
        'position:absolute',
        'top:-22px',
        'left:0',
        'background:#ef4444',
        'color:white',
        'font-size:11px',
        'font-family:ui-monospace,Menlo,Monaco,Consolas,monospace',
        'font-weight:600',
        'padding:2px 8px',
        'border-radius:4px 4px 0 0',
        'white-space:nowrap',
        'max-width:320px',
        'overflow:hidden',
        'text-overflow:ellipsis',
      ].join(';');
      overlay.appendChild(label);

      document.body.appendChild(overlay);
    }, 60);
  }

  function showInsertPoint(position) {
    removeOverlay();
    removeInsertBar();
    if (!position) return;

    // Find the main content container (same logic as the add handler)
    var target =
      document.querySelector('.row:not([class*="sidebar"]):not([class*="main-sidebar"])') ||
      document.querySelector('.content-wrapper .content') ||
      document.querySelector('.content-wrapper') ||
      document.querySelector('main') ||
      document.body;

    if (!target) return;

    // Scroll to target first so the rect reflects its final on-screen position
    target.scrollIntoView({ behavior: 'smooth', block: position === 'end' ? 'end' : 'start' });

    // position:fixed + raw rect — robust across scroll containers
    var rect = target.getBoundingClientRect();

    insertBar = document.createElement('div');
    insertBar.id = '__ve_insert__';

    var isEnd = position === 'end';
    var barTop = isEnd ? rect.bottom - 4 : rect.top - 4;

    insertBar.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:2147483646',
      'left:' + rect.left + 'px',
      'width:' + rect.width + 'px',
      'top:' + barTop + 'px',
      'height:6px',
      'background:linear-gradient(90deg,#3b82f6,#6366f1)',
      'border-radius:3px',
      'box-shadow:0 0 12px rgba(59,130,246,0.8), 0 0 4px rgba(59,130,246,1)',
      'animation:ve_pulse_bar 1.2s ease-in-out infinite',
    ].join(';');

    // Big arrow pill label
    var pill = document.createElement('div');
    pill.textContent = isEnd ? 'Insert at bottom' : 'Insert at top';
    pill.style.cssText = [
      'position:absolute',
      'left:12px',
      'top:' + (isEnd ? '10px' : '-26px'),
      'background:#3b82f6',
      'color:white',
      'font-size:11px',
      'font-family:system-ui,-apple-system,sans-serif',
      'font-weight:700',
      'padding:3px 10px',
      'border-radius:12px',
      'white-space:nowrap',
      'box-shadow:0 2px 8px rgba(59,130,246,0.5)',
      'letter-spacing:0.02em',
    ].join(';');
    insertBar.appendChild(pill);

    // Container frame — bolder than before so the user sees WHERE the row is
    var dimOverlay = document.createElement('div');
    dimOverlay.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:2147483645',
      'top:' + rect.top + 'px',
      'left:' + rect.left + 'px',
      'width:' + rect.width + 'px',
      'height:' + rect.height + 'px',
      'border:2px dashed rgba(59,130,246,0.75)',
      'border-radius:6px',
      'background:rgba(59,130,246,0.08)',
    ].join(';');
    insertBar.appendChild(dimOverlay);

    // Inject a one-shot keyframe animation (idempotent)
    if (!document.getElementById('__ve_hl_keyframes__')) {
      var kf = document.createElement('style');
      kf.id = '__ve_hl_keyframes__';
      kf.textContent = '@keyframes ve_pulse_bar{0%,100%{opacity:1}50%{opacity:0.55}}';
      document.head.appendChild(kf);
    }

    document.body.appendChild(insertBar);
  }

  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'HIGHLIGHT_ELEMENT') {
      // Pass the primary selector, fallbacks, and matchIndex so resolveElement
      // can pinpoint the exact element even among identical-class siblings.
      highlightElement(e.data.selector, e.data.fallbacks || [], e.data.matchIndex || 1);
    }
    if (e.data && e.data.type === 'SHOW_INSERT_POINT') {
      showInsertPoint(e.data.position);
    }
  });
})();
</script>
`

// Script injected into iframe to enable drag-and-drop of top-level components
const IFRAME_DRAG_SCRIPT = `
<script id="__ve_drag_script__">
(function() {

  /* ─── State ─── */
  var dragging      = false;
  var dragEl        = null;      // the row being moved
  var dragParent    = null;      // its parent container
  var placeholder   = null;
  var ghost         = null;      // floating clone under cursor
  var dragItems     = [];        // all draggable rows
  var dragHandles   = [];
  var styleEl       = null;
  var scrollRAF     = null;
  var startMouseY   = 0;
  var startScrollY  = 0;
  var SCROLL_ZONE   = 80;        // px from top/bottom to trigger auto-scroll
  var SCROLL_SPEED  = 10;

  /* ─── Find draggable rows ─── */
  function getContentParent() {
    return (
      document.querySelector('.content-wrapper section.content') ||
      document.querySelector('.content-wrapper .content') ||
      document.querySelector('.content-wrapper') ||
      document.querySelector('main') ||
      document.body
    );
  }

  function getDraggableRows() {
    var parent = getContentParent();
    if (!parent) return [];
    
    // Find all potential draggable elements
    var rows = [];
    var seen = new Set();
    
    function addIfNew(el) {
      if (!seen.has(el)) {
        seen.add(el);
        rows.push(el);
      }
    }
    
    // First try to find .row elements (common in Bootstrap/AdminLTE)
    var rowElements = parent.querySelectorAll(':scope > .row, :scope > .container-fluid > .row');
    rowElements.forEach(addIfNew);
    
    // Look for direct children that are col-* elements (added components)
    var colElements = parent.querySelectorAll(':scope > [class*="col-"], :scope > .container-fluid > [class*="col-"]');
    colElements.forEach(addIfNew);
    
    // Also look inside rows for col-* elements (this is where added components often go)
    var nestedCols = parent.querySelectorAll('.row > [class*="col-"]');
    nestedCols.forEach(addIfNew);
    
    // Also look for card/box elements directly under content
    var cardElements = parent.querySelectorAll(':scope > .card, :scope > .small-box, :scope > .info-box, :scope > .alert');
    cardElements.forEach(addIfNew);
    
    // Also look for card/box elements inside rows
    var nestedCards = parent.querySelectorAll('.row > [class*="col-"] > .card, .row > [class*="col-"] > .small-box, .row > [class*="col-"] > .info-box');
    nestedCards.forEach(function(el) {
      // For nested cards, we want to make the col-* parent draggable, not the card itself
      var colParent = el.closest('[class*="col-"]');
      if (colParent && colParent.closest('.row')) {
        addIfNew(colParent);
      }
    });
    
    // If still no elements found, use direct children
    if (rows.length === 0) {
      Array.from(parent.children).forEach(function(el) {
        var tag = (el.tagName || '').toLowerCase();
        if (['div','section','article'].includes(tag) && !el.id.startsWith('__ve')) {
          addIfNew(el);
        }
      });
    }
    
    return rows.filter(function(el) {
      return !el.id.startsWith('__ve') && !el.classList.contains('__ve_ph__') && !el.classList.contains('__ve_handle__');
    });
  }

  /* ─── Label ─── */
  function describeRow(el) {
    if (el.querySelector('.small-box, .info-box')) return 'Stat Cards';
    if (el.querySelector('canvas'))               return 'Chart';
    if (el.querySelector('table'))                return 'Table';
    if (el.querySelector('form'))                 return 'Form';
    if (el.querySelector('.card, .box'))          return 'Card';
    if (el.querySelector('h1,h2,h3'))             return 'Header';
    var t = (el.innerText || '').slice(0, 28).trim();
    return t || 'Section';
  }

  /* ─── Placeholder ─── */
  function makePlaceholder(h) {
    var ph = document.createElement('div');
    ph.id  = '__ve_ph__';
    ph.classList.add('__ve_ph__');
    ph.style.cssText = 'height:' + Math.max(h,56) + 'px;background:rgba(59,130,246,0.07);border:2px dashed rgba(59,130,246,0.45);border-radius:8px;margin:4px 0;display:flex;align-items:center;justify-content:center;box-sizing:border-box;pointer-events:none;transition:height 0.1s;';
    var lbl = document.createElement('span');
    lbl.textContent = '↕  Largar aqui';
    lbl.style.cssText = 'color:rgba(59,130,246,0.7);font-size:13px;font-family:system-ui,sans-serif;font-weight:700;pointer-events:none;';
    ph.appendChild(lbl);
    return ph;
  }

  function removePh() {
    var el = document.getElementById('__ve_ph__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    placeholder = null;
  }

  /* ─── Floating ghost under cursor ─── */
  function makeGhost(el) {
    var g = el.cloneNode(true);
    g.id = '__ve_ghost__';
    /* Strip injected handles from ghost */
    Array.from(g.querySelectorAll('.__ve_handle__')).forEach(function(h){ h.parentNode.removeChild(h); });
    g.style.cssText = [
      'position:fixed',
      'z-index:999999',
      'pointer-events:none',
      'opacity:0.82',
      'width:' + el.offsetWidth + 'px',
      'box-shadow:0 12px 40px rgba(0,0,0,0.28)',
      'border-radius:8px',
      'transform:scale(0.97) rotate(-0.5deg)',
      'transition:transform 0.08s',
      'overflow:hidden',
      'background:#fff',
    ].join(';');
    document.body.appendChild(g);
    return g;
  }

  function moveGhost(clientX, clientY) {
    if (!ghost) return;
    var w = ghost.offsetWidth;
    ghost.style.left = (clientX - w / 2) + 'px';
    ghost.style.top  = (clientY - 24)    + 'px';
  }

  function removeGhost() {
    var el = document.getElementById('__ve_ghost__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    ghost = null;
  }

  /* ─── CSS ─── */
  var CSS = [
    '.__ve_draggable__ { position:relative !important; cursor:grab !important; transition:outline 0.1s, box-shadow 0.1s !important; }',
    '.__ve_draggable__:hover { outline:2.5px solid rgba(59,130,246,0.75) !important; outline-offset:3px !important; border-radius:6px !important; box-shadow:0 0 0 5px rgba(59,130,246,0.10) !important; }',
    '.__ve_draggable__:hover .__ve_handle__ { opacity:1 !important; transform:translateX(-50%) translateY(0) !important; }',
    /* Force handle visible whenever parent is hovered — some browsers need the rule duplicated on the handle itself */
    '.__ve_draggable__:hover > .__ve_handle__ { opacity:1 !important; }',
    '.__ve_dragging__ { opacity:0.22 !important; }',
    '.__ve_handle__ {',
    '  position:absolute !important; top:-14px !important; left:50% !important;',
    '  transform:translateX(-50%) translateY(-3px) !important;',
    '  z-index:9999 !important;',
    '  background:linear-gradient(135deg,#3b82f6,#6366f1) !important;',
    '  color:#fff !important; border-radius:20px !important;',
    '  padding:4px 14px 4px 9px !important; font-size:11px !important;',
    '  font-family:system-ui,sans-serif !important; font-weight:700 !important;',
    '  cursor:grab !important; opacity:0 !important;',
    '  transition:opacity 0.15s, transform 0.15s !important;',
    '  display:inline-flex !important; align-items:center !important; gap:5px !important;',
    '  white-space:nowrap !important; box-shadow:0 2px 10px rgba(59,130,246,0.4) !important;',
    '  user-select:none !important; border:1.5px solid rgba(255,255,255,0.3) !important;',
    '}',
    /* while dragging: disable text selection & pointer events on everything else */
    'body.__ve_dragging_body__ { user-select:none !important; }',
    'body.__ve_dragging_body__ * { cursor:grabbing !important; }',
  ].join('\\n');

  /* ─── Enable / Disable ─── */
  function enableDragMode() {
    // Always clean up first to ensure fresh initialization
    // This handles cases where components were added/removed
    if (styleEl) {
      disableDragMode();
    }
    
    styleEl = document.createElement('style');
    styleEl.id = '__ve_css__';
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    dragItems  = getDraggableRows();
    dragParent = dragItems.length ? dragItems[0].parentNode : null;

    dragItems.forEach(function(el) {
      // Skip if already has a handle (shouldn't happen after cleanup, but safety check)
      if (el.querySelector('.__ve_handle__')) return;
      
      el.classList.add('__ve_draggable__');
      var label  = describeRow(el);
      var handle = document.createElement('div');
      handle.className = '__ve_handle__';
      handle.innerHTML = '<span style="font-size:14px;line-height:1">⠿</span>' + label;
      el.insertBefore(handle, el.firstChild);
      dragHandles.push(handle);
      handle.addEventListener('mousedown', onHandleMouseDown);
    });
  }

  function disableDragMode() {
    cancelDrag();
    if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    styleEl = null;
    dragItems.forEach(function(el) {
      el.classList.remove('__ve_draggable__', '__ve_dragging__');
    });
    dragHandles.forEach(function(h) {
      h.removeEventListener('mousedown', onHandleMouseDown);
      if (h.parentNode) h.parentNode.removeChild(h);
    });
    dragHandles = [];
    dragItems   = [];
    dragParent  = null;
  }

  /* ─── Mouse down on handle → start drag ─── */
  function onHandleMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    /* Find the parent row of this handle */
    var handle = e.currentTarget;
    var row    = handle.parentNode;
    if (!row || !dragItems.includes(row)) return;

    dragging       = true;
    dragEl         = row;
    startMouseY    = e.clientY;
    startScrollY   = window.scrollY;

    ghost = makeGhost(row);
    moveGhost(e.clientX, e.clientY);

    dragEl.classList.add('__ve_dragging__');
    document.body.classList.add('__ve_dragging_body__');

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  }

  /* ─── Mouse move → update ghost + placeholder ─── */
  function onMouseMove(e) {
    if (!dragging) return;
    e.preventDefault();

    moveGhost(e.clientX, e.clientY);
    autoScroll(e.clientY);
    updatePlaceholder(e.clientY);
  }

  /* ─── Auto scroll when near edges ─── */
  function autoScroll(clientY) {
    if (scrollRAF) cancelAnimationFrame(scrollRAF);
    var vh = window.innerHeight;

    function step() {
      if (!dragging) return;
      if (clientY < SCROLL_ZONE) {
        window.scrollBy(0, -SCROLL_SPEED);
      } else if (clientY > vh - SCROLL_ZONE) {
        window.scrollBy(0,  SCROLL_SPEED);
      }
      scrollRAF = requestAnimationFrame(step);
    }

    if (clientY < SCROLL_ZONE || clientY > vh - SCROLL_ZONE) {
      scrollRAF = requestAnimationFrame(step);
    }
  }

  /* ─── Update placeholder position ─── */
  function updatePlaceholder(clientY) {
    if (!dragEl || !dragParent) return;

    /* Get siblings excluding the dragged el and existing placeholder */
    var siblings = dragItems.filter(function(el) {
      return el !== dragEl;
    });

    /* Find insertion point: the first sibling whose midpoint is below cursor */
    var insertBefore = null;
    for (var i = 0; i < siblings.length; i++) {
      var rect = siblings[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        insertBefore = siblings[i];
        break;
      }
    }

    removePh();
    placeholder = makePlaceholder(dragEl.offsetHeight || 80);

    if (insertBefore) {
      dragParent.insertBefore(placeholder, insertBefore);
    } else {
      dragParent.appendChild(placeholder);
    }
  }

  /* ─── Mouse up → commit or cancel ─── */
  function onMouseUp(e) {
    if (!dragging) return;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);

    if (scrollRAF) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }

    /* Commit: insert dragEl where placeholder is */
    if (placeholder && placeholder.parentNode && dragEl) {
      placeholder.parentNode.insertBefore(dragEl, placeholder);
    }

    dragEl.classList.remove('__ve_dragging__');
    document.body.classList.remove('__ve_dragging_body__');

    removePh();
    removeGhost();
    dragging = false;
    dragEl   = null;

    notifyParent();
  }

  function cancelDrag() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
    if (scrollRAF) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }
    removePh();
    removeGhost();
    if (dragEl) dragEl.classList.remove('__ve_dragging__');
    document.body.classList.remove('__ve_dragging_body__');
    dragging = false;
    dragEl   = null;
  }

  /* ─── Send clean HTML to parent ─── */
  function notifyParent() {
    /* Hide VE artefacts before serialising */
    var handles = document.querySelectorAll('.__ve_handle__');
    handles.forEach(function(h) { 
      if (h.parentNode) h.parentNode.removeChild(h);
    });
    document.querySelectorAll('.__ve_draggable__').forEach(function(el) {
      el.classList.remove('__ve_draggable__', '__ve_dragging__');
    });
    var ph = document.getElementById('__ve_ph__');
    if (ph && ph.parentNode) ph.parentNode.removeChild(ph);
    var css = document.getElementById('__ve_css__');
    if (css && css.parentNode) css.parentNode.removeChild(css);

    /* Reset internal state so enableDragMode can reinitialize */
    styleEl = null;
    dragHandles = [];
    dragItems = [];
    dragParent = null;

    var html = document.documentElement.outerHTML;
    window.parent.postMessage({ type: 'VE_HTML_UPDATE', html: html }, '*');
    /* Notify parent that a drag-and-drop move was completed so it can
       automatically disable drag mode — the user must re-enable it to
       perform another drag, preventing accidental movements. */
    window.parent.postMessage({ type: 'VE_DRAG_COMPLETE' }, '*');
  }

  /* ─── Listen for parent ─── */
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'VE_DRAG_MODE_ON')  enableDragMode();
    if (e.data.type === 'VE_DRAG_MODE_OFF') disableDragMode();
  });

  /* ─── Notify parent that iframe is ready ─── */
  window.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure all scripts are parsed
    setTimeout(function() {
      window.parent.postMessage({ type: 'VE_IFRAME_READY' }, '*');
    }, 100);
  });

  // Also send ready if DOM is already loaded
  if (document.readyState !== 'loading') {
    setTimeout(function() {
      window.parent.postMessage({ type: 'VE_IFRAME_READY' }, '*');
    }, 100);
  }
})();
</script>
`

// Script injected into the iframe to support a devtools-style element picker
// for the AI assistant. The user hovers to highlight an element, clicks to
// pick it, and the picked element's outerHTML + a short label are posted back
// to the React parent. Much more reliable than the old rubber-band selection.
const IFRAME_SELECT_SCRIPT = `
<script id="__ve_pick_script__">
(function() {
  var pickerActive = false;
  var hoveredEl    = null;
  var pickedEl     = null;

  /* We render hover + picked indicators as FLOATING overlay DIVs instead of
     mutating each element's inline 'outline' style. This is crucial because:
     1) inline outline stomps the drag-mode :hover CSS rule on the same element
     2) inline outline is invisible on many AdminLTE elements (canvas, icons,
        flex children) because they have their own outline/border rules
     3) we never risk leaving dangling inline styles on the live DOM */
  var hoverOv  = null;   // floating outline for the element under the cursor
  var pickedOv = null;   // floating outline for the confirmed pick

  /* ── Identify VE-internal nodes that the picker must ignore ── */
  function isVeInternal(el) {
    if (!el) return true;
    if (el === document.body || el === document.documentElement) return true;
    if (el.id && typeof el.id === 'string' && el.id.indexOf('__ve') === 0) return true;
    if (el.classList) {
      if (el.classList.contains('__ve_handle__')) return true;
      if (el.classList.contains('__ve_ph__'))     return true;
      if (el.classList.contains('__ve_dragging__')) return true;
    }
    return false;
  }

  /* ── Pick the element under (x, y), skipping VE internals ── */
  function findPickable(x, y) {
    var el = document.elementFromPoint(x, y);
    while (el && isVeInternal(el)) el = el.parentElement;
    return el;
  }

  /* ── Overlay helpers (pure DOM, never touch element styles) ── */
  function makeOverlay(kind) {
    var ov = document.createElement('div');
    ov.id = '__ve_pick_' + kind + '__';
    var isPicked = kind === 'picked';
    ov.style.cssText = [
      'position:fixed',
      'pointer-events:none',
      'z-index:' + (isPicked ? 2147483645 : 2147483644),
      'border-radius:4px',
      'transition:top 0.06s ease, left 0.06s ease, width 0.06s ease, height 0.06s ease',
      isPicked
        ? 'border:3px solid #6366f1; background:rgba(99,102,241,0.10); box-shadow:0 0 0 4px rgba(99,102,241,0.18)'
        : 'border:2px dashed #8b5cf6; background:rgba(139,92,246,0.06); box-shadow:0 0 0 2px rgba(139,92,246,0.15)',
      'display:none',
    ].join(';');
    document.body.appendChild(ov);
    return ov;
  }

  function positionOverlay(ov, el, label) {
    if (!ov || !el) return;
    var r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) { ov.style.display = 'none'; return; }
    ov.style.display = 'block';
    ov.style.top    = (r.top - 2) + 'px';
    ov.style.left   = (r.left - 2) + 'px';
    ov.style.width  = (r.width + 4) + 'px';
    ov.style.height = (r.height + 4) + 'px';

    if (label) {
      var lb = ov.firstElementChild;
      if (!lb) {
        lb = document.createElement('div');
        lb.style.cssText = [
          'position:absolute',
          'top:-22px', 'left:0',
          'background:' + (ov === pickedOv ? '#6366f1' : '#8b5cf6'),
          'color:white',
          'font-size:11px',
          'font-family:ui-monospace,Menlo,Monaco,Consolas,monospace',
          'font-weight:600',
          'padding:2px 8px',
          'border-radius:4px 4px 0 0',
          'white-space:nowrap',
          'max-width:280px',
          'overflow:hidden',
          'text-overflow:ellipsis',
          'pointer-events:none',
        ].join(';');
        ov.appendChild(lb);
      }
      lb.textContent = label;
    }
  }

  function hideOverlay(ov) { if (ov) ov.style.display = 'none'; }

  function removeOverlay(ov) {
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
  }

  /* ── Human-readable label for the picked element ── */
  function describe(el) {
    var tag = el.tagName ? el.tagName.toLowerCase() : 'element';
    var cls = '';
    if (el.classList && el.classList.length) {
      cls = '.' + Array.prototype.slice.call(el.classList)
        .filter(function(c) { return c.indexOf('__ve') !== 0; })
        .slice(0, 2)
        .join('.');
    }
    var text = (el.textContent || '').replace(/\\s+/g, ' ').trim();
    if (text.length > 40) text = text.slice(0, 40) + '…';
    return { tag: tag, classes: cls, text: text };
  }

  /* ── Stable CSS selector path (used to locate the element in the source
        HTML even after the live DOM has been mutated by Bootstrap / AdminLTE /
        Chart.js). We build a nth-of-type chain from <body> down, which is
        position-based and therefore immune to attribute mutations. ── */
  function getSelectorPath(el) {
    if (!el || el === document.body || el === document.documentElement) return '';
    var parts = [];
    var node = el;
    while (node && node.parentElement && node !== document.body) {
      var parent = node.parentElement;
      var tag = node.tagName ? node.tagName.toLowerCase() : '';
      if (!tag) break;
      var siblings = Array.prototype.filter.call(
        parent.children,
        function(c) { return c.tagName === node.tagName; }
      );
      if (siblings.length === 1) {
        parts.unshift(tag);
      } else {
        var idx = Array.prototype.indexOf.call(siblings, node) + 1;
        parts.unshift(tag + ':nth-of-type(' + idx + ')');
      }
      node = parent;
    }
    return 'body > ' + parts.join(' > ');
  }

  /* ── Reposition both overlays (used on scroll / resize to track the live DOM) ── */
  function rAFSchedule(cb) {
    if (window.requestAnimationFrame) requestAnimationFrame(cb);
    else setTimeout(cb, 16);
  }

  function reflowOverlays() {
    if (hoveredEl && hoverOv && pickerActive) {
      var info = describe(hoveredEl);
      var lbl = info.tag + info.classes + (info.text ? ' — ' + info.text : '');
      positionOverlay(hoverOv, hoveredEl, lbl);
    }
    if (pickedEl && pickedOv) {
      var pinfo = describe(pickedEl);
      positionOverlay(pickedOv, pickedEl, pinfo.tag + pinfo.classes);
    }
  }

  /* ── Event handlers ── */
  function onMouseMove(e) {
    if (!pickerActive) return;
    var el = findPickable(e.clientX, e.clientY);
    if (el === hoveredEl) return;
    hoveredEl = el;
    if (!hoveredEl || hoveredEl === pickedEl) {
      hideOverlay(hoverOv);
      return;
    }
    if (!hoverOv) hoverOv = makeOverlay('hover');
    var info = describe(hoveredEl);
    var lbl = info.tag + info.classes + (info.text ? ' — ' + info.text : '');
    positionOverlay(hoverOv, hoveredEl, lbl);
  }

  function onMouseLeave() {
    hoveredEl = null;
    hideOverlay(hoverOv);
  }

  function onClick(e) {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopPropagation();

    var el = findPickable(e.clientX, e.clientY);
    if (!el) return;

    pickedEl = el;
    hideOverlay(hoverOv);
    hoveredEl = null;

    if (!pickedOv) pickedOv = makeOverlay('picked');
    var info = describe(pickedEl);
    positionOverlay(pickedOv, pickedEl, info.tag + info.classes);

    // Serialize a clean outerHTML (strip VE artefacts). Because we never
    // mutated the element's style, the clone is pristine.
    var clone = el.cloneNode(true);
    try {
      var junk = clone.querySelectorAll('[id^="__ve"], .__ve_handle__, .__ve_ph__');
      for (var i = 0; i < junk.length; i++) {
        junk[i].parentNode && junk[i].parentNode.removeChild(junk[i]);
      }
    } catch (err) {}
    if (clone.classList) {
      clone.classList.remove('__ve_draggable__', '__ve_dragging__');
    }

    var path = getSelectorPath(el);
    window.parent.postMessage({
      type:    'VE_PICK_RESULT',
      html:    clone.outerHTML,
      path:    path,
      tag:     info.tag,
      classes: info.classes,
      text:    info.text,
    }, '*');

    // One-shot picker: turn off after a successful pick
    disable();
  }

  function onKeyDown(e) {
    if (!pickerActive) return;
    if (e.key === 'Escape') {
      disable();
      window.parent.postMessage({ type: 'VE_PICK_CANCELLED' }, '*');
    }
  }

  function onScrollOrResize() { rAFSchedule(reflowOverlays); }

  function enable() {
    if (pickerActive) return;
    pickerActive = true;
    document.body.style.cursor = 'crosshair';
    document.addEventListener('mousemove',  onMouseMove,  true);
    document.addEventListener('click',      onClick,      true);
    document.addEventListener('keydown',    onKeyDown,    true);
    document.addEventListener('mouseleave', onMouseLeave, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize, true);
  }

  function disable() {
    pickerActive = false;
    document.body.style.cursor = '';
    document.removeEventListener('mousemove',  onMouseMove,  true);
    document.removeEventListener('click',      onClick,      true);
    document.removeEventListener('keydown',    onKeyDown,    true);
    document.removeEventListener('mouseleave', onMouseLeave, true);
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize, true);
    hoveredEl = null;
    hideOverlay(hoverOv);
  }

  function clearPickedOverlay() {
    pickedEl = null;
    if (pickedOv) { removeOverlay(pickedOv); pickedOv = null; }
  }

  /* ── Message bus ── */
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'VE_PICK_MODE_ON')  enable();
    if (e.data.type === 'VE_PICK_MODE_OFF') disable();
    if (e.data.type === 'VE_CLEAR_PICK') {
      disable();
      clearPickedOverlay();
    }
  });

})();
</script>
`

// ── JSON-operations edit protocol ────────────────────────────────────────
// The previous AI flow asked the model to re-emit the entire HTML document
// for every change (3000-8000 tokens of output for a one-line tweak).
// Small local LLMs can't do that reliably — they truncate, drift, or give up,
// and the "landmark drift" guard rejected even the successful responses.
//
// This protocol instead asks the model for a short JSON array of structured
// operations (set_text, add_class, set_style, remove, …) that reference
// elements by selector. Output is typically 50-300 tokens — small enough to
// be reliable on even weak 3B models, and deterministic enough to apply
// without heuristic validation.

interface InventoryItem {
  selector: string
  tag: string
  text: string
  classes: string[]
}

function buildPageInventory(html: string): { inventory: InventoryItem[]; annotatedHtml: string } {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const inventory: InventoryItem[] = []
    let counter = 0

    const pick = (selector: string) => {
      let nodes: NodeListOf<Element>
      try { nodes = doc.querySelectorAll(selector) } catch { return }
      nodes.forEach((el) => {
        if (el.hasAttribute('data-ve-id')) return
        if (el.id?.startsWith('__ve')) return

        const veId = `ve${++counter}`
        el.setAttribute('data-ve-id', veId)

        const text = (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 90)
        const classes = Array.from(el.classList)
          .filter(c => !c.startsWith('__ve'))
          .slice(0, 5)

        inventory.push({
          selector: `[data-ve-id="${veId}"]`,
          tag: el.tagName.toLowerCase(),
          text,
          classes,
        })
      })
    }

    // Text-bearing elements first (these are what users most often reference
    // by name — "the Sales card", "the header h1", etc.)
    pick('.main-sidebar .brand-text')
    pick('.main-sidebar .brand-link')
    pick('.main-sidebar .nav-link')
    pick('.main-header .nav-link')
    pick('.main-header .navbar-brand')
    pick('.content-header h1')
    pick('.content-header .breadcrumb-item')
    pick('.small-box h3')
    pick('.small-box p')
    pick('.info-box-text')
    pick('.info-box-number')
    pick('.widget-user-username')
    pick('.widget-user-desc')
    pick('.card-header .card-title')
    pick('.card .card-body h1, .card .card-body h2, .card .card-body h3, .card .card-body h4, .card .card-body h5')
    pick('.alert')
    pick('.btn-primary, .btn-success, .btn-danger, .btn-warning, .btn-info')
    pick('.badge')
    // Structural containers — useful for "remove the revenue card" etc.
    pick('.small-box')
    pick('.info-box')
    pick('.card')

    // Cap to keep the prompt a reasonable size (each entry ~30-50 tokens)
    return {
      inventory: inventory.slice(0, 80),
      annotatedHtml: doc.documentElement.outerHTML,
    }
  } catch {
    return { inventory: [], annotatedHtml: html }
  }
}

type EditOperation =
  | { op: 'set_text'; selector: string; text: string }
  | { op: 'set_attribute'; selector: string; name: string; value: string }
  | { op: 'add_class'; selector: string; class: string }
  | { op: 'remove_class'; selector: string; class: string }
  | { op: 'set_style'; selector: string; property: string; value: string }
  | { op: 'remove'; selector: string }
  | { op: 'replace_html'; selector: string; html: string }
  | { op: 'append_html'; selector: string; html: string }
  | { op: 'prepend_html'; selector: string; html: string }

function applyOperations(
  annotatedHtml: string,
  ops: unknown[]
): { html: string; applied: number; failed: string[]; appliedOps: string[] } {
  const failed: string[] = []
  const appliedOps: string[] = []
  let applied = 0

  try {
    const doc = new DOMParser().parseFromString(annotatedHtml, 'text/html')

    for (const raw of ops) {
      if (!raw || typeof raw !== 'object' || !('op' in raw)) {
        failed.push('Invalid operation shape')
        continue
      }
      const op = raw as EditOperation
      const selector = 'selector' in op ? String(op.selector || '') : ''

      try {
        let target: Element | null = null
        try { target = selector ? doc.querySelector(selector) : null } catch { target = null }
        if (!target) {
          failed.push(`${op.op}: selector "${selector}" not found`)
          continue
        }

        switch (op.op) {
          case 'set_text':
            target.textContent = String(op.text ?? '')
            appliedOps.push(`set text on ${describeTarget(target)}`)
            applied++
            break
          case 'set_attribute':
            target.setAttribute(String(op.name), String(op.value ?? ''))
            appliedOps.push(`set ${op.name} on ${describeTarget(target)}`)
            applied++
            break
          case 'add_class':
            target.classList.add(String(op.class))
            appliedOps.push(`added .${op.class} to ${describeTarget(target)}`)
            applied++
            break
          case 'remove_class':
            target.classList.remove(String(op.class))
            appliedOps.push(`removed .${op.class} from ${describeTarget(target)}`)
            applied++
            break
          case 'set_style': {
            const el = target as HTMLElement
            el.style.setProperty(String(op.property), String(op.value ?? ''))
            appliedOps.push(`${op.property}: ${op.value} on ${describeTarget(target)}`)
            applied++
            break
          }
          case 'remove':
            appliedOps.push(`removed ${describeTarget(target)}`)
            target.parentNode?.removeChild(target)
            applied++
            break
          case 'replace_html':
            appliedOps.push(`replaced ${describeTarget(target)}`)
            target.outerHTML = String(op.html || '')
            applied++
            break
          case 'append_html':
            target.insertAdjacentHTML('beforeend', String(op.html || ''))
            appliedOps.push(`appended into ${describeTarget(target)}`)
            applied++
            break
          case 'prepend_html':
            target.insertAdjacentHTML('afterbegin', String(op.html || ''))
            appliedOps.push(`prepended into ${describeTarget(target)}`)
            applied++
            break
          default:
            failed.push(`Unknown operation "${(op as { op: string }).op}"`)
        }
      } catch (err) {
        failed.push(`${op.op}: ${err instanceof Error ? err.message : 'exception'}`)
      }
    }

    // Clean up inventory markers before returning
    doc.querySelectorAll('[data-ve-id]').forEach(el => el.removeAttribute('data-ve-id'))

    return { html: doc.documentElement.outerHTML, applied, failed, appliedOps }
  } catch {
    return { html: annotatedHtml, applied: 0, failed: ['Failed to parse document'], appliedOps: [] }
  }
}

function describeTarget(el: Element): string {
  const tag = el.tagName.toLowerCase()
  const cls = Array.from(el.classList).filter(c => !c.startsWith('__ve') && c !== 'data-ve-id').slice(0, 2).join('.')
  return cls ? `${tag}.${cls}` : tag
}

// Locate and replace the picked element's markup in the source HTML.
// We prefer a stable CSS selector path (nth-of-type chain) computed at pick
// time — this works even after Bootstrap/AdminLTE/Chart.js have mutated the
// live DOM with attributes that don't exist in the source. Falls back to
// literal substring matching and normalized outerHTML matching for robustness.
function replaceFragmentInDocument(
  fullHtml: string,
  oldFragment: string,
  newFragment: string,
  selectorPath?: string,
): string | null {
  // ── Strategy 1: stable CSS selector path (most reliable) ──
  if (selectorPath) {
    try {
      const doc = new DOMParser().parseFromString(fullHtml, 'text/html')
      const el = doc.querySelector(selectorPath)
      if (el) {
        el.outerHTML = newFragment
        return doc.documentElement.outerHTML
      }
    } catch { /* fall through */ }
  }

  // ── Strategy 2: literal substring (works when iframe DOM is untouched) ──
  const idx = fullHtml.indexOf(oldFragment)
  if (idx >= 0) {
    return fullHtml.slice(0, idx) + newFragment + fullHtml.slice(idx + oldFragment.length)
  }

  // ── Strategy 3: normalized DOM match (whitespace-tolerant) ──
  try {
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim()
    const normOld = normalize(oldFragment)
    const doc = new DOMParser().parseFromString(fullHtml, 'text/html')
    const candidates = doc.querySelectorAll(
      'div,section,nav,article,aside,header,footer,main,form,table,ul,li'
    )
    for (const el of Array.from(candidates)) {
      if (normalize(el.outerHTML) === normOld) {
        el.outerHTML = newFragment
        return doc.documentElement.outerHTML
      }
    }

    // ── Strategy 4: text-signature match (last resort). When both the live
    // DOM and source have been through different parsers, inner text content
    // is the most stable invariant. We match on tag + full textContent. ──
    const signature = (el: Element) =>
      `${el.tagName.toLowerCase()}|${(el.textContent || '').replace(/\s+/g, ' ').trim()}`
    const tmpDoc = new DOMParser().parseFromString(`<div>${oldFragment}</div>`, 'text/html')
    const oldEl = tmpDoc.body.firstElementChild?.firstElementChild
    if (oldEl) {
      const oldSig = signature(oldEl)
      for (const el of Array.from(doc.querySelectorAll(oldEl.tagName))) {
        if (signature(el) === oldSig) {
          el.outerHTML = newFragment
          return doc.documentElement.outerHTML
        }
      }
    }
  } catch { /* ignore */ }

  return null
}

// ─── ComponentButton ─────────────────────────────────────────────────────────
// Reusable row used in both the grouped view and the search results list.
function ComponentButton({
  item,
  catLabel,
  catColor,
  onAdd,
  onHoverEnter,
  onHoverLeave,
  showCategory = false,
}: {
  item: ComponentItem
  catLabel: string
  catColor: string
  onAdd: () => void
  onHoverEnter: () => void
  onHoverLeave: () => void
  showCategory?: boolean
}) {
  return (
    <button
      onClick={onAdd}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      className="w-full flex items-center gap-2.5 p-2.5 rounded-md border border-border hover:border-primary/50 hover:bg-primary/5 text-left transition-all group"
    >
      {/* Emoji thumbnail */}
      <span className="text-base leading-none shrink-0 w-7 h-7 flex items-center justify-center rounded-md bg-muted/60 group-hover:bg-primary/10 transition-colors">
        {item.icon}
      </span>

      {/* Label + optional category badge */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-tight">{item.label}</p>
        {showCategory && (
          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-sm mt-0.5 font-medium ${catColor}`}>
            {catLabel}
          </span>
        )}
        {!showCategory && item.tags.length > 0 && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {item.tags.slice(0, 3).join(' · ')}
          </p>
        )}
      </div>

      <Plus className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
    </button>
  )
}

export function VisualEditor({ code, onSave, onClose, llmConfig }: VisualEditorProps) {
  const [currentHtml, setCurrentHtml] = useState(code.fullHtml)
  const [history, setHistory] = useState<string[]>([code.fullHtml])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [mode, setMode] = useState<'visual' | 'code'>('visual')
  const [codeEditorValue, setCodeEditorValue] = useState(code.fullHtml)
  const [isDragMode, setIsDragMode] = useState(false)

  const [rightPanel, setRightPanel] = useState<'ai' | 'components' | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isAiLoading, setIsAiLoading] = useState(false)

  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Stats & KPIs', 'Industrial'])
  const [componentSearch, setComponentSearch] = useState('')
  const [customHtml, setCustomHtml] = useState('')
  const [customHtmlError, setCustomHtmlError] = useState('')
  const [addTarget, setAddTarget] = useState<'end' | 'start'>('end')
  const [htmlNodes, setHtmlNodes] = useState<HtmlNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [componentTab, setComponentTab] = useState<'add' | 'manage'>('add')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Region selection state for AI assistant
  const [isPickMode, setIsPickMode] = useState(false)
  const [pickedElement, setPickedElement] = useState<{
    html: string
    path: string    // stable CSS selector path from <body>, e.g. "body > div:nth-of-type(1) > aside > div.sidebar > nav > ul > li:nth-of-type(3)"
    label: string   // human-readable: "div.card — Sales"
  } | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  // Use a ref to always have the latest isDragMode in message handlers (avoids stale closures)
  const isDragModeRef = useRef(false)
  const isPickModeRef = useRef(false)

  const effectiveLLMConfig = llmConfig || {
    ...DEFAULT_CONFIGS.ollama,
    model: getDefaultModel('ollama'),
  }

  // Inject the highlight + drag scripts into the preview HTML
  const previewHtml = (() => {
    if (!currentHtml || typeof currentHtml !== 'string') return ''
    const base = createPreviewHtml({ ...code, fullHtml: currentHtml })
    if (!base) return ''
    return base.includes('</body>')
      ? base.replace('</body>', `${IFRAME_HIGHLIGHT_SCRIPT}${IFRAME_DRAG_SCRIPT}${IFRAME_SELECT_SCRIPT}</body>`)
      : base
  })()

  useEffect(() => {
    if (mode === 'code') setCodeEditorValue(currentHtml)
  }, [mode, currentHtml])

  // NOTE: The drag-mode safety net (re-enabling drag after HTML change) has been
  // intentionally removed. Drag mode now auto-disables after each successful drop
  // (via VE_DRAG_COMPLETE), so the user must re-enable it to perform another drag.
  // The VE_IFRAME_READY handler still re-enables drag if the user had it on before
  // a non-drag HTML update (e.g. AI edit, component add).

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (rightPanel === 'components' && componentTab === 'manage') {
      setHtmlNodes(parseHtmlToNodes(currentHtml))
    }
  }, [currentHtml, rightPanel, componentTab])

  // Clear all iframe overlays when switching tabs/panels
  useEffect(() => {
    iframeHighlight(iframeRef, null)
    iframeShowInsertionPoint(iframeRef, null)
  }, [componentTab, rightPanel])

  const historyIndexRef = useRef(historyIndex)
  useEffect(() => { historyIndexRef.current = historyIndex }, [historyIndex])

  // Small helper: true when focus is inside an editable field so we don't
  // steal Cmd+Z / typing from the HTML textarea or chat input.
  const isTypingTarget = (el: EventTarget | null) => {
    if (!(el instanceof HTMLElement)) return false
    if (el.isContentEditable) return true
    const tag = el.tagName
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
  }

  const applyHtmlChange = useCallback((newHtml: string) => {
    if (!newHtml || typeof newHtml !== 'string') return
    setCurrentHtml(prev => {
      if (newHtml === prev) return prev
      return newHtml
    })
    setHistory(prev => {
      const idx = historyIndexRef.current
      if (newHtml === prev[idx]) return prev
      const newHistory = prev.slice(0, idx + 1)
      newHistory.push(newHtml)
      return newHistory.slice(-50)
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [])

  // Keep refs in sync so message handlers never read a stale closure value
  useEffect(() => { isDragModeRef.current = isDragMode }, [isDragMode])
  useEffect(() => { isPickModeRef.current = isPickMode }, [isPickMode])

  // Listen for HTML updates, iframe ready signal, and selection results
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'VE_HTML_UPDATE' && typeof e.data.html === 'string') {
        applyHtmlChange(e.data.html)
        setHtmlNodes(parseHtmlToNodes(e.data.html))
      }
      if (e.data?.type === 'VE_IFRAME_READY') {
        if (isDragModeRef.current) {
          iframeRef.current?.contentWindow?.postMessage({ type: 'VE_DRAG_MODE_ON' }, '*')
        }
        if (isPickModeRef.current) {
          iframeRef.current?.contentWindow?.postMessage({ type: 'VE_PICK_MODE_ON' }, '*')
        }
      }
      if (e.data?.type === 'VE_PICK_RESULT' && typeof e.data.html === 'string') {
        // Single-shot picker: turn off pick mode after a successful pick
        setIsPickMode(false)
        isPickModeRef.current = false

        // Build a readable label: "div.card — Sales monthly"
        const tag = String(e.data.tag || 'element')
        const cls = String(e.data.classes || '')
        const text = String(e.data.text || '')
        const label = [`${tag}${cls}`, text].filter(Boolean).join(' — ')
        const path = typeof e.data.path === 'string' ? e.data.path : ''

        setPickedElement({ html: e.data.html, path, label: label || tag })
      }
      if (e.data?.type === 'VE_PICK_CANCELLED') {
        setIsPickMode(false)
        isPickModeRef.current = false
      }
      // Auto-disable drag mode after every successful move so the user must
      // deliberately re-enable it before performing another drag.
      if (e.data?.type === 'VE_DRAG_COMPLETE') {
        setIsDragMode(false)
        isDragModeRef.current = false
        // The iframe already cleaned itself up in notifyParent(), so we just
        // need to keep React state in sync — no need to post VE_DRAG_MODE_OFF.
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyHtmlChange])

  const handleIframeLoad = useCallback(() => {
    // Fallback: also send drag-on via the onLoad event in case VE_IFRAME_READY
    // is missed (e.g. the script runs before the message listener is attached)
    if (isDragModeRef.current) {
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'VE_DRAG_MODE_ON' }, '*')
      }, 300)
    }
  }, []) // no deps – reads through ref

  const toggleDragMode = useCallback(() => {
    const next = !isDragModeRef.current
    // Drag mode and pick mode are mutually exclusive.
    if (next && isPickModeRef.current) {
      setIsPickMode(false)
      isPickModeRef.current = false
      iframeRef.current?.contentWindow?.postMessage({ type: 'VE_PICK_MODE_OFF' }, '*')
    }
    setIsDragMode(next)
    isDragModeRef.current = next
    iframeRef.current?.contentWindow?.postMessage(
      { type: next ? 'VE_DRAG_MODE_ON' : 'VE_DRAG_MODE_OFF' },
      '*'
    )
  }, [])

  const togglePickMode = useCallback(() => {
    const next = !isPickModeRef.current
    // Pick mode and drag mode are mutually exclusive (both intercept clicks).
    if (next && isDragModeRef.current) {
      setIsDragMode(false)
      isDragModeRef.current = false
      iframeRef.current?.contentWindow?.postMessage({ type: 'VE_DRAG_MODE_OFF' }, '*')
    }
    setIsPickMode(next)
    isPickModeRef.current = next
    iframeRef.current?.contentWindow?.postMessage(
      { type: next ? 'VE_PICK_MODE_ON' : 'VE_PICK_MODE_OFF' },
      '*'
    )
  }, [])

  const clearPickedElement = useCallback(() => {
    setPickedElement(null)
    iframeRef.current?.contentWindow?.postMessage({ type: 'VE_CLEAR_PICK' }, '*')
  }, [])

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      const entry = history[newIndex]
      if (!entry || typeof entry !== 'string') return
      setHistoryIndex(newIndex)
      historyIndexRef.current = newIndex
      setCurrentHtml(entry)
      setCodeEditorValue(entry)
    }
  }, [historyIndex, history])

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      const entry = history[newIndex]
      if (!entry || typeof entry !== 'string') return
      setHistoryIndex(newIndex)
      historyIndexRef.current = newIndex
      setCurrentHtml(entry)
      setCodeEditorValue(entry)
    }
  }, [historyIndex, history])



  const handleApplyCodeChanges = useCallback(() => {
    applyHtmlChange(codeEditorValue)
  }, [codeEditorValue, applyHtmlChange])

  const handleSaveAndClose = useCallback(() => {
    const updatedCode: GeneratedCode = {
      ...code,
      fullHtml: currentHtml,
      html: extractBodyContent(currentHtml),
      css: extractStyles(currentHtml),
      js: extractScripts(currentHtml),
    }
    onSave(updatedCode)
    onClose()
  }, [currentHtml, code, onSave, onClose])

  // Global keyboard shortcuts: Cmd/Ctrl+Z undo, +Shift+Z (or +Y) redo,
  // Cmd+S save, Esc progressively exits modes. Guarded against firing while
  // the user is typing in an input/textarea/contenteditable.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod && e.key !== 'Escape') return
      if (isTypingTarget(e.target) && e.key !== 'Escape') return

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) handleRedo()
        else handleUndo()
        return
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        handleRedo()
        return
      }
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault()
        handleSaveAndClose()
        return
      }
      if (e.key === 'Escape' && !isTypingTarget(e.target)) {
        // Progressive escape: exit pick mode → drag mode → (no default close,
        // users should use the Cancel button to avoid accidental data loss)
        if (isPickModeRef.current) {
          setIsPickMode(false)
          isPickModeRef.current = false
          iframeRef.current?.contentWindow?.postMessage({ type: 'VE_PICK_MODE_OFF' }, '*')
          return
        }
        if (isDragModeRef.current) {
          setIsDragMode(false)
          isDragModeRef.current = false
          iframeRef.current?.contentWindow?.postMessage({ type: 'VE_DRAG_MODE_OFF' }, '*')
          return
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleUndo, handleRedo, handleSaveAndClose])

  const handleAddComponent = useCallback((templateHtml: string) => {
    iframeShowInsertionPoint(iframeRef, null)
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(currentHtml, 'text/html')

      // Resolve the content container — the element whose *children* are the
      // top-level dashboard blocks (rows, cards, etc.). We intentionally avoid
      // selecting a specific .row as the target because that would insert the
      // new component *inside* that row rather than after all existing rows.
      const container: Element | null =
        doc.querySelector('.content-wrapper section.content') ??
        doc.querySelector('.content-wrapper .content') ??
        doc.querySelector('.content-wrapper') ??
        doc.querySelector('main') ??
        doc.querySelector('body')

      if (!container) return

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = templateHtml
      const newEl = tempDiv.firstElementChild
      if (!newEl) return

      if (addTarget === 'end') {
        // Append after the last existing child → true "bottom" insertion
        container.appendChild(newEl)
      } else {
        // Prepend before the first existing child → true "top" insertion
        container.insertBefore(newEl, container.firstChild)
      }

      const newHtml = doc.documentElement.outerHTML
      applyHtmlChange(newHtml)

      // Update the HTML nodes list for the manage tab
      setHtmlNodes(parseHtmlToNodes(newHtml))
    } catch {
      // Fallback: splice raw HTML just before </body> (bottom) or just after
      // <body> (top) so the intent is still honoured even when DOM parsing fails.
      let newHtml: string
      if (addTarget === 'end') {
        newHtml = currentHtml.replace(/<\/body>/i, `${templateHtml}\n</body>`)
      } else {
        newHtml = currentHtml.replace(/<body([^>]*)>/i, `<body$1>\n${templateHtml}`)
      }
      applyHtmlChange(newHtml)
      setHtmlNodes(parseHtmlToNodes(newHtml))
    }
  }, [currentHtml, addTarget, applyHtmlChange, isDragMode])

  const handleDeleteNode = useCallback((node: HtmlNode) => {
    iframeHighlight(iframeRef, null)
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(currentHtml, 'text/html')

      // Try selectors in order: primary nth-of-type path first (always unique),
      // then class-based fallbacks using matchIndex to pick the right sibling.
      let el: Element | null = null
      try { el = doc.querySelector(node.selector) } catch { /* skip */ }

      if (!el) {
        for (const sel of node.selectorFallbacks) {
          try {
            const all = Array.from(doc.querySelectorAll(sel)).filter(
              e => !e.id.startsWith('__ve') && !e.classList.contains('__ve_handle__')
            )
            if (all.length > 0) {
              // matchIndex is 1-based; clamp to the actual count in this document
              el = all[Math.min(node.matchIndex, all.length) - 1]
              break
            }
          } catch { /* skip invalid selector */ }
        }
      }
      
      if (el && el.parentNode) {
        el.parentNode.removeChild(el)
        const newHtml = doc.documentElement.outerHTML
        applyHtmlChange(newHtml)
        setDeleteConfirm(null)
        setSelectedNodeId(null)
        setHtmlNodes(parseHtmlToNodes(newHtml))
      }
    } catch { /* ignore */ }
  }, [currentHtml, applyHtmlChange, isDragMode])

  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || isAiLoading) return
    const userMessage = chatInput.trim()
    const htmlSnapshot = currentHtml
    // Capture the pick at submit time (state may change during the async call)
    const picked = pickedElement

    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatInput('')
    setIsAiLoading(true)

    // ══════════════════════════════════════════════════════════════════════
    // ELEMENT MODE — user picked a specific element via the DOM picker.
    // Ask the model for just the modified fragment (small output, small input).
    // ══════════════════════════════════════════════════════════════════════
    if (picked) {
      const systemPrompt = `You are a precise HTML editor working on an AdminLTE dashboard (Bootstrap 4/5, Font Awesome already loaded). The user picked a specific element.

PICKED ELEMENT:
\`\`\`html
${picked.html}
\`\`\`

RULES:
1. Output ONLY the modified fragment with the requested change applied.
2. Do NOT wrap in <!DOCTYPE>, <html>, <head>, or <body>.
3. Preserve every existing class, id, attribute, and nested element not mentioned in the change.
4. No markdown fences, no explanations.

UI CONSISTENCY (critical — the page must keep its look):
- This is AdminLTE. Reuse the same class patterns you see in the picked element (.card / .card-header / .card-body / .card-footer; .small-box / .info-box; .btn-primary / .btn-success / .btn-danger; .badge; .nav-item / .nav-link; .text-*; .bg-*).
- When adding new elements, clone the structure of existing siblings — do NOT invent CSS classes, do NOT add <style> blocks, do NOT use inline "style" attributes for layout or colours (use AdminLTE utility classes like .bg-primary, .text-white, .p-3, .mt-2).
- Icons are Font Awesome: <i class="fas fa-..."></i>. Charts are Chart.js inside a <canvas>.`

      try {
        let fullResponse = ''
        await generateCompletion(
          effectiveLLMConfig,
          [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          {
            onToken: (t) => { fullResponse += t },
            onComplete: () => {
              let cleaned = fullResponse.trim()
              if (cleaned.startsWith('```html')) cleaned = cleaned.slice(7)
              else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
              if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
              cleaned = cleaned.trim()

              if (!cleaned || cleaned.length < 5) {
                setChatMessages(prev => [...prev, {
                  role: 'assistant',
                  content: 'The model returned an empty response. Try rephrasing, or switch to Quality mode for a more reliable edit.',
                }])
                setIsAiLoading(false)
                return
              }

              const newFull = replaceFragmentInDocument(
                htmlSnapshot,
                picked.html,
                cleaned,
                picked.path,
              )
              if (!newFull) {
                setChatMessages(prev => [...prev, {
                  role: 'assistant',
                  content: 'Could not locate the picked element in the document. It may have changed since you picked it — clear the selection and pick again.',
                }])
                setIsAiLoading(false)
                return
              }

              applyHtmlChange(newFull)
              // After a successful edit the picked element's outerHTML is stale;
              // clear it so the user re-picks if they want another change.
              setPickedElement(null)
              iframeRef.current?.contentWindow?.postMessage({ type: 'VE_CLEAR_PICK' }, '*')
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `Applied change to the picked ${picked.label.split(' — ')[0]}.`,
              }])
              setIsAiLoading(false)
            },
            onError: (error) => {
              setChatMessages(prev => [...prev, { role: 'assistant', content: `Model error: ${error.message}` }])
              setIsAiLoading(false)
            },
          },
        )
      } catch (error) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }])
        setIsAiLoading(false)
      }
      return
    }

    // ══════════════════════════════════════════════════════════════════════
    // FULL-PAGE MODE — JSON operations protocol.
    // We send a compact inventory of elements (not the full HTML), the model
    // responds with a small JSON array of operations, we apply them locally.
    // This is WAY more reliable than asking for the whole document back.
    // ══════════════════════════════════════════════════════════════════════
    const { inventory, annotatedHtml } = buildPageInventory(htmlSnapshot)

    if (inventory.length === 0) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Could not parse the page structure. Try using the Code tab to edit manually.',
      }])
      setIsAiLoading(false)
      return
    }

    const inventoryForPrompt = inventory.map((i) => ({
      selector: i.selector,
      tag: i.tag,
      ...(i.text ? { text: i.text } : {}),
      ...(i.classes.length ? { classes: i.classes } : {}),
    }))

    // Collect the actual AdminLTE / utility classes used on this page so the
    // model has a concrete vocabulary when creating new HTML.
    const classVocabulary = Array.from(
      new Set(inventory.flatMap(i => i.classes))
    )
      .filter(c => !c.startsWith('__ve') && !c.startsWith('data-ve'))
      .slice(0, 40)

    const systemPrompt = `You are a precise dashboard editor. Apply the user's change by outputting a JSON array of edit operations.

PAGE INVENTORY — every element you can reference is listed below with a unique "selector":
${JSON.stringify(inventoryForPrompt, null, 2)}

PAGE CLASS VOCABULARY (AdminLTE + Bootstrap utilities actually used on this page):
${classVocabulary.join(', ') || '(none detected)'}

OPERATIONS (output zero or more):
- {"op":"set_text","selector":"SEL","text":"new text"}  → replace text content
- {"op":"set_attribute","selector":"SEL","name":"href","value":"#"}  → set any attribute
- {"op":"add_class","selector":"SEL","class":"NAME"}  → add a CSS class
- {"op":"remove_class","selector":"SEL","class":"NAME"}  → remove a CSS class
- {"op":"set_style","selector":"SEL","property":"background-color","value":"#2563eb"}  → inline style
- {"op":"remove","selector":"SEL"}  → delete the element
- {"op":"append_html","selector":"SEL","html":"<div>...</div>"}  → add as last child
- {"op":"prepend_html","selector":"SEL","html":"<div>...</div>"}  → add as first child
- {"op":"replace_html","selector":"SEL","html":"<div>...</div>"}  → replace the element

STRICT RULES:
1. Output ONLY a valid JSON array. No markdown fences. No explanations. No thinking.
2. Start your response with [ and end with ].
3. Prefer selectors from the inventory. You may also use plain CSS selectors (e.g. ".main-header", ".card:nth-of-type(1)").
4. Keep operations minimal — one op per change.
5. If the change cannot be applied, output exactly: []

UI CONSISTENCY RULE (critical — the page must keep its AdminLTE look and feel):
- This is AdminLTE (Bootstrap 4/5 + Font Awesome already loaded, plus Chart.js for charts).
- When adding new HTML (via append_html, prepend_html, replace_html), you MUST reuse classes from the vocabulary above.
- Match the structure of existing siblings. For example, if you add a new stats card to a row of .small-box elements, the new card MUST also use .small-box with the same inner structure (<div class="inner"><h3>…</h3><p>…</p></div><div class="icon"><i class="fas fa-…"></i></div><a class="small-box-footer">…</a>).
- Icons are Font Awesome: <i class="fas fa-..."></i>. Do NOT invent icon classes.
- Do NOT add <style> blocks, <link> tags, or new external resources.
- Do NOT use inline "style" attributes for colours, spacing or layout — use AdminLTE / Bootstrap utility classes (.bg-primary, .bg-success, .text-white, .p-3, .mt-2, .d-flex, .text-center, etc.).
- Use set_style only for one-off visual tweaks that no utility class covers.

EXAMPLES:
User: "Change the sidebar brand to Acme Corp"
Response: [{"op":"set_text","selector":"[data-ve-id=\\"ve1\\"]","text":"Acme Corp"}]

User: "Make the first card background primary"
Response: [{"op":"add_class","selector":".card:nth-of-type(1)","class":"bg-primary"},{"op":"add_class","selector":".card:nth-of-type(1)","class":"text-white"}]

User: "Add a new stats card showing Visitors: 1,240"
Response: [{"op":"append_html","selector":".row","html":"<div class=\\"col-lg-3 col-6\\"><div class=\\"small-box bg-info\\"><div class=\\"inner\\"><h3>1,240</h3><p>Visitors</p></div><div class=\\"icon\\"><i class=\\"fas fa-users\\"></i></div><a href=\\"#\\" class=\\"small-box-footer\\">More info <i class=\\"fas fa-arrow-circle-right\\"></i></a></div></div>"}]

User: "Remove the alerts"
Response: [{"op":"remove","selector":".alert"}]`

    try {
      let fullResponse = ''
      await generateCompletion(
        effectiveLLMConfig,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        {
          onToken: (t) => { fullResponse += t },
          onComplete: () => {
            let cleaned = fullResponse.trim()
            if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
            else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
            if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
            cleaned = cleaned.trim()

            // Extract array even if model added preamble/postamble text
            const arrStart = cleaned.indexOf('[')
            const arrEnd = cleaned.lastIndexOf(']')
            if (arrStart >= 0 && arrEnd > arrStart) {
              cleaned = cleaned.slice(arrStart, arrEnd + 1)
            }

            if (!cleaned) {
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'The model returned an empty response. Try rephrasing, or switch to Quality mode.',
              }])
              setIsAiLoading(false)
              return
            }

            let ops: unknown[]
            try {
              const parsed = JSON.parse(cleaned)
              if (!Array.isArray(parsed)) throw new Error('not an array')
              ops = parsed
            } catch {
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Could not parse the model response as JSON operations. Try rephrasing with more specific wording (e.g. name the exact element).',
              }])
              setIsAiLoading(false)
              return
            }

            if (ops.length === 0) {
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: 'The model reported it could not apply this change. Try being more specific about which element to modify, or select a region first.',
              }])
              setIsAiLoading(false)
              return
            }

            const result = applyOperations(annotatedHtml, ops)
            if (result.applied === 0) {
              const reasons = result.failed.slice(0, 2).join('; ')
              setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `Could not apply any operations. ${reasons ? `Reason: ${reasons}` : 'The selectors the model chose did not match any element.'}`,
              }])
              setIsAiLoading(false)
              return
            }

            applyHtmlChange(result.html)
            const opsList = result.appliedOps.slice(0, 4).map(s => `• ${s}`).join('\n')
            const more = result.appliedOps.length > 4 ? `\n• …and ${result.appliedOps.length - 4} more` : ''
            const skipped = result.failed.length ? `\n\n${result.failed.length} operation${result.failed.length !== 1 ? 's' : ''} skipped.` : ''
            setChatMessages(prev => [...prev, {
              role: 'assistant',
              content: `Applied ${result.applied} change${result.applied !== 1 ? 's' : ''}:\n${opsList}${more}${skipped}`,
            }])
            setIsAiLoading(false)
          },
          onError: (error) => {
            setChatMessages(prev => [...prev, { role: 'assistant', content: `Model error: ${error.message}` }])
            setIsAiLoading(false)
          },
        },
      )
    } catch (error) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }])
      setIsAiLoading(false)
    }
  }, [chatInput, isAiLoading, currentHtml, pickedElement, effectiveLLMConfig, applyHtmlChange])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const togglePanel = (panel: 'ai' | 'components') => {
    setRightPanel(prev => prev === panel ? null : panel)
    if (panel === 'components') {
      setHtmlNodes(parseHtmlToNodes(currentHtml))
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-4 h-14 flex items-center justify-between bg-card shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Wand2 className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-sm">Visual Editor</span>
              <span className="text-[10px] text-muted-foreground">
                {isDragMode ? 'Drag mode' : isPickMode ? 'Pick mode' : mode === 'code' ? 'Code mode' : 'Preview'}
              </span>
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleUndo}
              disabled={!canUndo}
              title="Undo (Cmd/Ctrl+Z)"
            >
              <CornerUpLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRedo}
              disabled={!canRedo}
              title="Redo (Cmd/Ctrl+Shift+Z)"
            >
              <CornerUpRight className="h-4 w-4" />
            </Button>
            <span
              className="ml-1 flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5"
              title="History position"
            >
              <History className="h-3 w-3" />
              {historyIndex + 1}<span className="opacity-50">/</span>{history.length}
            </span>
          </div>

          <div className="h-8 w-px bg-border" />

          <Tabs value={mode} onValueChange={(v) => {
              const newMode = v as 'visual' | 'code'
              setMode(newMode)
              if (newMode === 'code' && isDragMode) {
                setIsDragMode(false)
                iframeRef.current?.contentWindow?.postMessage({ type: 'VE_DRAG_MODE_OFF' }, '*')
              }
            }}>
            <TabsList className="h-8">
              <TabsTrigger value="visual" className="text-xs px-3 h-7 gap-1.5">
                <Eye className="h-3.5 w-3.5" />Preview
              </TabsTrigger>
              <TabsTrigger value="code" className="text-xs px-3 h-7 gap-1.5">
                <FileCode2 className="h-3.5 w-3.5" />Code
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {mode === 'visual' && (
            <Button
              variant={isDragMode ? 'default' : 'outline'}
              size="sm"
              onClick={toggleDragMode}
              className={`h-8 gap-1.5 transition-all ${isDragMode ? 'ring-2 ring-primary/40 ring-offset-1' : ''}`}
              title={isDragMode ? 'Drag mode active — click to exit (Esc)' : 'Enable drag mode to reorder elements'}
            >
              <Move className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Drag</span>
              {isDragMode && (
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              )}
            </Button>
          )}
          <Button
            variant={rightPanel === 'components' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => togglePanel('components')}
            className="h-8 gap-1.5"
          >
            <Blocks className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Components</span>
          </Button>
          <Button
            variant={rightPanel === 'ai' ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => togglePanel('ai')}
            className="h-8 gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI Assistant</span>
          </Button>

          <div className="h-8 w-px bg-border mx-1" />

          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-muted-foreground hover:text-foreground" title="Discard changes (Esc)">
            <X className="h-3.5 w-3.5 mr-1" />Cancel
          </Button>
          <Button size="sm" onClick={handleSaveAndClose} className="h-8" title="Save & close (Cmd/Ctrl+S)">
            <Save className="h-3.5 w-3.5 mr-1" />Save
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {mode === 'visual' ? (
            <div className={`flex-1 bg-muted/30 relative ${isPickMode ? 'ring-2 ring-inset ring-violet-400' : isDragMode ? 'ring-2 ring-inset ring-primary/60' : ''}`}>
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                className="w-full h-full border-0 bg-background"
                title="Dashboard Preview"
                sandbox="allow-scripts allow-same-origin"
                onLoad={handleIframeLoad}
              />
              {(isPickMode || isDragMode) && (
                <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium shadow-md backdrop-blur pointer-events-none flex items-center gap-2 ${
                  isPickMode
                    ? 'bg-violet-500 text-white'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {isPickMode ? (
                    <>
                      <MousePointer className="h-3.5 w-3.5" />
                      Hover to highlight · click to pick an element
                      <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-white/20 rounded font-mono">Esc</kbd>
                    </>
                  ) : (
                    <>
                      <Move className="h-3.5 w-3.5" />
                      Hover an element · drag to reorder · disables after each move
                      <kbd className="ml-1 px-1 py-0.5 text-[10px] bg-white/20 rounded font-mono">Esc</kbd>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-hidden relative">
                <textarea
                  value={codeEditorValue}
                  onChange={(e) => setCodeEditorValue(e.target.value)}
                  className="w-full h-full p-4 font-mono text-[13px] leading-relaxed bg-muted/30 border-0 resize-none focus:outline-none focus:ring-0"
                  spellCheck={false}
                  placeholder="Edit HTML code here..."
                />
              </div>
              <div className="border-t px-3 py-2 bg-card flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileCode2 className="h-3 w-3" />
                    <span className="font-mono">
                      {codeEditorValue.split('\n').length.toLocaleString()} lines · {codeEditorValue.length.toLocaleString()} chars
                    </span>
                  </span>
                  {codeEditorValue !== currentHtml && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      Unsaved changes
                    </span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleApplyCodeChanges}
                  disabled={codeEditorValue === currentHtml}
                  className="h-7"
                >
                  Apply Changes
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Components Panel */}
        {rightPanel === 'components' && (
          <div className="w-80 border-l flex flex-col bg-card shrink-0 overflow-hidden">
            <div className="px-3 py-2.5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Blocks className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="font-medium text-sm leading-tight">Components</span>
                  <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {componentTab === 'add' ? 'Add templates to the page' : `${htmlNodes.length} elements`}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRightPanel(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Sub-tabs */}
            <div className="flex border-b text-xs font-medium px-2 pt-1.5 gap-1">
              <button
                onClick={() => setComponentTab('add')}
                className={`flex-1 py-1.5 rounded-t-md flex items-center justify-center gap-1.5 transition-colors ${
                  componentTab === 'add'
                    ? 'bg-primary/10 text-primary border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
              <button
                onClick={() => {
                  setComponentTab('manage')
                  setHtmlNodes(parseHtmlToNodes(currentHtml))
                }}
                className={`flex-1 py-1.5 rounded-t-md flex items-center justify-center gap-1.5 transition-colors ${
                  componentTab === 'manage'
                    ? 'bg-primary/10 text-primary border-b-2 border-primary -mb-px'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> Manage
              </button>
            </div>

            {componentTab === 'add' ? (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* ── Search bar ── */}
                <div className="px-3 pt-3 pb-2 border-b border-border/50 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      value={componentSearch}
                      onChange={e => setComponentSearch(e.target.value)}
                      placeholder="Search components…"
                      className="w-full text-xs pl-8 pr-7 py-1.5 rounded-md border border-border bg-muted/40 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:bg-background placeholder:text-muted-foreground/60 transition-all"
                    />
                    {componentSearch && (
                      <button
                        onClick={() => setComponentSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Insertion position ── */}
                <div className="px-3 py-2 shrink-0 border-b border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Inserir em</p>
                    <span className="text-[10px] text-muted-foreground/60">Hover para pré-visualizar</span>
                  </div>
                  <div className="flex p-0.5 bg-muted rounded-md">
                    <button
                      onClick={() => setAddTarget('start')}
                      onMouseEnter={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, 'start') }}
                      onMouseLeave={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, null) }}
                      className={`flex-1 text-xs py-1 rounded transition-all flex items-center justify-center gap-1 ${addTarget === 'start' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Insere antes de todos os elementos"
                    >↑ Topo</button>
                    <button
                      onClick={() => setAddTarget('end')}
                      onMouseEnter={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, 'end') }}
                      onMouseLeave={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, null) }}
                      className={`flex-1 text-xs py-1 rounded transition-all flex items-center justify-center gap-1 ${addTarget === 'end' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      title="Insere após todos os elementos"
                    >↓ Base</button>
                  </div>
                </div>

                {/* ── Scrollable component list ── */}
                <ScrollArea className="flex-1 overflow-hidden">
                  <div className="px-3 pb-4 pt-2 space-y-1">
                    {(() => {
                      const q = componentSearch.trim().toLowerCase()

                      // Filter + flatten when searching
                      if (q) {
                        const allItems: { catLabel: string; catColor: string; item: ComponentItem }[] = []
                        COMPONENT_TEMPLATES.forEach(cat => {
                          cat.items.forEach(item => {
                            const haystack = [item.label, ...item.tags, cat.category].join(' ').toLowerCase()
                            if (haystack.includes(q)) {
                              allItems.push({ catLabel: cat.category, catColor: cat.color, item })
                            }
                          })
                        })
                        if (allItems.length === 0) return (
                          <div className="text-center py-8 px-4">
                            <Search className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">Nenhum componente encontrado</p>
                            <button onClick={() => setComponentSearch('')} className="text-xs text-primary mt-1 underline-offset-2 hover:underline">Limpar busca</button>
                          </div>
                        )
                        return allItems.map(({ catLabel, catColor, item }) => (
                          <ComponentButton
                            key={`${catLabel}-${item.label}`}
                            item={item}
                            catLabel={catLabel}
                            catColor={catColor}
                            onAdd={() => handleAddComponent(item.html)}
                            onHoverEnter={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, addTarget) }}
                            onHoverLeave={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, null) }}
                            showCategory
                          />
                        ))
                      }

                      // Grouped view when not searching
                      return COMPONENT_TEMPLATES.map((cat) => {
                        const CatIcon = CATEGORY_ICON_MAP[cat.iconKey] ?? Blocks
                        const isCustom = cat.category === 'Custom HTML'
                        const isExpanded = expandedCategories.includes(cat.category)
                        return (
                          <div key={cat.category}>
                            <button
                              onClick={() => toggleCategory(cat.category)}
                              className="w-full flex items-center gap-2 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
                            >
                              <span className={`flex items-center justify-center h-5 w-5 rounded ${cat.color} shrink-0`}>
                                <CatIcon className="h-3 w-3" />
                              </span>
                              <span className="flex-1 text-left">{cat.category}</span>
                              {!isCustom && <span className="text-[10px] opacity-60">{cat.items.length}</span>}
                              {isExpanded
                                ? <ChevronDown className="h-3 w-3 opacity-60" />
                                : <ChevronRight className="h-3 w-3 opacity-40 group-hover:opacity-70" />
                              }
                            </button>

                            {isExpanded && (
                              <div className="space-y-1.5 ml-1 mb-2">
                                {isCustom ? (
                                  /* Custom HTML entry */
                                  <div className="border border-dashed border-border rounded-md overflow-hidden">
                                    <div className="px-2.5 py-2 bg-muted/30 flex items-center gap-1.5">
                                      <Code2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <span className="text-[11px] text-muted-foreground">Cole ou escreva HTML abaixo</span>
                                    </div>
                                    <textarea
                                      value={customHtml}
                                      onChange={e => { setCustomHtml(e.target.value); setCustomHtmlError('') }}
                                      placeholder={`<div class="col-md-6">
  <div class="card">
    <!-- seu conteúdo -->
  </div>
</div>`}
                                      className="w-full text-[11px] font-mono px-2.5 py-2 bg-muted/20 border-0 border-t border-border/50 resize-none focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground/40"
                                      rows={6}
                                      spellCheck={false}
                                    />
                                    {customHtmlError && (
                                      <p className="text-[10px] text-destructive px-2.5 py-1 bg-destructive/5">{customHtmlError}</p>
                                    )}
                                    <div className="flex gap-1.5 px-2.5 py-2 bg-muted/20 border-t border-border/50">
                                      <button
                                        onClick={() => {
                                          const trimmed = customHtml.trim()
                                          if (!trimmed) { setCustomHtmlError('O HTML não pode estar vazio.'); return }
                                          // Basic validity check: must contain at least one tag
                                          if (!/<[a-zA-Z]/.test(trimmed)) { setCustomHtmlError('HTML inválido — deve conter pelo menos uma tag.'); return }
                                          handleAddComponent(trimmed)
                                          setCustomHtml('')
                                          setCustomHtmlError('')
                                        }}
                                        disabled={!customHtml.trim()}
                                        onMouseEnter={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, addTarget) }}
                                        onMouseLeave={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, null) }}
                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                        Inserir HTML
                                      </button>
                                      {customHtml && (
                                        <button
                                          onClick={() => { setCustomHtml(''); setCustomHtmlError('') }}
                                          className="px-2.5 text-xs rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  cat.items.map(item => (
                                    <ComponentButton
                                      key={item.label}
                                      item={item}
                                      catLabel={cat.category}
                                      catColor={cat.color}
                                      onAdd={() => handleAddComponent(item.html)}
                                      onHoverEnter={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, addTarget) }}
                                      onHoverLeave={() => { if (mode === 'visual') iframeShowInsertionPoint(iframeRef, null) }}
                                    />
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              /* Manage tab */
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="px-3 py-2 shrink-0 bg-muted/30 border-b">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Hover to highlight · click to select · remove with confirmation
                  </p>
                </div>

                <ScrollArea className="flex-1 overflow-hidden">
                  <div className="px-2 py-2">
                  {htmlNodes.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <Layers className="h-6 w-6 mx-auto text-muted-foreground opacity-40 mb-2" />
                      <p className="text-xs text-muted-foreground">No elements found.</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {htmlNodes.map((node) => (
                        <div key={node.id}>
                          <button
                            onClick={() => {
                              setSelectedNodeId(node.id === selectedNodeId ? null : node.id)
                              setDeleteConfirm(null)
                              // Pass selector, fallbacks AND matchIndex so the iframe
                              // resolves the exact element among identical-class siblings
                              if (mode === 'visual') iframeHighlight(iframeRef, node.selector, node.selectorFallbacks, node.matchIndex)
                            }}
                            onMouseEnter={() => {
                              if (mode === 'visual') iframeHighlight(iframeRef, node.selector, node.selectorFallbacks, node.matchIndex)
                            }}
                            onMouseLeave={() => {
                              // Only clear if not selected
                              if (selectedNodeId !== node.id && mode === 'visual') {
                                iframeHighlight(iframeRef, null)
                              }
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-left text-xs transition-colors ${
                              selectedNodeId === node.id
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'hover:bg-muted text-foreground'
                            }`}
                            style={{ paddingLeft: `${(node.depth * 12) + 8}px` }}
                          >
                            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                            <code className="flex-1 truncate font-mono text-[11px]">{node.label}</code>
                            {node.childCount > 0 && (
                              <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">
                                {node.childCount}
                              </Badge>
                            )}
                          </button>

                          {selectedNodeId === node.id && (
                            <div className="mx-2 mb-1 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs">
                              <p className="text-muted-foreground mb-2">
                                Remove <code className="font-mono text-[10px] bg-muted px-1 rounded">{node.label}</code>?
                              </p>
                              {deleteConfirm === node.id ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-6 text-xs flex-1"
                                    onClick={() => handleDeleteNode(node)}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Confirm Delete
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-6 text-xs"
                                    onClick={() => setDeleteConfirm(null)}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-xs w-full border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                  onClick={() => setDeleteConfirm(node.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete element
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {/* AI Chat Panel */}
        {rightPanel === 'ai' && (
          <div className="w-96 border-l flex flex-col bg-card shrink-0">
            <div className="px-3 py-2.5 border-b flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="font-medium text-sm leading-tight">AI Assistant</span>
                  <span className="text-[10px] text-muted-foreground leading-tight flex items-center gap-1 mt-0.5">
                    <Cpu className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate font-mono">{effectiveLLMConfig.model || 'no model'}</span>
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRightPanel(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Element-picker toolbar */}
            <div className="px-3 py-2 border-b bg-muted/30 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={isPickMode ? 'default' : 'outline'}
                  size="sm"
                  className={`flex-1 h-7 text-xs gap-1.5 ${
                    isPickMode
                      ? 'bg-violet-500 hover:bg-violet-500/90 text-white border-violet-500'
                      : pickedElement
                      ? 'border-violet-400 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                      : ''
                  }`}
                  onClick={togglePickMode}
                  title="Click an element in the preview to pick it. The AI will only modify that element."
                >
                  <MousePointer className="h-3 w-3" />
                  {isPickMode
                    ? 'Click an element…'
                    : pickedElement
                    ? 'Pick another element'
                    : 'Pick element'}
                </Button>
                {pickedElement && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={clearPickedElement}
                    title="Clear picked element"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              {pickedElement && !isPickMode && (
                <div className="flex items-center gap-1.5 text-xs text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded px-2 py-1.5">
                  <MousePointer className="h-3 w-3 shrink-0" />
                  <span className="font-mono truncate" title={pickedElement.label}>{pickedElement.label}</span>
                </div>
              )}
              {isPickMode && (
                <p className="text-[11px] text-violet-700 dark:text-violet-400 leading-relaxed">
                  Hover any element in the preview — a dashed outline shows what will be picked. Click to confirm.
                </p>
              )}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center py-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-medium text-sm text-foreground">Describe a change</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed px-2">
                      I apply edits as structured operations — targeted and fast, even on small local models.
                    </p>

                    <div className="mt-4 text-xs text-left bg-muted/60 rounded-lg p-3 space-y-2">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <Bot className="h-3.5 w-3.5" /> Try asking
                      </p>
                      <ul className="space-y-1.5 text-muted-foreground">
                        <li className="flex gap-1.5"><span className="text-primary">›</span><span>&quot;Change the sidebar brand to Acme&quot;</span></li>
                        <li className="flex gap-1.5"><span className="text-primary">›</span><span>&quot;Make the first card red&quot;</span></li>
                        <li className="flex gap-1.5"><span className="text-primary">›</span><span>&quot;Remove all alerts&quot;</span></li>
                        <li className="flex gap-1.5"><span className="text-primary">›</span><span>&quot;Rename Sales to Revenue&quot;</span></li>
                      </ul>
                    </div>

                    <div className="mt-2 text-xs text-left bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900 rounded-lg p-3 space-y-2">
                      <p className="font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                        <MousePointer className="h-3.5 w-3.5" /> With a picked element
                      </p>
                      <ul className="space-y-1.5 text-violet-900/80 dark:text-violet-200/80">
                        <li className="flex gap-1.5"><span>›</span><span>&quot;Change background to green&quot;</span></li>
                        <li className="flex gap-1.5"><span>›</span><span>&quot;Make the number bigger&quot;</span></li>
                        <li className="flex gap-1.5"><span>›</span><span>&quot;Remove this&quot;</span></li>
                      </ul>
                      <p className="text-[11px] text-violet-700/80 dark:text-violet-300/70 pt-1">
                        Tip: use <strong>Pick element</strong> above for precise edits.
                      </p>
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => {
                  const isUser = msg.role === 'user'
                  const isError = !isUser && /^(Could not|Unable|The model|Unexpected|Model error|Invalid)/i.test(msg.content)
                  const isSuccess = !isUser && /^Applied /i.test(msg.content)
                  return (
                    <div key={i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isUser
                            ? 'bg-primary text-primary-foreground'
                            : isError
                            ? 'bg-destructive/15 text-destructive'
                            : isSuccess
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {isUser ? (
                          <User className="h-3 w-3" />
                        ) : isError ? (
                          <AlertCircle className="h-3 w-3" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <Bot className="h-3 w-3" />
                        )}
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg text-sm max-w-[85%] whitespace-pre-wrap break-words ${
                          isUser
                            ? 'bg-primary text-primary-foreground'
                            : isError
                            ? 'bg-destructive/10 text-destructive border border-destructive/20'
                            : isSuccess
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-900'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  )
                })}
                {isAiLoading && (
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="h-3 w-3" />
                    </div>
                    <div className="bg-muted px-3 py-2 rounded-lg text-sm flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t space-y-2">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={pickedElement
                  ? `Describe what to change in the picked ${pickedElement.label.split(' — ')[0]}…`
                  : 'Describe a change (e.g. "Add a stats card for Visitors: 1240")…'}
                className={`min-h-[72px] text-sm resize-none ${pickedElement ? 'border-violet-400 focus-visible:ring-violet-400' : ''}`}
                disabled={isAiLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleChatSubmit()
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-[9px]">Enter</kbd> to send ·
                  <kbd className="px-1 py-0.5 bg-muted rounded font-mono text-[9px] ml-1">Shift+Enter</kbd> newline
                </span>
                <Button
                  size="sm"
                  onClick={handleChatSubmit}
                  disabled={!chatInput.trim() || isAiLoading}
                  className="h-8"
                >
                  {isAiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Send className="h-3.5 w-3.5 mr-1" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch) {
    return bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim()
  }
  return html
}

function extractStyles(html: string): string {
  const styleMatches = html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)
  if (styleMatches) {
    return styleMatches.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n')
  }
  return ''
}

function extractScripts(html: string): string {
  const scriptMatches = html.match(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)
  if (scriptMatches) {
    return scriptMatches.map(s => s.replace(/<\/?script[^>]*>/gi, '')).join('\n')
  }
  return ''
}
