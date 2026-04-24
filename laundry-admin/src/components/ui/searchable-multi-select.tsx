import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

export type SearchableOption = {
  value: string
  label: string
  description?: string
}

type SearchableMultiSelectProps = {
  options: SearchableOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
}

export function SearchableMultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder = 'Buscar...',
  emptyMessage = 'Sin resultados.',
  className,
}: SearchableMultiSelectProps) {
  const [query, setQuery] = useState('')

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((option) => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(q))
  }, [options, query])

  function toggleValue(value: string, checked: boolean) {
    if (checked) {
      onChange(selectedValues.includes(value) ? selectedValues : [...selectedValues, value])
      return
    }
    onChange(selectedValues.filter((item) => item !== value))
  }

  return (
    <div className={className}>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text focus:border-primary focus:outline-none"
        />
      </label>

      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-border bg-surface px-3 py-2">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-start gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={(event) => toggleValue(option.value, event.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="block">{option.label}</span>
                {option.description ? <span className="block text-xs text-text-muted">{option.description}</span> : null}
              </span>
            </label>
          ))
        ) : (
          <p className="text-xs text-text-muted">{emptyMessage}</p>
        )}
      </div>
    </div>
  )
}
