import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  invalid?: boolean;
  /** Tailwind focus-ring class, e.g. "focus:ring-green-500" */
  focusRing?: string;
}

const SearchableSelect: React.FC<Props> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  invalid = false,
  focusRing = 'focus:ring-green-500',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const border = invalid ? 'border-red-400' : 'border-gray-300';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className={`w-full px-3 py-2 border ${border} rounded-lg text-sm text-left flex justify-between items-center focus:ring-2 ${focusRing} focus:border-transparent`}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100 relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-7 pr-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            <li
              onClick={() => { onChange(''); setOpen(false); }}
              className="px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 cursor-pointer"
            >
              {placeholder}
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No results</li>
            ) : filtered.map(o => (
              <li
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${value === o.value ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-900'}`}
              >
                {o.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
