'use client'

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Slider } from '@/components/ui/slider'
import { Settings2, Wifi, WifiOff, RefreshCw, Cloud, Eye, EyeOff } from 'lucide-react'
import {
  type LLMConfig,
  type LLMProvider,
  type QualityMode,
  DEFAULT_CONFIGS,
  SUGGESTED_MODELS,
  VRAM_CONTEXT_SUGGESTIONS,
  testConnection,
  getDefaultModel,
  resolveSamplingParams,
} from '@/lib/llm-client'

interface LLMSettingsProps {
  config: LLMConfig
  onConfigChange: (config: LLMConfig) => void
}

// Key used to persist the Ollama Cloud API key in localStorage so the user
// doesn't need to paste it on every reload. Kept intentionally simple — this
// is a local-first dev tool, not a multi-tenant hosted app.
const OLLAMA_CLOUD_API_KEY_STORAGE = 'ollama-cloud-api-key'

export function LLMSettings({ config, onConfigChange }: LLMSettingsProps) {
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [customUrl, setCustomUrl] = useState(config.baseUrl)
  const [open, setOpen] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey ?? '')
  const [showApiKey, setShowApiKey] = useState(false)
  const [customModel, setCustomModel] = useState('')

  // Hydrate persisted API key on mount when cloud is the active provider.
  useEffect(() => {
    if (config.provider === 'ollama-cloud' && !config.apiKey && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(OLLAMA_CLOUD_API_KEY_STORAGE)
      if (stored) {
        setApiKeyInput(stored)
        onConfigChange({ ...config, apiKey: stored })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    checkConnection()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.provider, config.baseUrl, config.apiKey])

  const checkConnection = async () => {
    setIsLoading(true)
    setIsConnected(null)

    const result = await testConnection(config)

    setIsConnected(result.success)
    if (result.models && result.models.length > 0) {
      // Preserve any custom model the user already set — merge it into the fetched list
      // so it remains selectable even if the server doesn't report it (e.g. Ollama Cloud
      // with a model name typed manually before the connection test).
      const mergedModels = config.model && !result.models.includes(config.model)
        ? [config.model, ...result.models]
        : result.models
      setAvailableModels(mergedModels)
      // Do NOT auto-select another model — respect whatever the user already picked.
    } else {
      // Connection failed or server returned no models.
      // Preserve existing custom model in the suggestions so it stays visible.
      const fallback = SUGGESTED_MODELS[config.provider]
      const mergedFallback = config.model && !fallback.includes(config.model)
        ? [config.model, ...fallback]
        : fallback
      setAvailableModels(mergedFallback)
    }

    setIsLoading(false)
  }

  const handleProviderChange = (provider: LLMProvider) => {
    const newConfig: LLMConfig = {
      ...DEFAULT_CONFIGS[provider],
      model: getDefaultModel(provider),
    }
    // When switching to cloud, rehydrate any previously-saved API key.
    if (provider === 'ollama-cloud' && typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(OLLAMA_CLOUD_API_KEY_STORAGE)
      if (stored) {
        newConfig.apiKey = stored
        setApiKeyInput(stored)
      }
    }
    setCustomUrl(newConfig.baseUrl)
    onConfigChange(newConfig)
  }

  const handleModelChange = (model: string) => {
    onConfigChange({ ...config, model })
  }

  const handleUrlChange = () => {
    onConfigChange({ ...config, baseUrl: customUrl })
  }

  const handleApiKeyApply = () => {
    const trimmed = apiKeyInput.trim()
    if (typeof window !== 'undefined') {
      if (trimmed) {
        window.localStorage.setItem(OLLAMA_CLOUD_API_KEY_STORAGE, trimmed)
      } else {
        window.localStorage.removeItem(OLLAMA_CLOUD_API_KEY_STORAGE)
      }
    }
    onConfigChange({ ...config, apiKey: trimmed || undefined })
  }

  // Allow pasting any cloud model name (e.g. "glm-4.6:cloud") without having
  // to wait for /api/tags. Useful because the cloud catalog is large.
  const handleAddCustomModel = () => {
    const trimmed = customModel.trim()
    if (!trimmed) return
    // Update the available models list first so the Select has the value
    // before onConfigChange triggers a re-render — prevents the select going blank.
    setAvailableModels((prev) => (prev.includes(trimmed) ? prev : [trimmed, ...prev]))
    onConfigChange({ ...config, model: trimmed })
    setCustomModel('')
  }

  const connectionStatus = isLoading ? (
    <Badge variant="secondary" className="gap-1">
      <RefreshCw className="h-3 w-3 animate-spin" />
      Checking...
    </Badge>
  ) : isConnected === true ? (
    <Badge variant="default" className="gap-1 bg-green-600">
      <Wifi className="h-3 w-3" />
      Connected
    </Badge>
  ) : isConnected === false ? (
    <Badge variant="destructive" className="gap-1">
      <WifiOff className="h-3 w-3" />
      Disconnected
    </Badge>
  ) : null

  return (
    <div className="flex items-center gap-3">
      <Select value={config.provider} onValueChange={(v: LLMProvider) => handleProviderChange(v)}>
        <SelectTrigger className="w-37.5">
          <SelectValue placeholder="Provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ollama">Ollama</SelectItem>
          <SelectItem value="ollama-cloud">
            <span className="flex items-center gap-1.5">
              
              Ollama Cloud
            </span>
          </SelectItem>
          <SelectItem value="lmstudio">LM Studio</SelectItem>
        </SelectContent>
      </Select>

      <Select value={config.model} onValueChange={handleModelChange}>
        <SelectTrigger className="w-50">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          {availableModels.map((model) => (
            <SelectItem key={model} value={model}>
              {model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Quality mode quick toggle — hidden for Ollama Cloud (cloud handles sampling server-side) */}
      {config.provider !== 'ollama-cloud' && (
        <div className="flex items-center border rounded-md overflow-hidden text-xs font-medium">
          <button
            className={`px-2 py-1.5 transition-colors ${(config.qualityMode ?? 'fast') === 'fast' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => onConfigChange({ ...config, qualityMode: 'fast' })}
            title="Fast: higher temperature, no refinement pass"
          >
            Fast
          </button>
          <button
            className={`px-2 py-1.5 transition-colors ${(config.qualityMode ?? 'fast') === 'quality' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => onConfigChange({ ...config, qualityMode: 'quality' })}
            title="Quality: low temperature + self-refinement pass"
          >
            Quality
          </button>
          <button
            className={`px-2 py-1.5 transition-colors ${(config.qualityMode ?? 'fast') === 'custom' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
            onClick={() => onConfigChange({ ...config, qualityMode: 'custom', customTemperature: config.customTemperature ?? 0.5 })}
            title="Custom: choose your own temperature"
          >
            Custom
          </button>
        </div>
      )}

      {connectionStatus}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <Settings2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>LLM Settings</DialogTitle>
            <DialogDescription>
              Configure your LLM connection. Make sure CORS is enabled.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="flex-1 overflow-y-auto px-6 py-4">
            <Field>
              <FieldLabel>Provider</FieldLabel>
              <Select value={config.provider} onValueChange={(v: LLMProvider) => handleProviderChange(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ollama">Ollama (local)</SelectItem>
                  <SelectItem value="ollama-cloud">Ollama Cloud</SelectItem>
                  <SelectItem value="lmstudio">LM Studio</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel>Base URL</FieldLabel>
              <div className="flex gap-2">
                <Input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder={config.provider === 'ollama-cloud' ? 'https://ollama.com' : 'http://127.0.0.1:11434'}
                />
                <Button variant="outline" onClick={handleUrlChange}>
                  Apply
                </Button>
              </div>
            </Field>

            {config.provider === 'ollama-cloud' && (
              <Field>
                <FieldLabel>
                  <span className="flex items-center gap-1.5">
                    <Cloud className="h-3.5 w-3.5" />
                    Ollama Cloud API Key
                  </span>
                </FieldLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Paste your ollama.com API key"
                      className="pr-9 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button variant="outline" onClick={handleApiKeyApply}>
                    Apply
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create a key at{' '}
                  <a
                    href="https://ollama.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ollama.com/settings/keys
                  </a>
                  . Saved in your browser&apos;s localStorage.
                </p>
              </Field>
            )}

            {config.provider === 'ollama-cloud' && (
              <Field>
                <FieldLabel>Custom Model Name</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="e.g. glm-4.6:cloud, gpt-oss:120b-cloud"
                    className="font-mono text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustomModel()
                      }
                    }}
                  />
                  <Button variant="outline" onClick={handleAddCustomModel}>
                    Use
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Paste any model name from{' '}
                  <a
                    href="https://ollama.com/search?c=cloud"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    ollama.com/search?c=cloud
                  </a>
                  .
                </p>
              </Field>
            )}

            {/* Generation Mode — only relevant for local providers that accept sampling params */}
            {config.provider !== 'ollama-cloud' && (
              <Field>
                <FieldLabel>Generation Mode</FieldLabel>
                <div className="flex gap-2">
                  <button
                    className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${(config.qualityMode ?? 'fast') === 'fast' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                    onClick={() => onConfigChange({ ...config, qualityMode: 'fast' as QualityMode })}
                  >
                    Fast
                    <span className="block text-xs font-normal opacity-75">temp 0.5 · no refinement</span>
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${(config.qualityMode ?? 'fast') === 'quality' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                    onClick={() => onConfigChange({ ...config, qualityMode: 'quality' as QualityMode })}
                  >
                    Quality
                    <span className="block text-xs font-normal opacity-75">temp 0.7 · self-refinement</span>
                  </button>
                  <button
                    className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${(config.qualityMode ?? 'fast') === 'custom' ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'}`}
                    onClick={() => onConfigChange({ ...config, qualityMode: 'custom' as QualityMode, customTemperature: config.customTemperature ?? 0.5 })}
                  >
                    Custom
                    <span className="block text-xs font-normal opacity-75">Change as you like</span>
                  </button>
                </div>

                {/* Custom temperature slider — only visible when Custom mode is active */}
                {(config.qualityMode ?? 'fast') === 'custom' && (() => {
                  const temp = config.customTemperature ?? 0.5
                  const label =
                    temp <= 0.3
                      ? 'More restricted — deterministic and predictable responses.'
                      : temp <= 0.6
                      ? 'Balanced — a good balance between consistency and variety.'
                      : 'More creative — varied and imaginative responses.'
                  return (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Temperature</span>
                        <span className="text-sm font-mono font-semibold tabular-nums w-8 text-right">
                          {temp.toFixed(1)}
                        </span>
                      </div>
                      <Slider
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={[temp]}
                        onValueChange={([v]) =>
                          onConfigChange({ ...config, customTemperature: Math.round(v * 10) / 10 })
                        }
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground select-none">
                        <span>0.1</span>
                        <span>1.0</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{label}</p>
                    </div>
                  )
                })()}
              </Field>
            )}

            {/* Context Length (num_ctx) — hardware-driven, independent of quality mode.
                Only relevant for local providers; Ollama Cloud runs on Ollama's own hardware. */}
            {config.provider !== 'ollama-cloud' && (() => {
              const effectiveCtx = resolveSamplingParams(config).num_ctx
              const isOverridden = !!config.contextLength && config.contextLength > 0
              return (
                <Field>
                  <FieldLabel>Context Length (num_ctx)</FieldLabel>
                  <p className="text-xs text-muted-foreground -mt-1 mb-1">
                    Pick the option closest to your GPU&apos;s VRAM. Too high and the model
                    spills onto CPU (slow, sometimes malformed output); too low and long
                    prompts get silently truncated.
                  </p>
                  {config.provider === 'lmstudio' ? (
                    <p className="text-xs text-amber-600 dark:text-amber-500 -mt-1 mb-1">
                      ⚠ LM Studio&apos;s API has no field for this — picking a value below only
                      updates the reminder text under &quot;Setup&quot;. You still have to type it
                      into LM Studio yourself, on the model&apos;s load screen, before starting the
                      server.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground -mt-1 mb-1">
                      Sent automatically as <code className="font-mono">num_ctx</code> with every
                      request — no extra steps needed.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {VRAM_CONTEXT_SUGGESTIONS.map((s) => (
                      <button
                        key={s.label}
                        className={`px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
                          config.contextLength === s.num_ctx
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => onConfigChange({ ...config, contextLength: s.num_ctx })}
                      >
                        {s.label}
                        <span className="block opacity-75">{s.num_ctx.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      min={512}
                      step={512}
                      value={config.contextLength ?? ''}
                      placeholder={`${effectiveCtx} (mode default)`}
                      onChange={(e) => {
                        const v = e.target.value.trim()
                        onConfigChange({
                          ...config,
                          contextLength: v ? Math.max(0, parseInt(v, 10)) : undefined,
                        })
                      }}
                      className="font-mono text-xs"
                    />
                    {isOverridden && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onConfigChange({ ...config, contextLength: undefined })}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {config.provider === 'lmstudio'
                      ? isOverridden
                        ? `Reminder set: type ${config.contextLength!.toLocaleString()} tokens into LM Studio's model load screen.`
                        : `Reminder shows the ${config.qualityMode ?? 'fast'} mode default: ${effectiveCtx.toLocaleString()} tokens — set this in LM Studio.`
                      : isOverridden
                      ? `Using your override: ${config.contextLength!.toLocaleString()} tokens.`
                      : `Using the ${config.qualityMode ?? 'fast'} mode default: ${effectiveCtx.toLocaleString()} tokens.`}
                  </p>
                </Field>
              )
            })()}

            <Field>
              <FieldLabel>Model</FieldLabel>
              <Select value={config.model} onValueChange={handleModelChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connection Status</span>
              {connectionStatus}
            </div>

            <Button onClick={checkConnection} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium mb-2">Setup:</p>
              {config.provider === 'ollama' && (
                <code className="text-xs block bg-background p-2 rounded">
                  OLLAMA_ORIGINS=http://localhost:3000 ollama serve
                </code>
              )}
              {config.provider === 'ollama-cloud' && (
                <p className="text-xs text-muted-foreground">
                  Ollama Cloud uses the same REST API as local Ollama but runs models on Ollama&apos;s
                  servers. No local install needed — just paste your API key above and a model name
                  (any model ending in <code className="font-mono">:cloud</code>).
                </p>
              )}
              {config.provider === 'lmstudio' && (
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    Enable &quot;Allow CORS&quot; in LM Studio server settings.
                  </p>
                  <p>
                    Temperature, top-p, max tokens and repeat penalty are sent automatically
                    for the selected mode below — but LM Studio does not accept context length
                    per request. Set it manually when you load the model (model load screen →
                    &quot;Context Length&quot;), before starting the server:
                  </p>
                  <code className="text-xs block bg-background p-2 rounded">
                    Context Length ≥ {resolveSamplingParams(config).num_ctx.toLocaleString()} tokens
                    {config.contextLength && config.contextLength > 0
                      ? ' (your override, set above)'
                      : ` (${config.qualityMode ?? 'fast'} mode default)`}
                  </code>
                  <p className="text-xs">
                    If it&apos;s set lower than that, the app&apos;s system prompt + RAG context can get
                    silently truncated, which is the most common cause of broken or empty dashboards
                    with LM Studio (and of the automatic &quot;Refining and correcting&quot; pass kicking in).
                  </p>
                </div>
              )}
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>
    </div>
  )
}
