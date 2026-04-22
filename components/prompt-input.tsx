'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Square, Search, X, ChevronRight, Zap, BarChart2, Thermometer, Wifi, Server, Factory, Wind, Droplets, Gauge, Activity, Shield, Cpu } from 'lucide-react'

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  onCancel?: () => void
  isLoading: boolean
  disabled?: boolean
}

// ─── Example library ────────────────────────────────────────────────────────
// Each example has: the prompt, a category tag, an icon key, and search keywords
// that extend beyond the literal text for smarter fuzzy matching.
interface Example {
  id: string
  prompt: string
  category: string
  iconKey: string
  keywords: string[]
}

const EXAMPLES: Example[] = [
  // ── SCADA / Process control ────────────────────────────────────────────────
  {
    id: 'scada-overview',
    prompt: 'SCADA overview dashboard with real-time process values, valve status indicators, pump controls, and alarm summary panel for a water treatment plant',
    category: 'SCADA',
    iconKey: 'gauge',
    keywords: ['scada', 'process', 'valve', 'pump', 'water', 'treatment', 'plc', 'hmi', 'industrial', 'control', 'supervisory'],
  },
  {
    id: 'plc-alarms',
    prompt: 'PLC alarm management dashboard with active alarm list, alarm history table, severity levels (critical/warning/info), acknowledgement buttons, and alarm frequency chart',
    category: 'SCADA',
    iconKey: 'shield',
    keywords: ['plc', 'alarm', 'alert', 'fault', 'critical', 'warning', 'acknowledge', 'history', 'severity', 'industrial'],
  },
  {
    id: 'conveyor-monitor',
    prompt: 'Conveyor belt monitoring dashboard with belt speed metrics, motor current readings, jam detection status, throughput counter, and maintenance schedule',
    category: 'Manufacturing',
    iconKey: 'factory',
    keywords: ['conveyor', 'belt', 'motor', 'manufacturing', 'production', 'throughput', 'speed', 'jam', 'assembly', 'line'],
  },

  // ── Sensors / IoT ──────────────────────────────────────────────────────────
  {
    id: 'temp-humidity',
    prompt: 'Temperature and humidity monitoring dashboard with real-time sensor readings, historical charts for the past 24h, threshold alerts, and multi-zone comparison table',
    category: 'Sensors',
    iconKey: 'thermometer',
    keywords: ['temperature', 'humidity', 'sensor', 'hvac', 'climate', 'environment', 'zone', 'threshold', 'alert', 'iot', 'weather'],
  },
  {
    id: 'pressure-flow',
    prompt: 'Pressure and flow rate monitoring panel with gauge indicators, trend lines, min/max annotations, anomaly detection badges, and equipment health status cards',
    category: 'Sensors',
    iconKey: 'gauge',
    keywords: ['pressure', 'flow', 'rate', 'gauge', 'pipe', 'fluid', 'anomaly', 'trend', 'sensor', 'process'],
  },
  {
    id: 'vibration-acoustic',
    prompt: 'Vibration and acoustic emission dashboard for predictive maintenance with FFT spectrum chart, RMS trend, bearing fault indicators, and machine health score',
    category: 'Predictive Maintenance',
    iconKey: 'activity',
    keywords: ['vibration', 'acoustic', 'fft', 'bearing', 'predictive', 'maintenance', 'rms', 'spectrum', 'fault', 'machine', 'health'],
  },
  {
    id: 'iot-fleet',
    prompt: 'IoT device fleet management dashboard with device status grid, last-seen timestamps, firmware version tracker, connectivity map, and batch command panel',
    category: 'IoT',
    iconKey: 'wifi',
    keywords: ['iot', 'fleet', 'device', 'connectivity', 'firmware', 'gateway', 'mqtt', 'cloud', 'batch', 'remote'],
  },

  // ── Energy ─────────────────────────────────────────────────────────────────
  {
    id: 'energy-consumption',
    prompt: 'Energy consumption dashboard with kWh usage by zone, power factor correction status, peak demand chart, cost breakdown table, and carbon footprint indicator',
    category: 'Energy',
    iconKey: 'zap',
    keywords: ['energy', 'power', 'kwh', 'consumption', 'electricity', 'grid', 'peak', 'demand', 'cost', 'carbon', 'efficiency'],
  },
  {
    id: 'solar-plant',
    prompt: 'Solar power plant monitoring dashboard with panel array output, inverter status cards, grid feed-in meter, irradiance vs generation chart, and daily yield summary',
    category: 'Energy',
    iconKey: 'zap',
    keywords: ['solar', 'photovoltaic', 'pv', 'panel', 'inverter', 'grid', 'renewable', 'generation', 'irradiance', 'yield', 'energy'],
  },
  {
    id: 'hvac-control',
    prompt: 'HVAC control room dashboard with zone temperature setpoints, AHU status cards, chiller performance metrics, energy usage trend, and fault summary panel',
    category: 'Energy',
    iconKey: 'wind',
    keywords: ['hvac', 'heating', 'cooling', 'ventilation', 'air', 'ahu', 'chiller', 'setpoint', 'zone', 'building', 'bms'],
  },

  // ── Manufacturing / OEE ───────────────────────────────────────────────────
  {
    id: 'oee-dashboard',
    prompt: 'OEE (Overall Equipment Effectiveness) dashboard with availability, performance, and quality gauges, shift comparison chart, downtime Pareto, and production target tracker',
    category: 'Manufacturing',
    iconKey: 'factory',
    keywords: ['oee', 'overall', 'equipment', 'effectiveness', 'availability', 'performance', 'quality', 'downtime', 'pareto', 'shift', 'production'],
  },
  {
    id: 'quality-control',
    prompt: 'Quality control dashboard with SPC control charts, defect rate by production line, first-pass yield trend, inspection result table, and top defect category breakdown',
    category: 'Manufacturing',
    iconKey: 'shield',
    keywords: ['quality', 'spc', 'control', 'chart', 'defect', 'yield', 'inspection', 'first-pass', 'manufacturing', 'six-sigma', 'production'],
  },
  {
    id: 'inventory-wms',
    prompt: 'Warehouse inventory dashboard with bin-level stock map, low-stock alerts, inbound/outbound shipment tracker, turnover rate chart, and reorder point indicators',
    category: 'Manufacturing',
    iconKey: 'cpu',
    keywords: ['warehouse', 'inventory', 'wms', 'stock', 'shipment', 'bin', 'turnover', 'reorder', 'logistics', 'storage'],
  },

  // ── Infrastructure / IT Ops ───────────────────────────────────────────────
  {
    id: 'server-monitoring',
    prompt: 'Server infrastructure monitoring dashboard with CPU/memory/disk usage cards, network throughput charts, top-process table, uptime counters, and alert timeline',
    category: 'Infrastructure',
    iconKey: 'server',
    keywords: ['server', 'cpu', 'memory', 'disk', 'network', 'infrastructure', 'uptime', 'monitoring', 'ops', 'devops', 'linux'],
  },
  {
    id: 'network-ops',
    prompt: 'Network operations dashboard with topology status panel, latency heatmap by region, packet-loss trend, active incident list, and bandwidth utilisation chart',
    category: 'Infrastructure',
    iconKey: 'wifi',
    keywords: ['network', 'latency', 'bandwidth', 'packet', 'topology', 'ops', 'noc', 'incident', 'region', 'vpn', 'firewall'],
  },

  // ── Water / Utilities ─────────────────────────────────────────────────────
  {
    id: 'water-treatment',
    prompt: 'Water treatment plant dashboard with turbidity readings, chlorine dosing status, flow rate meters, pump operational status, and compliance threshold indicators',
    category: 'Utilities',
    iconKey: 'droplets',
    keywords: ['water', 'treatment', 'turbidity', 'chlorine', 'dosing', 'flow', 'pump', 'compliance', 'utility', 'municipal', 'waste'],
  },
  {
    id: 'gas-pipeline',
    prompt: 'Gas pipeline monitoring dashboard with pressure readings at key nodes, leak detection status, compressor station health, flow volume chart, and safety interlock status',
    category: 'Utilities',
    iconKey: 'gauge',
    keywords: ['gas', 'pipeline', 'pressure', 'leak', 'compressor', 'flow', 'safety', 'interlock', 'utility', 'natural', 'oil'],
  },
]

