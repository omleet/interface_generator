import JSZip from 'jszip'
import type { GeneratedCode } from './code-generator'
import { injectRuntimeGuard } from './code-generator'

export interface ExportOptions {
  userPrompt: string
  generationTimeMs?: number
}

function generateReadme(code: GeneratedCode, options: ExportOptions): string {
  const { userPrompt, generationTimeMs } = options
  const timestamp = new Date().toISOString()
  const timeInfo = generationTimeMs ? ` in ${(generationTimeMs / 1000).toFixed(1)}s` : ''

  return `# Generated Dashboard

> Generated${timeInfo} on ${timestamp}

## User Request

\`\`\`
${userPrompt}
\`\`\`

## Files

- \`index.html\` - Main dashboard file
${code.css.trim() ? '- `css/custom.css` - Custom styles\n' : ''}${code.js.trim() ? '- `js/app.js` - Custom JavaScript\n' : ''}

## Quick Start

1. Open \`index.html\` in a web browser
2. For development, use a local server:
   \`\`\`bash
   python -m http.server 8080
   # or
   npx serve .
   \`\`\`

## Dependencies (CDN)

- AdminLTE 3.2
- Bootstrap 4.6
- Font Awesome 6
- Chart.js (if charts are included)

---

## API Integration Guide

This section explains how to connect the dashboard to real data sources such as REST APIs for industrial equipment, IoT devices, or any backend service.

### Configuration File

Create a \`config.js\` file in the root folder:

\`\`\`javascript
// config.js - API Configuration
const API_CONFIG = {
  // Base URL for your backend API
  baseUrl: 'http://localhost:3000/api',
  
  // Authentication (if required)
  auth: {
    type: 'bearer', // 'bearer', 'basic', or 'apikey'
    token: 'YOUR_API_TOKEN_HERE',
    // For API key auth:
    // headerName: 'X-API-Key',
    // apiKey: 'YOUR_API_KEY_HERE'
  },
  
  // Endpoints configuration
  endpoints: {
    // Equipment/Device endpoints
    devices: '/devices',
    deviceStatus: '/devices/{id}/status',
    deviceMetrics: '/devices/{id}/metrics',
    
    // Sensor data
    sensors: '/sensors',
    sensorReadings: '/sensors/{id}/readings',
    
    // Analytics/Statistics
    statistics: '/statistics',
    reports: '/reports',
    
    // Users/Authentication
    users: '/users',
    login: '/auth/login',
    
    // Add your custom endpoints here
    // customEndpoint: '/your-endpoint',
  },
  
  // Polling intervals (milliseconds)
  refreshIntervals: {
    realtime: 5000,      // 5 seconds for real-time data
    dashboard: 30000,    // 30 seconds for dashboard widgets
    reports: 300000,     // 5 minutes for reports
  }
};
\`\`\`

### API Service Module

Create \`js/api-service.js\`:

\`\`\`javascript
// api-service.js - Centralized API calls
class ApiService {
  constructor(config) {
    this.config = config;
  }

  // Get authentication headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.config.auth.type === 'bearer') {
      headers['Authorization'] = \`Bearer \${this.config.auth.token}\`;
    } else if (this.config.auth.type === 'apikey') {
      headers[this.config.auth.headerName] = this.config.auth.apiKey;
    }
    
    return headers;
  }

  // Build full URL
  buildUrl(endpoint, params = {}) {
    let url = this.config.baseUrl + endpoint;
    
    // Replace path parameters like {id}
    Object.keys(params).forEach(key => {
      url = url.replace(\`{$\{key}}\`, params[key]);
    });
    
    return url;
  }

  // Generic fetch wrapper
  async request(endpoint, options = {}) {
    const url = this.buildUrl(endpoint, options.params);
    
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: this.getHeaders(),
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      
      if (!response.ok) {
        throw new Error(\`API Error: \${response.status} \${response.statusText}\`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Convenience methods
  get(endpoint, params) {
    return this.request(endpoint, { params });
  }

  post(endpoint, body, params) {
    return this.request(endpoint, { method: 'POST', body, params });
  }

  put(endpoint, body, params) {
    return this.request(endpoint, { method: 'PUT', body, params });
  }

  delete(endpoint, params) {
    return this.request(endpoint, { method: 'DELETE', params });
  }
}

// Initialize global API service
const api = new ApiService(API_CONFIG);
\`\`\`

### Integration Examples

#### 1. Updating Dashboard Cards with Real Data

\`\`\`javascript
// Update a small-box widget with device count
async function updateDeviceCount() {
  try {
    const data = await api.get(API_CONFIG.endpoints.devices);
    const countElement = document.querySelector('#device-count .small-box-footer');
    if (countElement) {
      countElement.textContent = data.total || data.length;
    }
  } catch (error) {
    console.error('Failed to fetch device count:', error);
  }
}
\`\`\`

#### 2. Populating DataTables

\`\`\`javascript
// Initialize DataTable with API data
async function initDevicesTable() {
  const devices = await api.get(API_CONFIG.endpoints.devices);
  
  $('#devices-table').DataTable({
    data: devices,
    columns: [
      { data: 'id', title: 'ID' },
      { data: 'name', title: 'Device Name' },
      { data: 'status', title: 'Status' },
      { data: 'lastSeen', title: 'Last Seen' },
    ],
    // Auto-refresh every 30 seconds
    ajax: {
      url: API_CONFIG.baseUrl + API_CONFIG.endpoints.devices,
      headers: api.getHeaders(),
      dataSrc: '',
    },
  });
}
\`\`\`

#### 3. Real-time Chart Updates

\`\`\`javascript
// Update Chart.js with live sensor data
async function updateSensorChart(chart, sensorId) {
  const readings = await api.get(
    API_CONFIG.endpoints.sensorReadings, 
    { id: sensorId }
  );
  
  chart.data.labels = readings.map(r => r.timestamp);
  chart.data.datasets[0].data = readings.map(r => r.value);
  chart.update('none'); // Update without animation for smooth refresh
}

// Set up polling for real-time updates
setInterval(() => {
  updateSensorChart(myChart, 'sensor-001');
}, API_CONFIG.refreshIntervals.realtime);
\`\`\`

#### 4. WebSocket for Real-time Data (Industrial IoT)

\`\`\`javascript
// WebSocket connection for real-time equipment monitoring
const ws = new WebSocket('wss://your-server.com/ws/equipment');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'temperature':
      updateTemperatureGauge(data.deviceId, data.value);
      break;
    case 'alert':
      showNotification(data.message, 'warning');
      break;
    case 'status':
      updateDeviceStatus(data.deviceId, data.status);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Fallback to polling
  startPollingMode();
};
\`\`\`

### Environment-Specific Configuration

For different environments (development, staging, production):

\`\`\`javascript
// config.js with environment detection
const ENV = window.location.hostname === 'localhost' ? 'development' : 'production';

const API_CONFIGS = {
  development: {
    baseUrl: 'http://localhost:3000/api',
    auth: { type: 'bearer', token: 'dev-token' }
  },
  production: {
    baseUrl: 'https://api.yourcompany.com/v1',
    auth: { type: 'bearer', token: 'REPLACE_WITH_PROD_TOKEN' }
  }
};

const API_CONFIG = {
  ...API_CONFIGS[ENV],
  endpoints: { /* ... */ }
};
\`\`\`

### Security Recommendations

1. **Never commit API tokens** - Use environment variables or a separate config file not tracked in git
2. **Use HTTPS** in production for all API calls
3. **Implement token refresh** for long-running dashboard sessions
4. **Add request rate limiting** to prevent overwhelming your APIs
5. **Validate and sanitize** all data before displaying in the DOM

---

## AdminLTE Documentation

For more customization options, refer to:
- AdminLTE Docs: https://adminlte.io/docs/3.2/
- Bootstrap 4 Docs: https://getbootstrap.com/docs/4.6/
- Chart.js Docs: https://www.chartjs.org/docs/latest/
`
}

