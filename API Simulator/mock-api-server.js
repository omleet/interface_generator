#!/usr/bin/env node
/**
 * mock-api-server.js
 * Servidor de dados simulados para dashboards geradas.
 * 
 * - GET /api/*           → dados instantâneos (pedido normal)
 * - GET /api/stream/*    → Server-Sent Events, push a cada 10s
 * - GET /api/routes      → lista todos os endpoints
 *
 * Arranque:  node mock-api-server.js
 *            node mock-api-server.js --port 8888
 */

const http = require('http')

const PORT     = process.argv.includes('--port')
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1], 10)
  : 3001
const INTERVAL = 10_000  // push a cada 10 segundos

// ─── Helpers ─────────────────────────────────────────────────────────────────

const rnd    = (min, max, dec = 1) => parseFloat((min + Math.random() * (max - min)).toFixed(dec))
const rndInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1))
const pick   = arr => arr[Math.floor(Math.random() * arr.length)]
const tsAgo  = m => new Date(Date.now() - m * 60_000).toISOString()

function history(n, min, max, dec = 1) {
  const now = Date.now()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now - (n - i) * (3600_000 / n))
    return {
      ts:    d.toISOString(),
      label: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
      value: rnd(min, max, dec),
    }
  })
}

// ─── Dados por rota ───────────────────────────────────────────────────────────