// ─── Icon map ────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  gauge: Gauge,
  shield: Shield,
  factory: Factory,
  thermometer: Thermometer,
  activity: Activity,
  wifi: Wifi,
  zap: Zap,
  wind: Wind,
  droplets: Droplets,
  server: Server,
  cpu: Cpu,
  'bar-chart': BarChart2,
}

// ─── Category colours ────────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  'SCADA':                 { bg: 'bg-orange-500/10',  text: 'text-orange-600 dark:text-orange-400',  dot: 'bg-orange-500' },
  'Sensors':               { bg: 'bg-sky-500/10',     text: 'text-sky-600 dark:text-sky-400',        dot: 'bg-sky-500' },
  'IoT':                   { bg: 'bg-violet-500/10',  text: 'text-violet-600 dark:text-violet-400',  dot: 'bg-violet-500' },
  'Energy':                { bg: 'bg-amber-500/10',   text: 'text-amber-600 dark:text-amber-400',    dot: 'bg-amber-500' },
  'Manufacturing':         { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400',dot: 'bg-emerald-500' },
  'Predictive Maintenance':{ bg: 'bg-rose-500/10',    text: 'text-rose-600 dark:text-rose-400',      dot: 'bg-rose-500' },
  'Infrastructure':        { bg: 'bg-slate-500/10',   text: 'text-slate-600 dark:text-slate-400',    dot: 'bg-slate-500' },
  'Utilities':             { bg: 'bg-teal-500/10',    text: 'text-teal-600 dark:text-teal-400',      dot: 'bg-teal-500' },
}

