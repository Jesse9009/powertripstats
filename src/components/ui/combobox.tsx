'use client';

import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

export type ComboboxOption = {
  value: number;
  label: string;
};

interface SearchableComboboxProps {
  value: number;
  onChange: (value: number) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

function useDismissablePopover(isOpen: boolean, onClose: () => void) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function onMouseDown(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [isOpen, onClose]);

  return rootRef;
}

export function SearchableCombobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No matches found.',
  disabled,
}: SearchableComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useDismissablePopover(isOpen, () => setIsOpen(false));

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span
          className={cn(
            'truncate text-left',
            !selectedOption && 'text-muted-foreground',
          )}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background p-2 shadow-md">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-8 py-1 text-sm outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            <button
              type="button"
              className="flex w-full items-center rounded px-2 py-2 text-left text-sm hover:bg-secondary"
              onClick={() => {
                onChange(0);
                setIsOpen(false);
              }}
            >
              <span className="text-muted-foreground">Clear selection</span>
            </button>

            {filteredOptions.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                {emptyLabel}
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center rounded px-2 py-2 text-left text-sm hover:bg-secondary',
                    value === option.value && 'bg-secondary font-medium',
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SearchableMultiComboboxProps {
  values: number[];
  valueType: string;
  onChange: (values: number[]) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
}

export function SearchableMultiCombobox({
  values,
  valueType,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyLabel = 'No matches found.',
  disabled,
}: SearchableMultiComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useDismissablePopover(isOpen, () => setIsOpen(false));

  const selectedOptions = useMemo(() => {
    const set = new Set(values);
    return options.filter((option) => set.has(option.value));
  }, [options, values]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) =>
      option.label.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  const toggleValue = (nextValue: number) => {
    if (values.includes(nextValue)) {
      onChange(values.filter((value) => value !== nextValue));
      return;
    }

    onChange([...values, nextValue]);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        className={cn(
          'flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span
          className={cn(
            'truncate text-left',
            selectedOptions.length === 0 && 'text-muted-foreground',
          )}
        >
          {selectedOptions.length === 0
            ? placeholder
            : `${selectedOptions.length} ${valueType}${selectedOptions.length > 1 ? 's' : ''} selected`}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-1 text-xs"
            >
              {option.label}
              <button
                type="button"
                onClick={() => toggleValue(option.value)}
                className="text-muted-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-background p-2 shadow-md">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-8 py-1 text-sm outline-none"
            />
          </div>

          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                {emptyLabel}
              </p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = values.includes(option.value);

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-secondary',
                      isSelected && 'bg-secondary font-medium',
                    )}
                    onClick={() => toggleValue(option.value)}
                  >
                    <span
                      className={cn(
                        'inline-block h-4 w-4 rounded border border-input',
                        isSelected && 'bg-primary',
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
