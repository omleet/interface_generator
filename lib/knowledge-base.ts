export interface KnowledgeItem {
  id: string
  name: string
  category: 'component' | 'widget' | 'chart' | 'layout' | 'utility' | 'primitive' | 'pattern'
  description: string
  html: string
  css?: string
  js?: string
  tags: string[]
  dependencies?: string[]
  composableWith?: string[] // IDs of components that combine well with this one
}

export interface IndexedItem extends KnowledgeItem {
  searchText: string
}

// AdminLTE Knowledge Base - Core components and templates
// Organized by granularity: primitives -> components -> widgets -> patterns -> layouts
export const ADMINLTE_KNOWLEDGE: KnowledgeItem[] = [
  // ==========================================
  // PRIMITIVES - Atomic building blocks
  // ==========================================
  {
    id: 'prim-button',
    name: 'Button Primitive',
    category: 'primitive',
    description: 'Base button element with variants: default, primary, success, warning, danger, info. Sizes: lg, sm, xs. Can be outline or block.',
    tags: ['button', 'action', 'click', 'submit', 'primitive', 'base'],
    composableWith: ['prim-icon', 'card-basic', 'modal-basic'],
    html: `<!-- Button Variants -->
<button type="button" class="btn btn-default">Default</button>
<button type="button" class="btn btn-primary">Primary</button>
<button type="button" class="btn btn-success">Success</button>
<button type="button" class="btn btn-warning">Warning</button>
<button type="button" class="btn btn-danger">Danger</button>
<button type="button" class="btn btn-info">Info</button>

<!-- Outline Variants -->
<button type="button" class="btn btn-outline-primary">Outline Primary</button>
<button type="button" class="btn btn-outline-success">Outline Success</button>

<!-- Sizes -->
<button type="button" class="btn btn-primary btn-lg">Large</button>
<button type="button" class="btn btn-primary btn-sm">Small</button>
<button type="button" class="btn btn-primary btn-xs">Extra Small</button>

<!-- Block Button -->
<button type="button" class="btn btn-primary btn-block">Block Button</button>

<!-- With Icon -->
<button type="button" class="btn btn-primary"><i class="fas fa-save mr-1"></i> Save</button>

<!-- Button Group -->
<div class="btn-group">
  <button type="button" class="btn btn-primary">Left</button>
  <button type="button" class="btn btn-primary">Middle</button>
  <button type="button" class="btn btn-primary">Right</button>
</div>`,
  },
  {
    id: 'prim-icon',
    name: 'Icon Primitive',
    category: 'primitive',
    description: 'Font Awesome 6 icons. Categories: solid (fas), regular (far), brands (fab). Common icons for dashboards and IoT.',
    tags: ['icon', 'fa', 'fontawesome', 'symbol', 'primitive', 'base'],
    composableWith: ['prim-button', 'info-box', 'small-box', 'card-basic'],
    html: `<!-- Common Dashboard Icons -->
<i class="fas fa-tachometer-alt"></i> <!-- Dashboard -->
<i class="fas fa-chart-line"></i> <!-- Line Chart -->
<i class="fas fa-chart-bar"></i> <!-- Bar Chart -->
<i class="fas fa-chart-pie"></i> <!-- Pie Chart -->
<i class="fas fa-table"></i> <!-- Table -->
<i class="fas fa-cog"></i> <!-- Settings -->
<i class="fas fa-user"></i> <!-- User -->
<i class="fas fa-users"></i> <!-- Users -->
<i class="fas fa-bell"></i> <!-- Notifications -->
<i class="fas fa-envelope"></i> <!-- Messages -->

<!-- IoT/Sensor Icons -->
<i class="fas fa-thermometer-half"></i> <!-- Temperature -->
<i class="fas fa-tint"></i> <!-- Humidity -->
<i class="fas fa-wind"></i> <!-- Wind/Air -->
<i class="fas fa-bolt"></i> <!-- Power/Electricity -->
<i class="fas fa-lightbulb"></i> <!-- Light -->
<i class="fas fa-microchip"></i> <!-- Sensor/Chip -->
<i class="fas fa-wifi"></i> <!-- Connectivity -->
<i class="fas fa-satellite-dish"></i> <!-- Signal -->
<i class="fas fa-plug"></i> <!-- Power Plug -->
<i class="fas fa-battery-three-quarters"></i> <!-- Battery -->

<!-- Status Icons -->
<i class="fas fa-check-circle text-success"></i> <!-- Success -->
<i class="fas fa-exclamation-triangle text-warning"></i> <!-- Warning -->
<i class="fas fa-times-circle text-danger"></i> <!-- Error -->
<i class="fas fa-info-circle text-info"></i> <!-- Info -->
<i class="fas fa-spinner fa-spin"></i> <!-- Loading -->

<!-- Sizes -->
<i class="fas fa-home fa-xs"></i> <!-- Extra Small -->
<i class="fas fa-home fa-sm"></i> <!-- Small -->
<i class="fas fa-home"></i> <!-- Normal -->
<i class="fas fa-home fa-lg"></i> <!-- Large -->
<i class="fas fa-home fa-2x"></i> <!-- 2x -->
<i class="fas fa-home fa-3x"></i> <!-- 3x -->`,
  },
  {
    id: 'prim-badge',
    name: 'Badge Primitive',
    category: 'primitive',
    description: 'Inline badge/label for status, counts, or tags. Variants: primary, secondary, success, danger, warning, info.',
    tags: ['badge', 'label', 'tag', 'status', 'count', 'primitive', 'base'],
    composableWith: ['prim-button', 'data-table', 'card-basic', 'nav-tabs'],
    html: `<!-- Badge Variants -->
<span class="badge badge-primary">Primary</span>
<span class="badge badge-secondary">Secondary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-danger">Danger</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-info">Info</span>

<!-- Pill Badges (rounded) -->
<span class="badge badge-pill badge-primary">Pill</span>
<span class="badge badge-pill badge-success">Online</span>
<span class="badge badge-pill badge-danger">Offline</span>

<!-- Badge with Background -->
<span class="badge bg-primary">BG Primary</span>
<span class="badge bg-success">BG Success</span>

<!-- Badge in Button -->
<button type="button" class="btn btn-primary">
  Notifications <span class="badge badge-light">4</span>
</button>

<!-- Badge in Link -->
<a href="#" class="nav-link">
  Messages <span class="badge badge-info float-right">12</span>
</a>

<!-- Status Badges -->
<span class="badge badge-success">Active</span>
<span class="badge badge-danger">Inactive</span>
<span class="badge badge-warning">Pending</span>
<span class="badge badge-secondary">Draft</span>`,
  },
  {
    id: 'prim-input',
    name: 'Input Primitive',
    category: 'primitive',
    description: 'Form input elements: text, number, email, password, select, textarea, checkbox, radio, switch. With validation states.',
    tags: ['input', 'form', 'field', 'text', 'select', 'primitive', 'base'],
    composableWith: ['card-basic', 'modal-basic', 'prim-button'],
    html: `<!-- Text Input -->
<div class="form-group">
  <label for="inputText">Text Input</label>
  <input type="text" class="form-control" id="inputText" placeholder="Enter text">
</div>

<!-- Input with Icon -->
<div class="input-group">
  <div class="input-group-prepend">
    <span class="input-group-text"><i class="fas fa-user"></i></span>
  </div>
  <input type="text" class="form-control" placeholder="Username">
</div>

<!-- Input with Validation -->
<div class="form-group">
  <input type="text" class="form-control is-valid" placeholder="Valid input">
  <span class="text-success">Looks good!</span>
</div>
<div class="form-group">
  <input type="text" class="form-control is-invalid" placeholder="Invalid input">
  <span class="text-danger">Please enter a valid value.</span>
</div>

<!-- Select -->
<div class="form-group">
  <label>Select</label>
  <select class="form-control">
    <option>Option 1</option>
    <option>Option 2</option>
    <option>Option 3</option>
  </select>
</div>

<!-- Textarea -->
<div class="form-group">
  <label>Textarea</label>
  <textarea class="form-control" rows="3" placeholder="Enter description"></textarea>
</div>

<!-- Checkbox -->
<div class="form-group">
  <div class="form-check">
    <input class="form-check-input" type="checkbox" id="check1">
    <label class="form-check-label" for="check1">Checkbox</label>
  </div>
</div>

<!-- Radio -->
<div class="form-group">
  <div class="form-check">
    <input class="form-check-input" type="radio" name="radio1" id="radio1">
    <label class="form-check-label" for="radio1">Option 1</label>
  </div>
  <div class="form-check">
    <input class="form-check-input" type="radio" name="radio1" id="radio2">
    <label class="form-check-label" for="radio2">Option 2</label>
  </div>
</div>

<!-- Switch/Toggle -->
<div class="custom-control custom-switch">
  <input type="checkbox" class="custom-control-input" id="switch1">
  <label class="custom-control-label" for="switch1">Toggle Switch</label>
</div>

<!-- Number Input -->
<div class="form-group">
  <label>Number</label>
  <input type="number" class="form-control" min="0" max="100" step="1" value="50">
</div>

<!-- Range Slider -->
<div class="form-group">
  <label>Range</label>
  <input type="range" class="form-control-range" min="0" max="100">
</div>`,
  },
  {
    id: 'prim-grid',
    name: 'Grid Primitive',
    category: 'primitive',
    description: 'Bootstrap grid system for responsive layouts. Columns: col-{size}-{number}. Sizes: xs, sm, md, lg, xl. Numbers: 1-12.',
    tags: ['grid', 'row', 'column', 'layout', 'responsive', 'primitive', 'base'],
    composableWith: ['info-box', 'small-box', 'card-basic', 'device-grid'],
    html: `<!-- Basic 2-Column Layout -->
<div class="row">
  <div class="col-md-6">Column 1</div>
  <div class="col-md-6">Column 2</div>
</div>

<!-- 3-Column Layout -->
<div class="row">
  <div class="col-md-4">Column 1</div>
  <div class="col-md-4">Column 2</div>
  <div class="col-md-4">Column 3</div>
</div>

<!-- 4-Column Layout (responsive) -->
<div class="row">
  <div class="col-xl-3 col-md-6 col-12">Item 1</div>
  <div class="col-xl-3 col-md-6 col-12">Item 2</div>
  <div class="col-xl-3 col-md-6 col-12">Item 3</div>
  <div class="col-xl-3 col-md-6 col-12">Item 4</div>
</div>

<!-- Sidebar + Content Layout -->
<div class="row">
  <div class="col-md-3">Sidebar</div>
  <div class="col-md-9">Main Content</div>
</div>

<!-- Nested Grid -->
<div class="row">
  <div class="col-md-8">
    <div class="row">
      <div class="col-md-6">Nested 1</div>
      <div class="col-md-6">Nested 2</div>
    </div>
  </div>
  <div class="col-md-4">Side Panel</div>
</div>

<!-- Gutters -->
<div class="row no-gutters"><!-- No spacing between columns --></div>
<div class="row"><!-- Default spacing --></div>

<!-- Offset -->
<div class="row">
  <div class="col-md-4 offset-md-4">Centered column</div>
</div>

<!-- Order -->
<div class="row">
  <div class="col order-2">Second in DOM, first visually</div>
  <div class="col order-1">First in DOM, second visually</div>
</div>`,
  },
  {
    id: 'prim-spacing',
    name: 'Spacing Utilities',
    category: 'primitive',
    description: 'Margin and padding utilities. Format: {property}{sides}-{size}. Properties: m (margin), p (padding). Sides: t, b, l, r, x, y. Sizes: 0-5, auto.',
    tags: ['spacing', 'margin', 'padding', 'utility', 'primitive', 'base'],
    html: `<!-- Margin -->
<div class="mt-3">Margin top 3</div>
<div class="mb-3">Margin bottom 3</div>
<div class="ml-3">Margin left 3</div>
<div class="mr-3">Margin right 3</div>
<div class="mx-3">Margin horizontal 3</div>
<div class="my-3">Margin vertical 3</div>
<div class="m-3">Margin all sides 3</div>

<!-- Padding -->
<div class="pt-3">Padding top 3</div>
<div class="pb-3">Padding bottom 3</div>
<div class="pl-3">Padding left 3</div>
<div class="pr-3">Padding right 3</div>
<div class="px-3">Padding horizontal 3</div>
<div class="py-3">Padding vertical 3</div>
<div class="p-3">Padding all sides 3</div>

<!-- Sizes (0-5 scale) -->
<!-- 0 = 0, 1 = 0.25rem, 2 = 0.5rem, 3 = 1rem, 4 = 1.5rem, 5 = 3rem -->

<!-- Auto margin for centering -->
<div class="mx-auto" style="width: 200px;">Centered block</div>

<!-- Negative margins (n prefix) -->
<div class="mt-n3">Negative margin top</div>`,
  },
  {
    id: 'prim-color',
    name: 'Color Utilities',
    category: 'primitive',
    description: 'Background and text color utilities. Semantic colors: primary, secondary, success, danger, warning, info, light, dark. Gradients available.',
    tags: ['color', 'background', 'text', 'theme', 'utility', 'primitive', 'base'],
    html: `<!-- Background Colors -->
<div class="bg-primary text-white p-2">Primary Background</div>
<div class="bg-secondary text-white p-2">Secondary Background</div>
<div class="bg-success text-white p-2">Success Background</div>
<div class="bg-danger text-white p-2">Danger Background</div>
<div class="bg-warning text-dark p-2">Warning Background</div>
<div class="bg-info text-white p-2">Info Background</div>
<div class="bg-light text-dark p-2">Light Background</div>
<div class="bg-dark text-white p-2">Dark Background</div>
<div class="bg-white text-dark p-2">White Background</div>

<!-- Gradient Backgrounds -->
<div class="bg-gradient-primary text-white p-2">Gradient Primary</div>
<div class="bg-gradient-success text-white p-2">Gradient Success</div>
<div class="bg-gradient-info text-white p-2">Gradient Info</div>
<div class="bg-gradient-warning text-dark p-2">Gradient Warning</div>
<div class="bg-gradient-danger text-white p-2">Gradient Danger</div>

<!-- Text Colors -->
<p class="text-primary">Primary text</p>
<p class="text-secondary">Secondary text</p>
<p class="text-success">Success text</p>
<p class="text-danger">Danger text</p>
<p class="text-warning">Warning text</p>
<p class="text-info">Info text</p>
<p class="text-muted">Muted text</p>
<p class="text-dark">Dark text</p>
<p class="text-light bg-dark">Light text</p>

<!-- IoT Status Colors -->
<span class="text-success"><i class="fas fa-circle"></i> Online</span>
<span class="text-danger"><i class="fas fa-circle"></i> Offline</span>
<span class="text-warning"><i class="fas fa-circle"></i> Warning</span>`,
  },
  {
    id: 'prim-text',
    name: 'Typography Utilities',
    category: 'primitive',
    description: 'Text formatting utilities: alignment, weight, size, transform, wrapping.',
    tags: ['text', 'typography', 'font', 'heading', 'utility', 'primitive', 'base'],
    html: `<!-- Headings -->
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
<h4>Heading 4</h4>
<h5>Heading 5</h5>
<h6>Heading 6</h6>

<!-- Text Alignment -->
<p class="text-left">Left aligned</p>
<p class="text-center">Center aligned</p>
<p class="text-right">Right aligned</p>
<p class="text-justify">Justified text</p>

<!-- Font Weight -->
<p class="font-weight-bold">Bold text</p>
<p class="font-weight-normal">Normal text</p>
<p class="font-weight-light">Light text</p>

<!-- Font Style -->
<p class="font-italic">Italic text</p>

<!-- Text Transform -->
<p class="text-lowercase">lowercased text</p>
<p class="text-uppercase">UPPERCASED TEXT</p>
<p class="text-capitalize">Capitalized Text</p>

<!-- Text Decoration -->
<p class="text-decoration-none">No decoration</p>
<del>Deleted text</del>
<s>Strikethrough</s>
<u>Underlined text</u>

<!-- Display Headings (larger) -->
<h1 class="display-1">Display 1</h1>
<h1 class="display-4">Display 4</h1>

<!-- Lead Paragraph -->
<p class="lead">This is a lead paragraph with larger text.</p>

<!-- Small Text -->
<small>Small text</small>
<p class="small">Also small text</p>

<!-- Text Truncate -->
<p class="text-truncate" style="max-width: 150px;">This text will be truncated with ellipsis</p>`,
  },
  {
    id: 'prim-flex',
    name: 'Flexbox Utilities',
    category: 'primitive',
    description: 'Flexbox utilities for alignment, direction, wrapping, and ordering.',
    tags: ['flex', 'flexbox', 'align', 'justify', 'layout', 'utility', 'primitive', 'base'],
    html: `<!-- Flex Container -->
<div class="d-flex">Flex container</div>
<div class="d-inline-flex">Inline flex container</div>

<!-- Direction -->
<div class="d-flex flex-row">Horizontal (default)</div>
<div class="d-flex flex-row-reverse">Horizontal reversed</div>
<div class="d-flex flex-column">Vertical</div>
<div class="d-flex flex-column-reverse">Vertical reversed</div>

<!-- Justify Content (main axis) -->
<div class="d-flex justify-content-start">Start</div>
<div class="d-flex justify-content-end">End</div>
<div class="d-flex justify-content-center">Center</div>
<div class="d-flex justify-content-between">Space between</div>
<div class="d-flex justify-content-around">Space around</div>

<!-- Align Items (cross axis) -->
<div class="d-flex align-items-start">Align start</div>
<div class="d-flex align-items-end">Align end</div>
<div class="d-flex align-items-center">Align center</div>
<div class="d-flex align-items-stretch">Align stretch</div>

<!-- Flex Wrap -->
<div class="d-flex flex-wrap">Wrap</div>
<div class="d-flex flex-nowrap">No wrap</div>

<!-- Flex Grow/Shrink -->
<div class="d-flex">
  <div class="grow">Grow</div>
  <div class="shrink-0">Don't shrink</div>
</div>

<!-- Common Pattern: Space Between with Center -->
<div class="d-flex justify-content-between align-items-center">
  <span>Left content</span>
  <span>Right content</span>
</div>

<!-- Common Pattern: Centered Box -->
<div class="d-flex justify-content-center align-items-center" style="height: 100px;">
  <span>Centered content</span>
</div>`,
  },

  // ==========================================
  // PATTERNS - Common composition patterns
  // ==========================================
  {
    id: 'pattern-header-stats',
    name: 'Header with Stats Pattern',
    category: 'pattern',
    description: 'Page header with title and row of key statistics. Combines content-header with small-boxes or info-boxes.',
    tags: ['pattern', 'header', 'stats', 'kpi', 'overview', 'composition'],
    composableWith: ['small-box', 'info-box', 'prim-grid'],
    html: `<!-- Header with Stats Pattern -->
<section class="content-header">
  <div class="container-fluid">
    <div class="row mb-2">
      <div class="col-sm-6">
        <h1>Dashboard Overview</h1>
      </div>
      <div class="col-sm-6">
        <ol class="breadcrumb float-sm-right">
          <li class="breadcrumb-item"><a href="#">Home</a></li>
          <li class="breadcrumb-item active">Dashboard</li>
        </ol>
      </div>
    </div>
  </div>
</section>

<section class="content">
  <div class="container-fluid">
    <!-- Stats Row -->
    <div class="row">
      <div class="col-lg-3 col-6">
        <div class="small-box bg-info">
          <div class="inner">
            <h3>150</h3>
            <p>Total Devices</p>
          </div>
          <div class="icon"><i class="fas fa-microchip"></i></div>
          <a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a>
        </div>
      </div>
      <div class="col-lg-3 col-6">
        <div class="small-box bg-success">
          <div class="inner">
            <h3>142</h3>
            <p>Online</p>
          </div>
          <div class="icon"><i class="fas fa-check-circle"></i></div>
          <a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a>
        </div>
      </div>
      <div class="col-lg-3 col-6">
        <div class="small-box bg-warning">
          <div class="inner">
            <h3>5</h3>
            <p>Warnings</p>
          </div>
          <div class="icon"><i class="fas fa-exclamation-triangle"></i></div>
          <a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a>
        </div>
      </div>
      <div class="col-lg-3 col-6">
        <div class="small-box bg-danger">
          <div class="inner">
            <h3>3</h3>
            <p>Offline</p>
          </div>
          <div class="icon"><i class="fas fa-times-circle"></i></div>
          <a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a>
        </div>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    id: 'pattern-chart-card',
    name: 'Chart with Controls Pattern',
    category: 'pattern',
    description: 'Card containing a chart with header controls for filtering, time range, or refresh.',
    tags: ['pattern', 'chart', 'controls', 'filter', 'card', 'composition'],
    composableWith: ['line-chart', 'bar-chart', 'card-basic', 'prim-button'],
    html: `<!-- Chart Card with Controls -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">
      <i class="fas fa-chart-line mr-1"></i>
      Sensor Readings
    </h3>
    <div class="card-tools">
      <!-- Time Range Selector -->
      <div class="btn-group btn-group-sm mr-2">
        <button type="button" class="btn btn-default active">1H</button>
        <button type="button" class="btn btn-default">24H</button>
        <button type="button" class="btn btn-default">7D</button>
        <button type="button" class="btn btn-default">30D</button>
      </div>
      <!-- Refresh Button -->
      <button type="button" class="btn btn-tool" title="Refresh">
        <i class="fas fa-sync-alt"></i>
      </button>
      <!-- Collapse Button -->
      <button type="button" class="btn btn-tool" data-card-widget="collapse">
        <i class="fas fa-minus"></i>
      </button>
      <!-- Maximize Button -->
      <button type="button" class="btn btn-tool" data-card-widget="maximize">
        <i class="fas fa-expand"></i>
      </button>
    </div>
  </div>
  <div class="card-body">
    <canvas id="chartCanvas" style="min-height: 300px; height: 300px; max-width: 100%;"></canvas>
  </div>
  <div class="card-footer">
    <div class="d-flex justify-content-between">
      <span class="text-muted">Last updated: 2 minutes ago</span>
      <span>
        <i class="fas fa-circle text-success"></i> Live data
      </span>
    </div>
  </div>
</div>`,
    js: `const ctx = document.getElementById('chartCanvas').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['10:00', '10:05', '10:10', '10:15', '10:20', '10:25', '10:30'],
    datasets: [{
      label: 'Temperature',
      data: [22.5, 23.1, 22.8, 23.4, 23.2, 22.9, 23.0],
      borderColor: '#007bff',
      backgroundColor: 'rgba(0, 123, 255, 0.1)',
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: {
      y: { beginAtZero: false }
    }
  }
});`,
  },
  {
    id: 'pattern-table-crud',
    name: 'Table with CRUD Actions Pattern',
    category: 'pattern',
    description: 'Data table with search, add new button, and row actions (view, edit, delete).',
    tags: ['pattern', 'table', 'crud', 'search', 'actions', 'list', 'composition'],
    composableWith: ['data-table', 'modal-basic', 'prim-button', 'prim-badge'],
    html: `<!-- Table with CRUD Pattern -->
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Devices</h3>
    <div class="card-tools">
      <!-- Search Box -->
      <div class="input-group input-group-sm" style="width: 200px;">
        <input type="text" class="form-control" placeholder="Search...">
        <div class="input-group-append">
          <button type="button" class="btn btn-default">
            <i class="fas fa-search"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="card-body p-0">
    <!-- Add New Button -->
    <div class="p-3">
      <button type="button" class="btn btn-primary">
        <i class="fas fa-plus mr-1"></i> Add Device
      </button>
    </div>
    
    <table class="table table-striped">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>Last Reading</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Sensor A</td>
          <td>Temperature</td>
          <td><span class="badge badge-success">Online</span></td>
          <td>24.5°C</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-info" title="View">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn btn-warning" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button type="button" class="btn btn-danger" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
        <tr>
          <td>2</td>
          <td>Sensor B</td>
          <td>Humidity</td>
          <td><span class="badge badge-warning">Warning</span></td>
          <td>85%</td>
          <td>
            <div class="btn-group btn-group-sm">
              <button type="button" class="btn btn-info" title="View">
                <i class="fas fa-eye"></i>
              </button>
              <button type="button" class="btn btn-warning" title="Edit">
                <i class="fas fa-edit"></i>
              </button>
              <button type="button" class="btn btn-danger" title="Delete">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="card-footer clearfix">
    <ul class="pagination pagination-sm m-0 float-right">
      <li class="page-item"><a class="page-link" href="#">&laquo;</a></li>
      <li class="page-item active"><a class="page-link" href="#">1</a></li>
      <li class="page-item"><a class="page-link" href="#">2</a></li>
      <li class="page-item"><a class="page-link" href="#">3</a></li>
      <li class="page-item"><a class="page-link" href="#">&raquo;</a></li>
    </ul>
  </div>
</div>`,
  },
  {
    id: 'pattern-form-card',
    name: 'Form in Card Pattern',
    category: 'pattern',
    description: 'Form inside a card with validation feedback, submit and cancel buttons.',
    tags: ['pattern', 'form', 'card', 'input', 'submit', 'validation', 'composition'],
    composableWith: ['card-basic', 'prim-input', 'prim-button'],
    html: `<!-- Form Card Pattern -->
<div class="card card-primary">
  <div class="card-header">
    <h3 class="card-title">Add New Device</h3>
  </div>
  <form>
    <div class="card-body">
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="deviceName">Device Name *</label>
            <input type="text" class="form-control" id="deviceName" placeholder="Enter device name" required>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label for="deviceType">Device Type *</label>
            <select class="form-control" id="deviceType" required>
              <option value="">Select type...</option>
              <option value="temperature">Temperature Sensor</option>
              <option value="humidity">Humidity Sensor</option>
              <option value="pressure">Pressure Sensor</option>
              <option value="motion">Motion Sensor</option>
            </select>
          </div>
        </div>
      </div>
      
      <div class="row">
        <div class="col-md-6">
          <div class="form-group">
            <label for="location">Location</label>
            <input type="text" class="form-control" id="location" placeholder="e.g., Living Room">
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group">
            <label for="apiEndpoint">API Endpoint</label>
            <div class="input-group">
              <div class="input-group-prepend">
                <span class="input-group-text"><i class="fas fa-link"></i></span>
              </div>
              <input type="url" class="form-control" id="apiEndpoint" placeholder="https://...">
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="description">Description</label>
        <textarea class="form-control" id="description" rows="3" placeholder="Optional description..."></textarea>
      </div>
      
      <div class="form-group">
        <div class="custom-control custom-switch">
          <input type="checkbox" class="custom-control-input" id="autoRefresh" checked>
          <label class="custom-control-label" for="autoRefresh">Enable auto-refresh</label>
        </div>
      </div>
      
      <div class="form-group">
        <label>Refresh Interval</label>
        <div class="btn-group btn-group-toggle" data-toggle="buttons">
          <label class="btn btn-outline-primary">
            <input type="radio" name="interval" value="5"> 5s
          </label>
          <label class="btn btn-outline-primary active">
            <input type="radio" name="interval" value="10" checked> 10s
          </label>
          <label class="btn btn-outline-primary">
            <input type="radio" name="interval" value="30"> 30s
          </label>
          <label class="btn btn-outline-primary">
            <input type="radio" name="interval" value="60"> 1m
          </label>
        </div>
      </div>
    </div>
    
    <div class="card-footer">
      <button type="submit" class="btn btn-primary">
        <i class="fas fa-save mr-1"></i> Save Device
      </button>
      <button type="button" class="btn btn-default ml-2">
        Cancel
      </button>
    </div>
  </form>
</div>`,
  },
  {
    id: 'pattern-dashboard-row',
    name: 'Dashboard Row Pattern',
    category: 'pattern',
    description: 'Responsive row with chart on left and info panel on right. Common dashboard composition.',
    tags: ['pattern', 'dashboard', 'row', 'chart', 'panel', 'split', 'composition'],
    composableWith: ['line-chart', 'card-basic', 'info-box', 'prim-grid'],
    html: `<!-- Dashboard Row: Chart + Info Panel -->
<div class="row">
  <!-- Main Chart (2/3 width) -->
  <div class="col-lg-8">
    <div class="card">
      <div class="card-header border-0">
        <div class="d-flex justify-content-between">
          <h3 class="card-title">System Performance</h3>
          <a href="#">View Report</a>
        </div>
      </div>
      <div class="card-body">
        <canvas id="performanceChart" style="min-height: 250px;"></canvas>
      </div>
    </div>
  </div>
  
  <!-- Info Panel (1/3 width) -->
  <div class="col-lg-4">
    <div class="card">
      <div class="card-header border-0">
        <h3 class="card-title">Quick Stats</h3>
      </div>
      <div class="card-body p-0">
        <ul class="list-group list-group-flush">
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <span><i class="fas fa-thermometer-half text-info mr-2"></i>Avg. Temperature</span>
            <strong>23.5°C</strong>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <span><i class="fas fa-tint text-primary mr-2"></i>Avg. Humidity</span>
            <strong>65%</strong>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <span><i class="fas fa-bolt text-warning mr-2"></i>Power Usage</span>
            <strong>1.2 kW</strong>
          </li>
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <span><i class="fas fa-wifi text-success mr-2"></i>Active Devices</span>
            <strong>24/25</strong>
          </li>
        </ul>
      </div>
      <div class="card-footer text-center">
        <a href="#" class="btn btn-sm btn-primary">View All Devices</a>
      </div>
    </div>
  </div>
</div>`,
    js: `const ctx = document.getElementById('performanceChart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [{
      label: 'CPU Usage',
      data: [65, 72, 68, 75, 70, 62, 58],
      borderColor: '#007bff',
      tension: 0.3,
      fill: false
    }, {
      label: 'Memory Usage',
      data: [55, 58, 62, 60, 65, 58, 52],
      borderColor: '#28a745',
      tension: 0.3,
      fill: false
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } },
    scales: { y: { beginAtZero: true, max: 100 } }
  }
});`,
  },
  {
    id: 'pattern-status-cards',
    name: 'Status Cards Row Pattern',
    category: 'pattern',
    description: 'Row of colored status cards showing system or device states with icons.',
    tags: ['pattern', 'status', 'cards', 'grid', 'overview', 'composition'],
    composableWith: ['info-box', 'prim-grid', 'prim-icon', 'prim-color'],
    html: `<!-- Status Cards Row -->
