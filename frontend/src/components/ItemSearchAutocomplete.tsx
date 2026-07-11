/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'react-toastify';

export interface SearchableItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  barcode?: string;
  currentQty?: number;
  [key: string]: any;
}

interface Props {
  items: SearchableItem[];
  onSelect: (item: SearchableItem) => void;
  color?: 'green' | 'red';
  placeholder?: string;
}

const MAX_SUGGESTIONS = 8;

const ItemSearchAutocomplete: React.FC<Props> = ({ items, onSelect, color = 'green', placeholder }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const ring = color === 'green' ? 'focus:ring-green-500' : 'focus:ring-red-500';
  const btn = color === 'green' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600';
  const activeRow = color === 'green' ? 'bg-green-50' : 'bg-red-50';

  // Close the dropdown on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const scored = items
      .filter(i =>
        i.itemCode.toLowerCase().includes(q) ||
        i.itemName.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.toLowerCase().includes(q))
      )
      // Prefer code prefix matches, then name matches.
      .sort((a, b) => {
        const ac = a.itemCode.toLowerCase().startsWith(q) ? 0 : 1;
        const bc = b.itemCode.toLowerCase().startsWith(q) ? 0 : 1;
        if (ac !== bc) return ac - bc;
        return a.itemCode.localeCompare(b.itemCode);
      });
    return scored.slice(0, MAX_SUGGESTIONS);
  }, [query, items]);

  const select = (item: SearchableItem) => {
    onSelect(item);
    setQuery('');
    setOpen(false);
    setHighlight(0);
    inputRef.current?.focus();
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setHighlight(0);
    setOpen(true);

    // Barcode scanners type the full code rapidly. An exact barcode match is
    // added immediately so a scan needs no Enter key.
    const q = value.trim().toLowerCase();
    if (!q) return;
    const barcodeMatch = items.find(i => i.barcode && i.barcode.toLowerCase() === q);
    if (barcodeMatch) select(barcodeMatch);
  };

  const commit = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;

    // Priority: exact barcode, then exact item code, then highlighted suggestion.
    const exact =
      items.find(i => i.barcode && i.barcode.toLowerCase() === q) ||
      items.find(i => i.itemCode.toLowerCase() === q);
    if (exact) { select(exact); return; }

    if (suggestions.length > 0) { select(suggestions[Math.min(highlight, suggestions.length - 1)]); return; }

    toast.error('Item not found');
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={boxRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query && setOpen(true)}
        placeholder={placeholder || 'Enter Item Code, Name or Barcode'}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 ${ring} focus:border-transparent`}
        autoFocus
        autoComplete="off"
      />

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
          {suggestions.map((item, idx) => {
            const out = (item.currentQty ?? 0) <= 0;
            return (
              <li
                key={item.itemId}
                onMouseDown={e => { e.preventDefault(); select(item); }}
                onMouseEnter={() => setHighlight(idx)}
                className={`px-3 py-2 cursor-pointer border-b border-gray-50 last:border-0 ${idx === highlight ? activeRow : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-900">{item.itemCode}</span>
                    <span className="text-gray-500"> — {item.itemName}</span>
                  </div>
                  <span className={`text-xs whitespace-nowrap ${out ? 'text-red-500' : 'text-gray-400'}`}>
                    Stock: {item.currentQty ?? 0}
                  </span>
                </div>
                {item.barcode && (
                  <div className="text-xs text-gray-400 truncate">Barcode: {item.barcode}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={commit}
        className={`w-full mt-3 ${btn} text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2`}
      >
        <Search size={20} /> Search
      </button>
    </div>
  );
};

export default ItemSearchAutocomplete;