// ─── Fuzzy search ────────────────────────────────────────────────────────────
// Lightweight trigram-based scorer: no dependency needed.
function trigramScore(query: string, target: string): number {
  if (!query) return 0
  const q = query.toLowerCase().trim()
  const t = target.toLowerCase()

  // Exact substring bonus
  if (t.includes(q)) return 1000

  // Word-boundary bonus — every query word that starts a word in target
  const qWords = q.split(/\s+/).filter(Boolean)
  let wordScore = 0
  for (const w of qWords) {
    if (w.length < 2) continue
    if (t.includes(w)) wordScore += 40
    else {
      // partial: does the target contain this prefix?
      for (let len = Math.max(2, w.length - 1); len >= 2; len--) {
        if (t.includes(w.slice(0, len))) { wordScore += 10 * (len / w.length); break }
      }
    }
  }

  // Trigram overlap
  const getTrigrams = (s: string) => {
    const tg = new Set<string>()
    for (let i = 0; i < s.length - 2; i++) tg.add(s.slice(i, i + 3))
    return tg
  }
  const qTg = getTrigrams(q)
  const tTg = getTrigrams(t)
  let shared = 0
  qTg.forEach(tg => { if (tTg.has(tg)) shared++ })
  const trigramSim = qTg.size > 0 ? (shared / qTg.size) * 60 : 0

  return wordScore + trigramSim
}

function searchExamples(query: string): Example[] {
  if (!query.trim()) return EXAMPLES

  const scored = EXAMPLES.map(ex => {
    const corpus = [ex.prompt, ex.category, ...ex.keywords].join(' ')
    const score = trigramScore(query, corpus)
    return { ex, score }
  })

  return scored
    .filter(({ score }) => score > 8)
    .sort((a, b) => b.score - a.score)
    .map(({ ex }) => ex)
}