<div class="row">
  <div class="col-md-3 col-sm-6">
    <div class="info-box">
      <span class="info-box-icon bg-info elevation-1">
        <i class="fas fa-server"></i>
      </span>
      <div class="info-box-content">
        <span class="info-box-text">Server Status</span>
        <span class="info-box-number">
          <span class="badge badge-success">Running</span>
        </span>
        <small>Uptime: 99.9%</small>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 col-sm-6">
    <div class="info-box">
      <span class="info-box-icon bg-success elevation-1">
        <i class="fas fa-database"></i>
      </span>
      <div class="info-box-content">
        <span class="info-box-text">Database</span>
        <span class="info-box-number">
          <span class="badge badge-success">Connected</span>
        </span>
        <small>Latency: 12ms</small>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 col-sm-6">
    <div class="info-box">
      <span class="info-box-icon bg-warning elevation-1">
        <i class="fas fa-memory"></i>
      </span>
      <div class="info-box-content">
        <span class="info-box-text">Memory</span>
        <span class="info-box-number">
          78% <small>used</small>
        </span>
        <div class="progress progress-xs mt-1">
          <div class="progress-bar bg-warning" style="width: 78%"></div>
        </div>
      </div>
    </div>
  </div>
  
  <div class="col-md-3 col-sm-6">
    <div class="info-box">
      <span class="info-box-icon bg-danger elevation-1">
        <i class="fas fa-hdd"></i>
      </span>
      <div class="info-box-content">
        <span class="info-box-text">Storage</span>
        <span class="info-box-number">
          92% <small>used</small>
        </span>
        <div class="progress progress-xs mt-1">
          <div class="progress-bar bg-danger" style="width: 92%"></div>
        </div>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'modal-basic',
    name: 'Modal Dialog',
    category: 'pattern',
    description: 'Modal dialog for confirmations, forms, or detail views. Can be sized: modal-sm, modal-lg, modal-xl.',
    tags: ['modal', 'dialog', 'popup', 'overlay', 'confirmation', 'pattern'],
    composableWith: ['prim-button', 'prim-input', 'pattern-form-card'],
    html: `<!-- Modal Trigger Button -->
<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#exampleModal">
  Open Modal
</button>

<!-- Modal -->
<div class="modal fade" id="exampleModal" tabindex="-1" role="dialog">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Modal Title</h5>
        <button type="button" class="close" data-dismiss="modal">
          <span>&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <p>Modal body content goes here.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary">Save changes</button>
      </div>
    </div>
  </div>
</div>

<!-- Confirmation Modal -->
<div class="modal fade" id="confirmModal" tabindex="-1" role="dialog">
  <div class="modal-dialog modal-sm" role="document">
    <div class="modal-content">
      <div class="modal-header bg-danger">
        <h5 class="modal-title text-white">Confirm Delete</h5>
        <button type="button" class="close text-white" data-dismiss="modal">
          <span>&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
        <button type="button" class="btn btn-danger">Delete</button>
      </div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'nav-tabs',
    name: 'Navigation Tabs',
    category: 'pattern',
    description: 'Tabbed navigation for organizing content sections. Can be used in cards or standalone.',
    tags: ['tabs', 'navigation', 'panel', 'sections', 'pattern'],
    composableWith: ['card-basic', 'prim-badge'],
    html: `<!-- Tabs in Card -->
