/**
 * AdminLTE component library — migrated from the old custom visual-editor
 * into GrapesJS block definitions.
 *
 * Each block has:
 *   id       — unique per block
 *   label    — HTML shown in the block panel (emoji + name)
 *   category — group label in the Blocks panel
 *   content  — raw AdminLTE/Bootstrap HTML inserted on drop
 *
 * When adding new blocks, follow the same AdminLTE class conventions the LLM
 * uses (card / small-box / info-box / col-* / form-group) so the visual
 * editor and the generator stay consistent.
 */

export interface AdminLteBlockDef {
  id: string
  label: string
  category: string
  media: string
  // GrapesJS accepts either a raw HTML string or a component definition
  // object (e.g. `{ type: 'image', attributes: {...} }`).
  content: string | Record<string, unknown>
}

// Small helper: renders an emoji + label as the block's preview card.
const preview = (emoji: string, name: string) =>
  `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:4px 0;">
     <div style="font-size:22px;line-height:1;">${emoji}</div>
     <div style="font-size:10px;font-weight:500;text-align:center;line-height:1.2;">${name}</div>
   </div>`

export const ADMINLTE_BLOCKS: AdminLteBlockDef[] = [
  // ── Stats & KPIs ────────────────────────────────────────────────────────
  {
    id: 'stats-small-box',
    category: 'Stats & KPIs',
    label: preview('📊', 'Small Box'),
    media: '📊',
    content: `<div class="col-lg-3 col-6">
  <div class="small-box bg-info">
    <div class="inner"><h3>150</h3><p>New Metric</p></div>
    <div class="icon"><i class="fas fa-chart-bar"></i></div>
    <a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a>
  </div>
</div>`,
  },
  {
    id: 'stats-info-box',
    category: 'Stats & KPIs',
    label: preview('📋', 'Info Box'),
    media: '📋',
    content: `<div class="col-md-3 col-sm-6 col-12">
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
    id: 'stats-info-box-progress',
    category: 'Stats & KPIs',
    label: preview('📶', 'Info + Progress'),
    media: '📶',
    content: `<div class="col-md-3 col-sm-6 col-12">
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
    id: 'stats-metric-row',
    category: 'Stats & KPIs',
    label: preview('🔢', 'Metric Row (4)'),
    media: '🔢',
    content: `<div class="col-12">
  <div class="row">
    <div class="col-lg-3 col-6">
      <div class="small-box bg-info"><div class="inner"><h3>150</h3><p>New Orders</p></div><div class="icon"><i class="fas fa-shopping-bag"></i></div><a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a></div>
    </div>
    <div class="col-lg-3 col-6">
      <div class="small-box bg-success"><div class="inner"><h3>53<sup style="font-size:20px">%</sup></h3><p>Bounce Rate</p></div><div class="icon"><i class="fas fa-chart-bar"></i></div><a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a></div>
    </div>
    <div class="col-lg-3 col-6">
      <div class="small-box bg-warning"><div class="inner"><h3>44</h3><p>User Registrations</p></div><div class="icon"><i class="fas fa-user-plus"></i></div><a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a></div>
    </div>
    <div class="col-lg-3 col-6">
      <div class="small-box bg-danger"><div class="inner"><h3>65</h3><p>Unique Visitors</p></div><div class="icon"><i class="fas fa-chart-pie"></i></div><a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a></div>
    </div>
  </div>
</div>`,
  },

  // ── Charts ──────────────────────────────────────────────────────────────
  {
    id: 'chart-line',
    category: 'Charts',
    label: preview('📈', 'Line Chart'),
    media: '📈',
    content: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Line Chart</h3></div>
    <div class="card-body"><canvas class="ve-chart" data-chart-type="line" style="min-height:250px;height:250px;max-width:100%;"></canvas></div>
  </div>
</div>`,
  },
  {
    id: 'chart-bar',
    category: 'Charts',
    label: preview('📊', 'Bar Chart'),
    media: '📊',
    content: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Bar Chart</h3></div>
    <div class="card-body"><canvas class="ve-chart" data-chart-type="bar" style="min-height:250px;height:250px;max-width:100%;"></canvas></div>
  </div>
</div>`,
  },
  {
    id: 'chart-pie',
    category: 'Charts',
    label: preview('🥧', 'Pie Chart'),
    media: '🥧',
    content: `<div class="col-md-6">
  <div class="card">
    <div class="card-header"><h3 class="card-title">Pie Chart</h3></div>
    <div class="card-body"><canvas class="ve-chart" data-chart-type="pie" style="min-height:250px;height:250px;max-width:100%;"></canvas></div>
  </div>
</div>`,
  },
  {
    id: 'chart-sparkline',
    category: 'Charts',
    label: preview('〰️', 'Sparkline'),
    media: '〰️',
    content: `<div class="col-md-3 col-sm-6 col-12">
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

  // ── Tables ──────────────────────────────────────────────────────────────
  {
    id: 'table-basic',
    category: 'Tables',
    label: preview('🗂️', 'Basic Table'),
    media: '🗂️',
    content: `<div class="col-12">
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
    id: 'table-striped',
    category: 'Tables',
    label: preview('📑', 'Striped Table'),
    media: '📑',
    content: `<div class="col-12">
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
    id: 'table-actions',
    category: 'Tables',
    label: preview('🔧', 'Table + Actions'),
    media: '🔧',
    content: `<div class="col-12">
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

  // ── Alerts ──────────────────────────────────────────────────────────────
  {
    id: 'alert-warning',
    category: 'Alerts',
    label: preview('⚠️', 'Warning'),
    media: '⚠️',
    content: `<div class="col-12">
  <div class="alert alert-warning alert-dismissible">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
    <h5><i class="icon fas fa-exclamation-triangle"></i> Warning!</h5>
    This is a warning alert message.
  </div>
</div>`,
  },
  {
    id: 'alert-success',
    category: 'Alerts',
    label: preview('✅', 'Success'),
    media: '✅',
    content: `<div class="col-12">
  <div class="alert alert-success alert-dismissible">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
    <h5><i class="icon fas fa-check"></i> Success!</h5>
    Operation completed successfully.
  </div>
</div>`,
  },
  {
    id: 'alert-danger',
    category: 'Alerts',
    label: preview('🚨', 'Danger'),
    media: '🚨',
    content: `<div class="col-12">
  <div class="alert alert-danger alert-dismissible">
    <button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>
    <h5><i class="icon fas fa-ban"></i> Error!</h5>
    Something went wrong. Please try again.
  </div>
</div>`,
  },
  {
    id: 'alert-callout',
    category: 'Alerts',
    label: preview('💬', 'Callout'),
    media: '💬',
    content: `<div class="col-12">
  <div class="callout callout-info">
    <h5>This is an info callout</h5>
    <p>Use callouts to highlight information without the visual weight of a full alert.</p>
  </div>
</div>`,
  },

  // ── Forms ───────────────────────────────────────────────────────────────
  {
    id: 'form-basic',
    category: 'Forms',
    label: preview('📝', 'Basic Form'),
    media: '📝',
    content: `<div class="col-md-6">
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
    id: 'form-search',
    category: 'Forms',
    label: preview('🔍', 'Search Bar'),
    media: '🔍',
    content: `<div class="col-12">
  <div class="card">
    <div class="card-body">
      <div class="input-group">
        <input type="search" class="form-control form-control-lg" placeholder="Search&hellip;">
        <div class="input-group-append">
          <button type="button" class="btn btn-lg btn-default"><i class="fas fa-search"></i></button>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'form-date-range',
    category: 'Forms',
    label: preview('📅', 'Date Range'),
    media: '📅',
    content: `<div class="col-12">
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
    id: 'form-toggles',
    category: 'Forms',
    label: preview('🔘', 'Toggles'),
    media: '🔘',
    content: `<div class="col-md-6">
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

  // ── Navigation ──────────────────────────────────────────────────────────
  {
    id: 'nav-breadcrumb',
    category: 'Navigation',
    label: preview('🗺️', 'Breadcrumb'),
    media: '🗺️',
    content: `<div class="col-12">
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
    id: 'nav-tabs',
    category: 'Navigation',
    label: preview('📂', 'Nav Tabs'),
    media: '📂',
    content: `<div class="col-12">
  <div class="card">
    <div class="card-header p-0">
      <ul class="nav nav-tabs">
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
    id: 'nav-pagination',
    category: 'Navigation',
    label: preview('📄', 'Pagination'),
    media: '📄',
    content: `<div class="col-12">
  <div class="card">
    <div class="card-body">
      <ul class="pagination justify-content-center mb-0">
        <li class="page-item disabled"><a class="page-link" href="#">&laquo;</a></li>
        <li class="page-item active"><a class="page-link" href="#">1</a></li>
        <li class="page-item"><a class="page-link" href="#">2</a></li>
        <li class="page-item"><a class="page-link" href="#">3</a></li>
        <li class="page-item"><a class="page-link" href="#">&raquo;</a></li>
      </ul>
    </div>
  </div>
</div>`,
  },

  // ── Widgets ─────────────────────────────────────────────────────────────
  {
    id: 'widget-profile',
    category: 'Widgets',
    label: preview('👤', 'Profile'),
    media: '👤',
    content: `<div class="col-md-4">
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
    id: 'widget-text-card',
    category: 'Widgets',
    label: preview('📝', 'Text Card'),
    media: '📝',
    content: `<div class="col-md-6">
  <div class="card card-default">
    <div class="card-header"><h3 class="card-title">Text Card</h3></div>
    <div class="card-body"><p>Add your content here. This is a general-purpose text card for notes, descriptions, or any other content.</p></div>
  </div>
</div>`,
  },
  {
    id: 'widget-timeline',
    category: 'Widgets',
    label: preview('🕐', 'Timeline'),
    media: '🕐',
    content: `<div class="col-md-6">
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
    id: 'widget-progress',
    category: 'Widgets',
    label: preview('▰', 'Progress Bars'),
    media: '▰',
    content: `<div class="col-md-6">
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

  // ── Industrial / SCADA ──────────────────────────────────────────────────
  {
    id: 'industrial-sensor',
    category: 'Industrial',
    label: preview('🌡️', 'Sensor Card'),
    media: '🌡️',
    content: `<div class="col-md-3 col-sm-6 col-12">
  <div class="info-box bg-gradient-info">
    <span class="info-box-icon"><i class="fas fa-thermometer-half"></i></span>
    <div class="info-box-content">
      <span class="info-box-text">Temperature</span>
      <span class="info-box-number">72.4 &deg;F</span>
      <div class="progress"><div class="progress-bar" style="width:72%"></div></div>
      <span class="progress-description">Within normal range</span>
    </div>
  </div>
</div>`,
  },
  {
    id: 'industrial-device-status',
    category: 'Industrial',
    label: preview('🔌', 'Device Status'),
    media: '🔌',
    content: `<div class="col-md-6">
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
    id: 'industrial-alarms',
    category: 'Industrial',
    label: preview('🚨', 'Alarms Panel'),
    media: '🚨',
    content: `<div class="col-12">
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
    id: 'industrial-health',
    category: 'Industrial',
    label: preview('⚙️', 'Health Score'),
    media: '⚙️',
    content: `<div class="col-md-4">
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

  // ── Layout ──────────────────────────────────────────────────────────────
  {
    id: 'layout-two-col',
    category: 'Layout',
    label: preview('⬜', 'Two Columns'),
    media: '⬜',
    content: `<div class="col-12">
  <div class="row">
    <div class="col-md-6"><div class="card"><div class="card-body"><p class="text-muted">Left column content</p></div></div></div>
    <div class="col-md-6"><div class="card"><div class="card-body"><p class="text-muted">Right column content</p></div></div></div>
  </div>
</div>`,
  },
  {
    id: 'layout-three-col',
    category: 'Layout',
    label: preview('🔲', 'Three Columns'),
    media: '🔲',
    content: `<div class="col-12">
  <div class="row">
    <div class="col-md-4"><div class="card"><div class="card-body"><p class="text-muted">Column 1</p></div></div></div>
    <div class="col-md-4"><div class="card"><div class="card-body"><p class="text-muted">Column 2</p></div></div></div>
    <div class="col-md-4"><div class="card"><div class="card-body"><p class="text-muted">Column 3</p></div></div></div>
  </div>
</div>`,
  },
  {
    id: 'layout-divider',
    category: 'Layout',
    label: preview('➖', 'Section Divider'),
    media: '➖',
    content: `<div class="col-12">
  <div class="d-flex align-items-center my-2">
    <hr class="flex-grow-1">
    <span class="mx-3 text-muted font-weight-bold text-uppercase" style="font-size:11px;letter-spacing:0.1em;">Section Title</span>
    <hr class="flex-grow-1">
  </div>
</div>`,
  },
  {
    id: 'layout-row',
    category: 'Layout',
    label: preview('▭', 'Empty Row'),
    media: '▭',
    content: `<div class="row"></div>`,
  },

  // ── Basic building blocks ───────────────────────────────────────────────
  // Generic HTML blocks that aren't AdminLTE-specific. Useful when the user
  // just wants plain text, a button, an image, etc.
  {
    id: 'basic-text',
    category: 'Basic',
    label: preview('T', 'Text'),
    media: 'T',
    content: `<p style="margin:0;">Insert your text here. Click to edit.</p>`,
  },
  {
    id: 'basic-heading',
    category: 'Basic',
    label: preview('H', 'Heading'),
    media: 'H',
    content: `<h2 style="margin:0 0 .5rem 0;">Section heading</h2>`,
  },
  {
    id: 'basic-paragraph',
    category: 'Basic',
    label: preview('¶', 'Paragraph'),
    media: '¶',
    content: `<p class="text-muted" style="margin:0 0 1rem 0;">A longer paragraph of descriptive content you can edit in place. Perfect for lead text, descriptions or captions.</p>`,
  },
  {
    id: 'basic-image',
    category: 'Basic',
    label: preview('🖼', 'Image'),
    media: '🖼',
    content: {
      type: 'image',
      style: { 'max-width': '100%', height: 'auto' },
      attributes: {
        src: 'https://placehold.co/600x320?text=Image',
        alt: 'Image',
      },
    },
  },
  {
    id: 'basic-link',
    category: 'Basic',
    label: preview('🔗', 'Link'),
    media: '🔗',
    content: `<a href="#" class="text-primary">Link text</a>`,
  },
  {
    id: 'basic-button',
    category: 'Basic',
    label: preview('🔘', 'Button'),
    media: '🔘',
    content: `<button type="button" class="btn btn-primary">Button</button>`,
  },
  {
    id: 'basic-button-group',
    category: 'Basic',
    label: preview('▣▢', 'Button Group'),
    media: '▣▢',
    content: `<div class="btn-group" role="group">
  <button type="button" class="btn btn-primary">Save</button>
  <button type="button" class="btn btn-secondary">Cancel</button>
</div>`,
  },
  {
    id: 'basic-divider',
    category: 'Basic',
    label: preview('—', 'Divider'),
    media: '—',
    content: `<hr style="margin:1rem 0;">`,
  },
  {
    id: 'basic-spacer',
    category: 'Basic',
    label: preview('⇅', 'Spacer'),
    media: '⇅',
    content: `<div style="height:32px;"></div>`,
  },
  {
    id: 'basic-list',
    category: 'Basic',
    label: preview('☰', 'List'),
    media: '☰',
    content: `<ul style="margin:0 0 1rem 0;padding-left:1.25rem;">
  <li>First item</li>
  <li>Second item</li>
  <li>Third item</li>
</ul>`,
  },
  {
    id: 'basic-quote',
    category: 'Basic',
    label: preview('❝', 'Quote'),
    media: '❝',
    content: `<blockquote class="blockquote" style="border-left:4px solid #2563eb;padding:.5rem 1rem;margin:0;">
  <p style="margin:0;">A well-crafted quote adds credibility and visual interest to your content.</p>
  <footer class="blockquote-footer" style="margin-top:.5rem;">Someone famous</footer>
</blockquote>`,
  },
  {
    id: 'basic-badge',
    category: 'Basic',
    label: preview('🏷', 'Badge'),
    media: '🏷',
    content: `<span class="badge bg-primary">New</span>`,
  },
  {
    id: 'basic-video',
    category: 'Basic',
    label: preview('▶', 'Video'),
    media: '▶',
    content: {
      type: 'video',
      src: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      provider: 'yt',
      style: { width: '100%', height: '320px' },
    },
  },
  {
    id: 'basic-map',
    category: 'Basic',
    label: preview('📍', 'Map'),
    media: '📍',
    content: {
      type: 'map',
      style: { width: '100%', height: '300px' },
    },
  },

  // ── Layout primitives ───────────────────────────────────────────────────
  {
    id: 'layout-columns-2',
    category: 'Layout',
    label: preview('▥', '2 Columns'),
    media: '▥',
    content: `<div class="row">
  <div class="col-md-6"><div class="p-3 bg-light border">Column 1</div></div>
  <div class="col-md-6"><div class="p-3 bg-light border">Column 2</div></div>
</div>`,
  },
  {
    id: 'layout-columns-3',
    category: 'Layout',
    label: preview('▦', '3 Columns'),
    media: '▦',
    content: `<div class="row">
  <div class="col-md-4"><div class="p-3 bg-light border">Column 1</div></div>
  <div class="col-md-4"><div class="p-3 bg-light border">Column 2</div></div>
  <div class="col-md-4"><div class="p-3 bg-light border">Column 3</div></div>
</div>`,
  },
  {
    id: 'layout-columns-4',
    category: 'Layout',
    label: preview('⊞', '4 Columns'),
    media: '⊞',
    content: `<div class="row">
  <div class="col-md-3"><div class="p-3 bg-light border">Col 1</div></div>
  <div class="col-md-3"><div class="p-3 bg-light border">Col 2</div></div>
  <div class="col-md-3"><div class="p-3 bg-light border">Col 3</div></div>
  <div class="col-md-3"><div class="p-3 bg-light border">Col 4</div></div>
</div>`,
  },
  {
    id: 'layout-container',
    category: 'Layout',
    label: preview('▢', 'Container'),
    media: '▢',
    content: `<div class="container-fluid py-3"></div>`,
  },
]

/**
 * Ordered list of block categories the way we want them displayed in the
 * Blocks panel. GrapesJS renders categories alphabetically by default — we
 * pass this list to the block manager to override that.
 */
export const ADMINLTE_CATEGORIES = [
  'Basic',
  'Stats & KPIs',
  'Charts',
  'Tables',
  'Forms',
  'Alerts',
  'Navigation',
  'Widgets',
  'Industrial',
  'Layout',
]