const ROUTES = [
  {
    pattern: ['sensors', 'zones'],
    data: () => ['Zone-A','Zone-B','Zone-C','Zone-D','Zone-E','Zone-F'].map(zone => ({
      zone,
      temperature: rnd(0, 40),
      humidity:    rnd(30, 90),
      status:      pick(['ok','ok','ok','warning','alert']),
      lastUpdated: new Date().toISOString(),
    }))
  },
  {
    pattern: ['sensors', ':zone', 'temperature'],
    data: p => ({
      zone: p.zone,
      value: rnd(16, 42),
      unit: '°C',
      status: Math.random() > 0.85 ? 'alert' : 'ok',
      threshold: { min: 15, max: 40 },
      history: history(24, 16, 42),
    })
  },
  {
    pattern: ['sensors', ':zone', 'humidity'],
    data: p => ({
      zone: p.zone,
      value: rnd(30, 90),
      unit: '%RH',
      status: 'ok',
      threshold: { min: 20, max: 85 },
      history: history(24, 30, 90),
    })
  },
  {
    pattern: ['sensors', ':zone'],
    data: p => ({
      zone: p.zone,
      temperature: rnd(16, 42),
      humidity:    rnd(30, 90),
      pressure:    rnd(980, 1040),
      co2:         rndInt(400, 1200),
      updatedAt:   new Date().toISOString(),
    })
  },
  {
    pattern: ['sensors', ':id', 'pressure'],
    data: p => ({ id: p.id, value: rnd(0.5, 10), unit: 'bar', trend: history(60, 0.5, 10, 2) })
  },
  {
    pattern: ['sensors', ':id', 'flow'],
    data: p => ({ id: p.id, value: rnd(10, 500), unit: 'm³/h', anomaly: Math.random() < 0.1, trend: history(60, 10, 500, 0) })
  },
  {
    pattern: ['sensors', ':id', 'vibration'],
    data: p => ({
      id: p.id,
      rms: rnd(0.1, 5, 3), unit: 'mm/s',
      machineHealthScore: rndInt(60, 100),
      bearingFault: Math.random() < 0.15,
      fftSpectrum: Array.from({length:20},(_,i) => ({ freq:(i+1)*25, amplitude: rnd(0,3,3) })),
      history: history(48, 0.1, 5, 3),
    })
  },
  {
    pattern: ['iot', 'devices'],
    data: () => Array.from({length:12},(_,i) => ({
      id: `DEV-${String(i+1).padStart(3,'0')}`,
      name: `Sensor Node ${i+1}`,
      status: pick(['online','online','online','offline','degraded']),
      lastSeen: tsAgo(rndInt(0,60)),
      firmware: `v${rndInt(1,3)}.${rndInt(0,9)}.${rndInt(0,9)}`,
      battery: rndInt(10,100), rssi: rndInt(-90,-40),
    }))
  },
  {
    pattern: ['iot', 'devices', ':id'],
    data: p => ({
      id: p.id, status: pick(['online','degraded']),
      firmware: `v2.${rndInt(0,9)}.${rndInt(0,9)}`,
      lastSeen: new Date().toISOString(),
      battery: rndInt(20,100),
      metrics: { temp: rnd(20,80), rssi: rndInt(-90,-40) },
    })
  },
  {
    pattern: ['scada', 'process-values'],
    data: () => ({
      flowRate: rnd(50,300), pressure: rnd(2,8), temperature: rnd(15,95),
      level: rnd(20,100), ph: rnd(6.5,8.5), turbidity: rnd(0.1,5),
      updatedAt: new Date().toISOString(),
    })
  },
  {
    pattern: ['scada', 'valves'],
    data: () => ['V-101','V-102','V-103','V-104','V-201','V-202'].map(id => ({
      id, position: pick(['open','closed','partial']), mode: pick(['auto','manual']), fault: Math.random()<0.05,
    }))
  },
  {
    pattern: ['scada', 'pumps'],
    data: () => ['P-101','P-102','P-103'].map(id => ({
      id, running: Math.random()>0.2, current: rnd(5,30), speed: rnd(1000,3000,0), fault: Math.random()<0.08,
    }))
  },
  {
    pattern: ['scada', 'alarms'],
    data: () => Array.from({length:rndInt(4,12)},(_,i) => ({
      id: `ALM-${1000+i}`, severity: pick(['critical','warning','info']),
      tag: pick(['FIC-101','PIC-201','TIC-301','LIC-401']),
      message: pick(['High temperature setpoint exceeded','Low flow rate detected','Pressure deviation','Pump vibration high','pH out of range','Tank level low']),
      acknowledged: Math.random()>0.5, timestamp: tsAgo(rndInt(0,480)),
    }))
  },
  {
    pattern: ['scada', 'alarms', 'history'],
    data: () => Array.from({length:50},(_,i) => ({
      id: `ALM-${900+i}`, severity: pick(['critical','warning','info']),
      tag: pick(['FIC-101','PIC-201','TIC-301']),
      acknowledged: true, duration: rndInt(1,120), timestamp: tsAgo(rndInt(60,10080)),
    }))
  },
  {
    pattern: ['energy', 'consumption'],
    data: () => ({
      total: rnd(500,2000), unit: 'kWh', powerFactor: rnd(0.85,1.0,3),
      peakDemand: rnd(100,400), cost: rnd(80,350,2), currency: 'EUR', carbonKg: rnd(200,900),
      zones: ['Production','HVAC','Lighting','IT','Auxiliary'].map(z => ({ zone:z, kwh:rnd(50,500), cost:rnd(8,80,2) })),
      trend: history(24, 300, 2000, 0),
    })
  },
  {
    pattern: ['energy', 'solar'],
    data: () => ({
      totalOutputKw: rnd(50,500), gridFeedInKw: rnd(10,200),
      irradiance: rnd(100,1000), efficiency: rnd(14,22), dailyYieldKwh: rnd(200,2000),
      inverters: Array.from({length:4},(_,i) => ({ id:`INV-${i+1}`, status:pick(['running','running','idle','fault']), outputKw:rnd(10,120), temp:rnd(30,60) })),
      trend: history(12, 0, 500),
    })
  },
  {
    pattern: ['energy', 'hvac'],
    data: () => ({
      zones: ['Floor 1','Floor 2','Floor 3','Server Room'].map(name => ({ name, setpoint:rnd(20,26), actual:rnd(18,28), mode:pick(['cooling','heating','ventilation','off']) })),
      ahu: Array.from({length:3},(_,i) => ({ id:`AHU-${i+1}`, status:pick(['running','standby','fault']), supplyAirTemp:rnd(12,18), returnAirTemp:rnd(20,30), fanSpeed:rndInt(20,100) })),
      chiller: { cop:rnd(2,6,2), loadPercent:rndInt(20,100), status:pick(['running','standby']), supplyTemp:rnd(6,10), returnTemp:rnd(10,16) },
      energyKwh: rnd(200,800), faults: rndInt(0,3),
    })
  },
  {
    pattern: ['manufacturing', 'oee'],
    data: () => ({
      oee:rnd(50,92), availability:rnd(70,98), performance:rnd(70,98), quality:rnd(90,99.9),
      productionTarget:rndInt(800,1200), productionActual:rndInt(600,1200), shift:pick(['Morning','Afternoon','Night']),
      downtimeReasons:[{reason:'Planned Maintenance',minutes:rndInt(10,60)},{reason:'Changeover',minutes:rndInt(5,30)},{reason:'Breakdown',minutes:rndInt(0,45)},{reason:'Material Shortage',minutes:rndInt(0,20)}],
      shiftHistory: Array.from({length:7},(_,i) => ({ date:new Date(Date.now()-i*86400_000).toISOString().split('T')[0], oee:rnd(50,95) })).reverse(),
    })
  },
  {
    pattern: ['manufacturing', 'quality'],
    data: () => ({
      defectRate:rnd(0.1,5,2), firstPassYield:rnd(90,99.5,2),
      lines:['Line A','Line B','Line C'].map(line => ({ line, defectRate:rnd(0.1,5,2), inspected:rndInt(200,1000), passed:rndInt(190,990) })),
      defectCategories:[{category:'Surface Scratch',count:rndInt(5,50)},{category:'Dimensional',count:rndInt(2,30)},{category:'Cosmetic',count:rndInt(1,20)},{category:'Functional',count:rndInt(0,10)}],
      spcData: Array.from({length:20},(_,i) => ({ sample:i+1, value:rnd(9.7,10.3,3), ucl:10.3, lcl:9.7, mean:10.0 })),
    })
  },
  {
    pattern: ['manufacturing', 'inventory'],
    data: () => ({
      totalSkus:rndInt(200,800), lowStockAlerts:rndInt(0,15), inbound:rndInt(10,100), outbound:rndInt(10,100),
      bins: Array.from({length:16},(_,i) => ({ bin:`B${String(i+1).padStart(2,'0')}`, sku:`SKU-${rndInt(1000,9999)}`, qty:rndInt(0,200), capacity:200, status:rndInt(0,200)<20?'low':'ok' })),
      turnoverRate:rnd(2,8,2), reorderItems:rndInt(0,10),
    })
  },
  {
    pattern: ['manufacturing', 'conveyor'],
    data: () => ({
      speed:rnd(0.5,3,2), unit:'m/s', throughput:rndInt(200,800), motorCurrent:rnd(8,25), jamDetected:Math.random()<0.05,
      maintenance:{ nextService:new Date(Date.now()+rndInt(1,30)*86400_000).toISOString().split('T')[0], lastService:new Date(Date.now()-rndInt(10,60)*86400_000).toISOString().split('T')[0] },
      speedTrend: history(30, 0.5, 3, 2),
    })
  },
  {
    pattern: ['infrastructure', 'servers'],
    data: () => ['web-01','web-02','db-primary','db-replica','cache-01'].map(host => ({
      host, cpu:rnd(5,95), memory:rnd(20,90), disk:rnd(10,85),
      network:{ rxMbps:rnd(10,1000), txMbps:rnd(5,500) }, uptime:rndInt(1000,999999), status:rnd(5,95)>90?'warning':'ok',
    }))
  },
  {
    pattern: ['infrastructure', 'servers', ':host'],
    data: p => ({
      host:p.host, cpu:rnd(5,95), memory:rnd(20,90), disk:rnd(10,85),
      processes: Array.from({length:5},(_,i) => ({ pid:1000+i, name:pick(['nginx','node','postgres','redis','python']), cpu:rnd(0,40), mem:rnd(0.1,10,2) })),
      cpuHistory: history(60,5,95), memHistory: history(60,20,90),
    })
  },
  {
    pattern: ['infrastructure', 'network'],
    data: () => ({
      latency:{ p50:rnd(1,5,2), p95:rnd(10,80,2), p99:rnd(20,200,2) }, packetLoss:rnd(0,2,3),
      bandwidth:{ inMbps:rnd(100,900), outMbps:rnd(50,500) },
      incidents: Array.from({length:rndInt(0,5)},(_,i) => ({ id:`INC-${1000+i}`, severity:pick(['critical','high','medium']), description:pick(['BGP route flap','High latency EU-West','Packet loss NYC-1','SSL cert expiry']), opened:tsAgo(rndInt(5,240)), status:pick(['open','investigating','mitigating']) })),
      regions: ['EU-West','US-East','US-West','APAC'].map(r => ({ region:r, latency:rnd(2,150), status:pick(['ok','ok','ok','degraded']) })),
    })
  },
  {
    pattern: ['utilities', 'water'],
    data: () => ({
      turbidity:rnd(0.1,5,3), chlorine:rnd(0.2,2.0,2), ph:rnd(6.5,8.5,2), flowRate:rnd(100,500),
      pumps:['P-101','P-102','P-201'].map(id => ({ id, running:Math.random()>0.15, flow:rnd(30,150), fault:Math.random()<0.05 })),
      compliance:{ turbidityOk:true, chlorineOk:true, phOk:true },
      chlorineTrend: history(24, 0.2, 2.0, 2),
    })
  },
  {
    pattern: ['utilities', 'gas'],
    data: () => ({
      nodes:['N-01','N-02','N-03','N-04','N-05'].map(id => ({ id, pressure:rnd(10,70), unit:'bar', status:Math.random()<0.05?'alarm':'ok' })),
      leakDetected:Math.random()<0.03,
      compressors:['CS-1','CS-2'].map(id => ({ id, running:Math.random()>0.1, outletPressure:rnd(40,70), health:pick(['good','good','fair','poor']) })),
      flowVolume:rnd(1000,5000,0),
      safetyInterlocks:{ highPressureTrip:false, esdActive:false, ventValveOpen:Math.random()<0.02 },
      pressureTrend: history(24, 10, 70),
    })
  },
]