export async function exportAsZip(
  code: GeneratedCode, 
  options: ExportOptions,
  filename = 'dashboard'
): Promise<void> {
  const zip = new JSZip()

  // Main HTML file — wrap in the same Chart.js / IFrame guard the preview
  // uses so the exported standalone copy behaves identically.
  zip.file('index.html', injectRuntimeGuard(code.fullHtml))

  // Custom CSS if any
  if (code.css.trim()) {
    zip.file('css/custom.css', code.css)
  }

  // Custom JS if any
  if (code.js.trim()) {
    zip.file('js/app.js', code.js)
  }

  // Generate personalized README
  const readme = generateReadme(code, options)
  zip.file('README.md', readme)

  // Add config template
  const configTemplate = `// config.js - API Configuration Template
// Rename to config.js and fill in your values

const API_CONFIG = {
  baseUrl: 'http://localhost:3000/api',
  
  auth: {
    type: 'bearer',
    token: 'YOUR_API_TOKEN_HERE',
  },
  
  endpoints: {
    // Add your endpoints here
  },
  
  refreshIntervals: {
    realtime: 5000,
    dashboard: 30000,
  }
};
`
  zip.file('config.template.js', configTemplate)

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' })
  downloadBlob(blob, `${filename}.zip`)
}

export function downloadHtml(html: string, filename = 'dashboard.html'): void {
  const blob = new Blob([html], { type: 'text/html' })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}