// ─── Highlight matched text ───────────────────────────────────────────────────
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length >= 2)
  if (words.length === 0) return <>{text}</>

  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, i) =>
        words.some(w => part.toLowerCase() === w.toLowerCase())
          ? <mark key={i} className="bg-primary/15 text-primary rounded-sm px-0.5 not-italic font-medium">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export function PromptInput({ onSubmit, onCancel, isLoading, disabled }: PromptInputProps) {
  const [prompt, setPrompt] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isExamplesOpen, setIsExamplesOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [prompt])

  // Close on outside click
  useEffect(() => {
    if (!isExamplesOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsExamplesOpen(false)
        setSearchQuery('')
        setFocusedIndex(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isExamplesOpen])

  // Focus search when panel opens
  useEffect(() => {
    if (isExamplesOpen) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [isExamplesOpen])

  const filteredExamples = useMemo(() => searchExamples(searchQuery), [searchQuery])

  const handleSubmit = () => {
    if (prompt.trim() && !isLoading && !disabled) {
      onSubmit(prompt.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExampleSelect = useCallback((example: Example) => {
    setPrompt(example.prompt)
    setIsExamplesOpen(false)
    setSearchQuery('')
    setFocusedIndex(-1)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex(i => Math.min(i + 1, filteredExamples.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault()
      if (filteredExamples[focusedIndex]) handleExampleSelect(filteredExamples[focusedIndex])
    } else if (e.key === 'Escape') {
      setIsExamplesOpen(false)
      setSearchQuery('')
    }
  }

  // Scroll focused item into view
  useEffect(() => {
    if (focusedIndex < 0 || !listRef.current) return
    const item = listRef.current.querySelector(`[data-idx="${focusedIndex}"]`) as HTMLElement | null
    item?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex])

  // Reset focused index when results change
  useEffect(() => { setFocusedIndex(-1) }, [searchQuery])

  return (
    <div className="flex flex-col gap-4">
      {/* ── Prompt textarea ── */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the industrial interface you want to create…"
          className="min-h-[100px] pr-24 resize-none"
          disabled={isLoading || disabled}
        />
        {isLoading ? (
          <Button
            type="button"
            onClick={onCancel}
            disabled={!onCancel}
            variant="destructive"
            className="absolute bottom-3 right-3"
            size="sm"
          >
            <Square className="mr-2 h-4 w-4 fill-current" />
            Cancel
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!prompt.trim() || disabled}
            className="absolute bottom-3 right-3"
            size="sm"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
          </Button>
        )}
      </div>

      {/* ── Try an example ── */}
      <div ref={panelRef} className="relative">
        {/* Trigger row */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Try an example:</span>
          <button
            type="button"
            onClick={() => setIsExamplesOpen(o => !o)}
            disabled={isLoading || disabled}
            className={`
              inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md
              transition-all duration-150 select-none
              ${isExamplesOpen
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {isExamplesOpen ? (
              <><X className="h-3 w-3" />Close</>
            ) : (
              <><Search className="h-3 w-3" />Browse {EXAMPLES.length} examples</>
            )}
          </button>
        </div>

        {/* Quick pill previews (shown when panel is closed) */}
        {!isExamplesOpen && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {EXAMPLES.slice(0, 4).map((ex) => {
              const Icon = ICON_MAP[ex.iconKey] ?? Gauge
              const col = CATEGORY_COLOR[ex.category] ?? CATEGORY_COLOR['Sensors']
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleExampleSelect(ex)}
                  disabled={isLoading || disabled}
                  title={ex.prompt}
                  className={`
                    inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs
                    border border-border/60 bg-card
                    hover:border-primary/40 hover:bg-primary/5
                    transition-all duration-150 disabled:opacity-40
                    text-foreground/80 hover:text-foreground
                    max-w-[200px]
                  `}
                >
                  <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{ex.category}</span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setIsExamplesOpen(true)}
              disabled={isLoading || disabled}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-40"
            >
              +{EXAMPLES.length - 4} more
            </button>
          </div>
        )}

        {/* ── Search panel ── */}
        {isExamplesOpen && (
          <div className="mt-2 rounded-xl border border-border bg-card shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">

            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-muted/30">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by keyword, sensor type, industry…"
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60 text-foreground"
                autoComplete="off"
                spellCheck={false}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(''); searchRef.current?.focus() }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <span className="text-[10px] text-muted-foreground/50 shrink-0 hidden sm:block">
                ↑↓ navigate · ↵ select · Esc close
              </span>
            </div>

            {/* Results */}
            <div ref={listRef} className="overflow-y-auto max-h-[340px] divide-y divide-border/50">
              {filteredExamples.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No examples match <span className="font-medium text-foreground">"{searchQuery}"</span></p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try terms like "sensor", "energy", "alarm", "OEE"…</p>
                </div>
              ) : (
                filteredExamples.map((ex, idx) => {
                  const Icon = ICON_MAP[ex.iconKey] ?? Gauge
                  const col = CATEGORY_COLOR[ex.category] ?? { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' }
                  const isFocused = idx === focusedIndex
                  return (
                    <button
                      key={ex.id}
                      data-idx={idx}
                      type="button"
                      onClick={() => handleExampleSelect(ex)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={`
                        w-full flex items-start gap-3 px-3 py-3 text-left
                        transition-colors duration-100 group
                        ${isFocused ? 'bg-primary/8' : 'hover:bg-muted/60'}
                      `}
                    >
                      {/* Icon bubble */}
                      <div className={`mt-0.5 flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center ${col.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${col.text}`} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          {/* Category badge */}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm ${col.bg} ${col.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${col.dot} shrink-0`} />
                            {ex.category}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/85 leading-relaxed line-clamp-2">
                          <HighlightedText text={ex.prompt} query={searchQuery} />
                        </p>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className={`h-3.5 w-3.5 shrink-0 mt-1.5 transition-all duration-100 ${isFocused ? 'text-primary translate-x-0.5' : 'text-muted-foreground/40 group-hover:text-muted-foreground'}`} />
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-border bg-muted/20 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {filteredExamples.length === EXAMPLES.length
                  ? `${EXAMPLES.length} examples · AdminLTE compatible`
                  : `${filteredExamples.length} of ${EXAMPLES.length} examples`}
              </span>
              <span className="text-[10px] text-muted-foreground/50">Click to use as prompt</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