// ─── Router ───────────────────────────────────────────────────────────────────

function matchRoute(segments) {
  for (const route of ROUTES) {
    if (route.pattern.length !== segments.length) continue
    const params = {}
    const ok = route.pattern.every((part, i) => {
      if (part.startsWith(':')) { params[part.slice(1)] = segments[i]; return true }
      return part === segments[i]
    })
    if (ok) return { route, params }
  }
  return null
}

// ─── SSE: registo de clientes activos ─────────────────────────────────────────

// Map: streamKey → Set de respostas SSE abertas
const sseClients = new Map()

function sseKey(segments) { return segments.join('/') }

function registerSSEClient(key, res) {
  if (!sseClients.has(key)) sseClients.set(key, new Set())
  sseClients.get(key).add(res)
}

function unregisterSSEClient(key, res) {
  const set = sseClients.get(key)
  if (set) { set.delete(res); if (set.size === 0) sseClients.delete(key) }
}

function sendSSEEvent(res, data) {
  try { res.write(`data: ${JSON.stringify(data)}\n\n`) } catch (_) {}
}

// Ticker global: a cada INTERVAL ms envia novos dados a todos os clientes SSE
setInterval(() => {
  for (const [key, clients] of sseClients) {
    if (clients.size === 0) continue
    const segments = key.split('/')
    const match    = matchRoute(segments)
    if (!match) continue
    const payload = match.route.data(match.params)
    for (const res of clients) sendSSEEvent(res, payload)
  }
}, INTERVAL)