<div class="card card-primary card-tabs">
  <div class="card-header p-0 pt-1">
    <ul class="nav nav-tabs" role="tablist">
      <li class="nav-item">
        <a class="nav-link active" data-toggle="pill" href="#tab1">
          <i class="fas fa-home mr-1"></i> Overview
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-toggle="pill" href="#tab2">
          <i class="fas fa-chart-line mr-1"></i> Analytics
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-toggle="pill" href="#tab3">
          <i class="fas fa-cog mr-1"></i> Settings
        </a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-toggle="pill" href="#tab4">
          Alerts <span class="badge badge-danger ml-1">3</span>
        </a>
      </li>
    </ul>
  </div>
  <div class="card-body">
    <div class="tab-content">
      <div class="tab-pane fade show active" id="tab1">
        Overview content goes here.
      </div>
      <div class="tab-pane fade" id="tab2">
        Analytics content goes here.
      </div>
      <div class="tab-pane fade" id="tab3">
        Settings content goes here.
      </div>
      <div class="tab-pane fade" id="tab4">
        Alerts content goes here.
      </div>
    </div>
  </div>
</div>

<!-- Standalone Tabs -->
<ul class="nav nav-tabs">
  <li class="nav-item">
    <a class="nav-link active" href="#">Active</a>
  </li>
  <li class="nav-item">
    <a class="nav-link" href="#">Link</a>
  </li>
  <li class="nav-item">
    <a class="nav-link disabled" href="#">Disabled</a>
  </li>
