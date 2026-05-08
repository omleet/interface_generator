'use client'

import { FileCode2, MonitorCheck } from 'lucide-react'

export type OutputFormat = 'html' | 'qt-python'

interface OutputFormatSelectorProps {
  value: OutputFormat
  onChange: (format: OutputFormat) => void
  disabled?: boolean
}

const OPTIONS: { value: OutputFormat; label: string; sublabel: string; Icon: React.ElementType }[] = [
  {
    value: 'html',
    label: 'HTML / CSS / JS',
    sublabel: 'AdminLTE 3 web dashboard',
    Icon: MonitorCheck,
  },
  {
    value: 'qt-python',
    label: 'Qt Python',
    sublabel: 'PySide6 desktop app',
    Icon: FileCode2,
  },
]

export function OutputFormatSelector({ value, onChange, disabled }: OutputFormatSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border" role="radiogroup" aria-label="Output format">
      {OPTIONS.map(({ value: optVal, label, sublabel, Icon }) => {
        const isSelected = value === optVal
        return (
          <button
            key={optVal}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(optVal)}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-left transition-all duration-150 flex-1',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isSelected
                ? 'bg-background text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
            ].join(' ')}
          >
            <Icon className={['h-3.5 w-3.5 shrink-0', isSelected ? 'text-primary' : ''].join(' ')} />
            <span className="flex flex-col leading-none">
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