// ─── HTTP Server ──────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  const parsed   = new URL(req.url, `http://localhost:${PORT}`)
  const pathname = parsed.pathname.replace(/\/$/, '')

  // ── Meta: lista de rotas ────────────────────────────────────────────────────
  if (pathname === '/api/routes') {
    return jsonRes(res, 200, {
      rest:   ROUTES.map(r => `GET /api/${r.pattern.join('/')}`),
      stream: ROUTES.map(r => `GET /api/stream/${r.pattern.join('/')}`),
    })
  }

  // ── SSE: /api/stream/* ──────────────────────────────────────────────────────
  const isStream = pathname.startsWith('/api/stream/')
  if (isStream) {
    const segments = pathname.replace(/^\/api\/stream\//, '').split('/')
    const match    = matchRoute(segments)

    if (!match) {
      return jsonRes(res, 404, { error: `Sem rota SSE: ${pathname}` })
    }

    const key = sseKey(segments)
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    })

    // Enviar dados imediatamente ao conectar
    sendSSEEvent(res, match.route.data(match.params))

    registerSSEClient(key, res)
    req.on('close', () => unregisterSSEClient(key, res))
    return
  }

  // ── REST normal: /api/* ─────────────────────────────────────────────────────
  if (!pathname.startsWith('/api/')) {
    return jsonRes(res, 404, { error: 'Todos os endpoints começam com /api/' })
  }

  const segments = pathname.replace(/^\/api\//, '').split('/')
  const match    = matchRoute(segments)

  if (!match) {
    return jsonRes(res, 404, {
      error: `Sem rota: ${pathname}`,
      dica:  'Ver /api/routes para endpoints disponíveis',
    })
  }

  try {
    jsonRes(res, 200, match.route.data(match.params))
  } catch (err) {
    jsonRes(res, 500, { error: err.message })
  }
})

function jsonRes(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(data, null, 2))
}

server.listen(PORT, () => {
  console.log(`\n  Mock API  →  http://localhost:${PORT}`)
  console.log(`\n   REST    GET http://localhost:${PORT}/api/<rota>`)
  console.log(`   Stream  GET http://localhost:${PORT}/api/stream/<rota>  (SSE, push cada ${INTERVAL/1000}s)`)
  console.log(`   Rotas   GET http://localhost:${PORT}/api/routes\n`)
})