</ul>`,
  },

  // ==========================================
  // LAYOUTS - Full page structures
  // ==========================================
  {
    id: 'basic-layout',
    name: 'Basic Dashboard Layout',
    category: 'layout',
    description: 'Full page AdminLTE layout with sidebar, navbar and content area',
    tags: ['layout', 'dashboard', 'sidebar', 'navbar', 'structure'],
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dashboard</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/css/adminlte.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="hold-transition sidebar-mini">
<div class="wrapper">
  <!-- Navbar -->
  <nav class="main-header navbar navbar-expand navbar-white navbar-light">
    <ul class="navbar-nav">
      <li class="nav-item">
        <a class="nav-link" data-widget="pushmenu" href="#"><i class="fas fa-bars"></i></a>
      </li>
    </ul>
    <ul class="navbar-nav ml-auto">
      <li class="nav-item">
        <a class="nav-link" href="#"><i class="fas fa-user"></i></a>
      </li>
    </ul>
  </nav>

  <!-- Sidebar -->
  <aside class="main-sidebar sidebar-dark-primary elevation-4">
    <a href="#" class="brand-link">
      <span class="brand-text font-weight-light">Dashboard</span>
    </a>
    <div class="sidebar">
      <nav class="mt-2">
        <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview">
          <li class="nav-item">
            <a href="#" class="nav-link active">
              <i class="nav-icon fas fa-tachometer-alt"></i>
              <p>Dashboard</p>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </aside>

  <!-- Content Wrapper -->
  <div class="content-wrapper">
    <section class="content-header">
      <div class="container-fluid">
        <h1>Dashboard</h1>
      </div>
    </section>
    <section class="content">
      <div class="container-fluid">
        <!-- Content goes here -->
      </div>
    </section>
  </div>

  <footer class="main-footer">
    <strong>Dashboard</strong>
  </footer>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/admin-lte@3.2/dist/js/adminlte.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</body>
</html>`,
  },

  // Widgets - Info Boxes
  {
    id: 'info-box',
    name: 'Info Box',
    category: 'widget',
    description: 'Info box widget for displaying statistics with icon and value',
    tags: ['widget', 'statistics', 'icon', 'number', 'metric', 'kpi'],
    html: `<div class="info-box">
  <span class="info-box-icon bg-info"><i class="fas fa-thermometer-half"></i></span>
  <div class="info-box-content">
    <span class="info-box-text">Temperature</span>
    <span class="info-box-number">24.5 °C</span>
  </div>
</div>`,
  },
  {
    id: 'info-box-colored',
    name: 'Colored Info Box',
    category: 'widget',
    description: 'Colored info box with progress bar for showing metrics with trend',
    tags: ['widget', 'statistics', 'colored', 'progress', 'metric'],
    html: `<div class="info-box bg-success">
  <span class="info-box-icon"><i class="fas fa-check"></i></span>
  <div class="info-box-content">
    <span class="info-box-text">Active Sensors</span>
    <span class="info-box-number">15</span>
    <div class="progress">
      <div class="progress-bar" style="width: 75%"></div>
    </div>
    <span class="progress-description">75% Online</span>
  </div>
</div>`,
  },

  // Small Boxes
  {
    id: 'small-box',
    name: 'Small Box',
    category: 'widget',
    description: 'Small box for quick stats with icon and link',
    tags: ['widget', 'small', 'statistics', 'link', 'metric', 'number'],
    html: `<div class="small-box bg-info">
  <div class="inner">
    <h3>150</h3>
    <p>Total Readings</p>
  </div>
  <div class="icon">
    <i class="fas fa-chart-bar"></i>
  </div>
  <a href="#" class="small-box-footer">More info <i class="fas fa-arrow-circle-right"></i></a>
</div>`,
  },
  {
    id: 'small-box-warning',
    name: 'Warning Small Box',
    category: 'widget',
    description: 'Warning colored small box for alerts or attention items',
    tags: ['widget', 'warning', 'alert', 'attention', 'metric'],
    html: `<div class="small-box bg-warning">
  <div class="inner">
    <h3>5</h3>
    <p>Alerts</p>
  </div>
  <div class="icon">
    <i class="fas fa-exclamation-triangle"></i>
  </div>
  <a href="#" class="small-box-footer">View Alerts <i class="fas fa-arrow-circle-right"></i></a>
</div>`,
  },

  // Cards
  {
    id: 'card-basic',
    name: 'Basic Card',
    category: 'component',
    description: 'Basic card component with header, body and footer',
    tags: ['card', 'container', 'box', 'panel'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Card Title</h3>
    <div class="card-tools">
      <button type="button" class="btn btn-tool" data-card-widget="collapse">
        <i class="fas fa-minus"></i>
      </button>
    </div>
  </div>
  <div class="card-body">
    Card content goes here
  </div>
  <div class="card-footer">
    Card footer
  </div>
</div>`,
  },
  {
    id: 'card-primary',
    name: 'Primary Card',
    category: 'component',
    description: 'Primary colored card with maximizable feature',
    tags: ['card', 'primary', 'colored', 'container'],
    html: `<div class="card card-primary">
  <div class="card-header">
    <h3 class="card-title">Primary Card</h3>
    <div class="card-tools">
      <button type="button" class="btn btn-tool" data-card-widget="maximize">
        <i class="fas fa-expand"></i>
      </button>
      <button type="button" class="btn btn-tool" data-card-widget="collapse">
        <i class="fas fa-minus"></i>
      </button>
    </div>
  </div>
  <div class="card-body">
    Card content
  </div>
</div>`,
  },

  // Charts
  {
    id: 'line-chart',
    name: 'Line Chart',
    category: 'chart',
    description: 'Line chart for time series data using Chart.js',
    tags: ['chart', 'line', 'graph', 'time-series', 'trend', 'visualization'],
    dependencies: ['chart.js'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Line Chart</h3>
  </div>
  <div class="card-body">
    <canvas id="lineChart" style="min-height: 250px; height: 250px; max-height: 250px; max-width: 100%;"></canvas>
  </div>
</div>`,
    js: `const ctx = document.getElementById('lineChart').getContext('2d');
new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'Values',
      data: [12, 19, 3, 5, 2, 3],
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
      fill: false
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});`,
  },
  {
    id: 'bar-chart',
    name: 'Bar Chart',
    category: 'chart',
    description: 'Bar chart for comparing values across categories',
    tags: ['chart', 'bar', 'graph', 'comparison', 'visualization'],
    dependencies: ['chart.js'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Bar Chart</h3>
  </div>
  <div class="card-body">
    <canvas id="barChart" style="min-height: 250px; height: 250px; max-height: 250px; max-width: 100%;"></canvas>
  </div>
</div>`,
    js: `const ctx = document.getElementById('barChart').getContext('2d');
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
    datasets: [{
      label: 'Values',
      data: [12, 19, 3, 5, 2, 3],
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)',
        'rgba(255, 159, 64, 0.5)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 1
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});`,
  },
  {
    id: 'doughnut-chart',
    name: 'Doughnut Chart',
    category: 'chart',
    description: 'Doughnut/Pie chart for showing proportions',
    tags: ['chart', 'doughnut', 'pie', 'proportion', 'percentage', 'visualization'],
    dependencies: ['chart.js'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Doughnut Chart</h3>
  </div>
  <div class="card-body">
    <canvas id="doughnutChart" style="min-height: 250px; height: 250px; max-height: 250px; max-width: 100%;"></canvas>
  </div>
</div>`,
    js: `const ctx = document.getElementById('doughnutChart').getContext('2d');
new Chart(ctx, {
  type: 'doughnut',
  data: {
    labels: ['Active', 'Inactive', 'Pending'],
    datasets: [{
      data: [60, 25, 15],
      backgroundColor: ['#28a745', '#dc3545', '#ffc107']
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});`,
  },
  {
    id: 'realtime-chart',
    name: 'Real-time Line Chart',
    category: 'chart',
    description: 'Real-time updating line chart for live data streams',
    tags: ['chart', 'realtime', 'live', 'streaming', 'sensor', 'monitoring'],
    dependencies: ['chart.js'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Real-time Data</h3>
    <div class="card-tools">
      <span class="badge badge-success" id="status">Live</span>
    </div>
  </div>
  <div class="card-body">
    <canvas id="realtimeChart" style="min-height: 300px; height: 300px; max-height: 300px; max-width: 100%;"></canvas>
  </div>
</div>`,
    js: `const ctx = document.getElementById('realtimeChart').getContext('2d');
const maxDataPoints = 20;
const data = {
  labels: [],
  datasets: [{
    label: 'Sensor Value',
    data: [],
    borderColor: 'rgb(75, 192, 192)',
    tension: 0.4,
    fill: true,
    backgroundColor: 'rgba(75, 192, 192, 0.1)'
  }]
};

const realtimeChart = new Chart(ctx, {
  type: 'line',
  data: data,
  options: {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { display: true },
      y: { beginAtZero: true }
    },
    animation: { duration: 0 }
  }
});

// Simulate real-time updates
setInterval(() => {
  const now = new Date().toLocaleTimeString();
  const value = Math.random() * 100;
  
  data.labels.push(now);
  data.datasets[0].data.push(value);
  
  if (data.labels.length > maxDataPoints) {
    data.labels.shift();
    data.datasets[0].data.shift();
  }
  
  realtimeChart.update('none');
}, 1000);`,
  },

  // Tables
  {
    id: 'data-table',
    name: 'Data Table',
    category: 'component',
    description: 'Responsive data table with sorting and search',
    tags: ['table', 'data', 'list', 'grid', 'records'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Data Table</h3>
  </div>
  <div class="card-body">
    <table class="table table-bordered table-striped">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Status</th>
          <th>Value</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Sensor A</td>
          <td><span class="badge badge-success">Active</span></td>
          <td>24.5</td>
          <td>
            <button class="btn btn-sm btn-info"><i class="fas fa-eye"></i></button>
            <button class="btn btn-sm btn-warning"><i class="fas fa-edit"></i></button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`,
  },

  // Progress
  {
    id: 'progress-bars',
    name: 'Progress Bars',
    category: 'widget',
    description: 'Multiple progress bars for showing completion status',
    tags: ['progress', 'bar', 'percentage', 'status', 'completion'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Progress</h3>
  </div>
  <div class="card-body">
    <div class="progress-group">
      <span class="progress-text">Task 1</span>
      <span class="float-right"><b>75</b>/100</span>
      <div class="progress">
        <div class="progress-bar bg-primary" style="width: 75%"></div>
      </div>
    </div>
    <div class="progress-group">
      <span class="progress-text">Task 2</span>
      <span class="float-right"><b>50</b>/100</span>
      <div class="progress">
        <div class="progress-bar bg-success" style="width: 50%"></div>
      </div>
    </div>
    <div class="progress-group">
      <span class="progress-text">Task 3</span>
      <span class="float-right"><b>25</b>/100</span>
      <div class="progress">
        <div class="progress-bar bg-warning" style="width: 25%"></div>
      </div>
    </div>
  </div>
</div>`,
  },

  // Alerts
  {
    id: 'alerts',
    name: 'Alert Messages',
    category: 'component',
    description: 'Alert boxes for notifications and messages',
    tags: ['alert', 'notification', 'message', 'warning', 'error', 'success'],
    html: `<div class="alert alert-success alert-dismissible">
  <button type="button" class="close" data-dismiss="alert">&times;</button>
  <h5><i class="icon fas fa-check"></i> Success!</h5>
  Operation completed successfully.
</div>
<div class="alert alert-warning alert-dismissible">
  <button type="button" class="close" data-dismiss="alert">&times;</button>
  <h5><i class="icon fas fa-exclamation-triangle"></i> Warning!</h5>
  Check the configuration.
</div>
<div class="alert alert-danger alert-dismissible">
  <button type="button" class="close" data-dismiss="alert">&times;</button>
  <h5><i class="icon fas fa-ban"></i> Error!</h5>
  Something went wrong.
</div>`,
  },

  // Gauges
  {
    id: 'gauge-widget',
    name: 'Gauge Widget',
    category: 'widget',
    description: 'Circular gauge for showing percentage or level',
    tags: ['gauge', 'meter', 'level', 'percentage', 'circular'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Gauge</h3>
  </div>
  <div class="card-body text-center">
    <canvas id="gaugeChart" style="max-width: 200px; margin: 0 auto;"></canvas>
    <h4 class="mt-3">75%</h4>
    <p class="text-muted">Current Level</p>
  </div>
</div>`,
    dependencies: ['chart.js'],
    js: `const ctx = document.getElementById('gaugeChart').getContext('2d');
new Chart(ctx, {
  type: 'doughnut',
  data: {
    datasets: [{
      data: [75, 25],
      backgroundColor: ['#28a745', '#e9ecef'],
      borderWidth: 0
    }]
  },
  options: {
    circumference: 180,
    rotation: 270,
    cutout: '75%',
    plugins: { legend: { display: false } }
  }
});`,
  },

  // API Integration
  {
    id: 'api-fetch',
    name: 'API Data Fetch',
    category: 'utility',
    description: 'Template for fetching data from REST API',
    tags: ['api', 'fetch', 'rest', 'data', 'endpoint'],
    js: `async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network error');
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

// Example usage:
// fetchData('/api/sensors').then(data => updateUI(data));`,
    html: '',
  },
  {
    id: 'api-polling',
    name: 'API Polling',
    category: 'utility',
    description: 'Template for periodic API data polling',
    tags: ['api', 'polling', 'interval', 'refresh', 'realtime'],
    js: `class DataPoller {
  constructor(url, interval = 5000) {
    this.url = url;
    this.interval = interval;
    this.timer = null;
    this.callbacks = [];
  }

  start() {
    this.poll();
    this.timer = setInterval(() => this.poll(), this.interval);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async poll() {
    try {
      const response = await fetch(this.url);
      const data = await response.json();
      this.callbacks.forEach(cb => cb(data));
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  onData(callback) {
    this.callbacks.push(callback);
  }
}

// Example: const poller = new DataPoller('/api/sensors', 3000);
// poller.onData(data => updateChart(data));
// poller.start();`,
    html: '',
  },

  // IoT Specific
  {
    id: 'sensor-card',
    name: 'Sensor Card',
    category: 'widget',
    description: 'Card displaying sensor information with status',
    tags: ['sensor', 'iot', 'device', 'status', 'monitoring'],
    html: `<div class="card card-widget widget-user-2">
  <div class="widget-user-header bg-info">
    <div class="widget-user-image">
      <i class="fas fa-microchip fa-3x text-white"></i>
    </div>
    <h3 class="widget-user-username">Temperature Sensor</h3>
    <h5 class="widget-user-desc">Living Room</h5>
  </div>
  <div class="card-footer p-0">
    <ul class="nav flex-column">
      <li class="nav-item">
        <span class="nav-link">Current Value <span class="float-right badge bg-primary">24.5°C</span></span>
      </li>
      <li class="nav-item">
        <span class="nav-link">Status <span class="float-right badge bg-success">Online</span></span>
      </li>
      <li class="nav-item">
        <span class="nav-link">Last Update <span class="float-right">2 min ago</span></span>
      </li>
    </ul>
  </div>
</div>`,
  },
  {
    id: 'device-grid',
    name: 'Device Grid',
    category: 'widget',
    description: 'Grid layout for multiple IoT devices',
    tags: ['device', 'grid', 'iot', 'multiple', 'overview'],
    html: `<div class="row">
  <div class="col-md-3 col-sm-6 col-12">
    <div class="info-box bg-gradient-info">
      <span class="info-box-icon"><i class="fas fa-thermometer-half"></i></span>
      <div class="info-box-content">
        <span class="info-box-text">Temperature</span>
        <span class="info-box-number">24.5 °C</span>
        <span class="progress-description">Living Room</span>
      </div>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 col-12">
    <div class="info-box bg-gradient-success">
      <span class="info-box-icon"><i class="fas fa-tint"></i></span>
      <div class="info-box-content">
        <span class="info-box-text">Humidity</span>
        <span class="info-box-number">65 %</span>
        <span class="progress-description">Living Room</span>
      </div>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 col-12">
    <div class="info-box bg-gradient-warning">
      <span class="info-box-icon"><i class="fas fa-lightbulb"></i></span>
      <div class="info-box-content">
        <span class="info-box-text">Light</span>
        <span class="info-box-number">450 lux</span>
        <span class="progress-description">Office</span>
      </div>
    </div>
  </div>
  <div class="col-md-3 col-sm-6 col-12">
    <div class="info-box bg-gradient-danger">
      <span class="info-box-icon"><i class="fas fa-bolt"></i></span>
      <div class="info-box-content">
        <span class="info-box-text">Power</span>
        <span class="info-box-number">125 W</span>
        <span class="progress-description">Main Panel</span>
      </div>
    </div>
  </div>
</div>`,
  },

  // Timeline
  {
    id: 'timeline',
    name: 'Timeline',
    category: 'component',
    description: 'Timeline for showing events or history',
    tags: ['timeline', 'events', 'history', 'log', 'activity'],
    html: `<div class="card">
  <div class="card-header">
    <h3 class="card-title">Activity Timeline</h3>
  </div>
  <div class="card-body">
    <div class="timeline">
      <div class="time-label">
        <span class="bg-primary">Today</span>
      </div>
      <div>
        <i class="fas fa-check bg-success"></i>
        <div class="timeline-item">
          <span class="time"><i class="fas fa-clock"></i> 12:05</span>
          <h3 class="timeline-header">Sensor Calibrated</h3>
          <div class="timeline-body">Temperature sensor was calibrated successfully.</div>
        </div>
      </div>
      <div>
        <i class="fas fa-exclamation-triangle bg-warning"></i>
        <div class="timeline-item">
          <span class="time"><i class="fas fa-clock"></i> 10:30</span>
          <h3 class="timeline-header">Alert Triggered</h3>
          <div class="timeline-body">High temperature detected in server room.</div>
        </div>
      </div>
      <div>
        <i class="fas fa-clock bg-secondary"></i>
      </div>
    </div>
  </div>
</div>`,
  },
]

// Portuguese keywords added to the embedded text per category, so prompts
// in Portuguese ("dashboard de sensores", "tabela de equipamentos") can match
// the English-described knowledge items.
const PT_CATEGORY_KEYWORDS: Record<KnowledgeItem['category'], string> = {
  primitive: 'primitivo elemento base',
  pattern: 'padrão padrao composição composicao',
  component: 'componente elemento',
  widget: 'widget caixa painel cartão',
  chart: 'gráfico grafico visualização visualizacao dados',
  layout: 'layout estrutura página pagina',
  utility: 'utilitário utilitario utilidade',
}

// Pulls a small, deduplicated bag of class tokens out of the HTML so AdminLTE
// vocabulary (info-box, small-box, card-primary, content-wrapper, etc.) is
// embedded directly. Without this, the embedding for "info-box" only sees the
// description text and misses the actual class name.
function extractClassTokens(html: string, max = 30): string {
  if (!html) return ''
  const matches = html.match(/class="([^"]+)"/g) ?? []
  const tokens = new Set<string>()
  for (const m of matches) {
    const inner = m.slice(7, -1)
    for (const tok of inner.split(/\s+/)) {
      if (tok && tok.length < 40) tokens.add(tok)
      if (tokens.size >= max) break
    }
    if (tokens.size >= max) break
  }
  return Array.from(tokens).join(' ')
}

export function createSearchText(item: KnowledgeItem): string {
  return [
    item.name,
    item.description,
    item.tags.join(' '),
    item.category,
    PT_CATEGORY_KEYWORDS[item.category] ?? '',
    extractClassTokens(item.html),
    (item.composableWith ?? []).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
}

export function getAllItems(): KnowledgeItem[] {
  return ADMINLTE_KNOWLEDGE
}

export function getItemsByCategory(category: KnowledgeItem['category']): KnowledgeItem[] {
  return ADMINLTE_KNOWLEDGE.filter(item => item.category === category)
}

export function getItemById(id: string): KnowledgeItem | undefined {
  return ADMINLTE_KNOWLEDGE.find(item => item.id === id)
}
