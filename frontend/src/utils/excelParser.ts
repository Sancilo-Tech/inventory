import * as XLSX from 'xlsx';

export interface BulkItemRow {
  item_name: string;
  item_code: string;
  type_id: string;
  supplier_id?: string;
  purchase_price: number;
  tax_id?: string;
  current_qty: number;
  quantityType: string;
  location_id?: string;
  rol?: number;
  moq?: number;
  eoq?: number;
  defaultIncrease?: number;
  defaultDecrease?: number;
  packQty?: number;
  groupName?: string;
}

export interface ParsedRow {
  rowIndex: number;
  data: BulkItemRow;
  errors: string[];
  isValid: boolean;
}

export interface ParseResult {
  rows: ParsedRow[];
  validCount: number;
  invalidCount: number;
}

const REQUIRED_COLUMNS = ['item_name', 'item_code', 'type_id', 'purchase_price', 'current_qty', 'quantityType'];

function toStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function toNum(val: unknown): number | undefined {
  const n = Number(val);
  return isNaN(n) ? undefined : n;
}

export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (rawRows.length === 0) {
          reject(new Error('The file is empty or has no data rows.'));
          return;
        }

        // Validate headers
        const headers = Object.keys(rawRows[0]);
        const missingCols = REQUIRED_COLUMNS.filter(c => !headers.includes(c));
        if (missingCols.length > 0) {
          reject(new Error(`Missing required columns: ${missingCols.join(', ')}`));
          return;
        }

        const seenCodes = new Map<string, number>();
        const rows: ParsedRow[] = rawRows.map((raw, idx) => {
          const rowIndex = idx + 2; // Excel row number (1-based + header)
          const errors: string[] = [];

          const item_name = toStr(raw['item_name']);
          const item_code = toStr(raw['item_code']);
          const type_id = toStr(raw['type_id']);
          const supplier_id = toStr(raw['supplier_id']) || undefined;
          const tax_id = toStr(raw['tax_id']) || undefined;
          const location_id = toStr(raw['location_id']) || undefined;
          const quantityType = toStr(raw['quantityType']) || 'unit';
          const groupName = toStr(raw['groupName']) || undefined;

          const purchase_price = toNum(raw['purchase_price']);
          const current_qty = toNum(raw['current_qty']);
          const rol = toNum(raw['rol']);
          const moq = toNum(raw['moq']);
          const eoq = toNum(raw['eoq']);
          const defaultIncrease = toNum(raw['defaultIncrease']);
          const defaultDecrease = toNum(raw['defaultDecrease']);
          const packQty = toNum(raw['packQty']);

          if (!item_name) errors.push('item_name is required');
          if (!item_code) errors.push('item_code is required');
          if (!type_id) errors.push('type_id is required');
          if (purchase_price === undefined || isNaN(purchase_price)) {
            errors.push('purchase_price must be a number');
          } else if (purchase_price <= 0) {
            errors.push('purchase_price must be greater than 0');
          }
          if (current_qty === undefined || isNaN(current_qty)) {
            errors.push('current_qty must be a number');
          } else if (current_qty < 0) {
            errors.push('current_qty cannot be negative');
          }
          if (!quantityType) errors.push('quantityType is required');

          // Duplicate item_code check within file
          if (item_code) {
            const codeKey = item_code.toLowerCase();
            if (seenCodes.has(codeKey)) {
              errors.push(`item_code "${item_code}" is duplicated in the file (first seen at row ${seenCodes.get(codeKey)})`);
            } else {
              seenCodes.set(codeKey, rowIndex);
            }
          }

          const data: BulkItemRow = {
            item_name,
            item_code,
            type_id,
            supplier_id,
            purchase_price: purchase_price ?? 0,
            tax_id,
            current_qty: current_qty ?? 0,
            quantityType,
            location_id,
            rol,
            moq,
            eoq,
            defaultIncrease,
            defaultDecrease,
            packQty,
            groupName,
          };

          return { rowIndex, data, errors, isValid: errors.length === 0 };
        });

        const validCount = rows.filter(r => r.isValid).length;
        resolve({ rows, validCount, invalidCount: rows.length - validCount });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function downloadSampleTemplate(): void {
  const headers = [
    'item_name', 'item_code', 'type_id', 'supplier_id',
    'purchase_price', 'tax_id', 'current_qty', 'quantityType',
    'location_id', 'rol', 'moq', 'eoq',
    'defaultIncrease', 'defaultDecrease', 'packQty', 'groupName',
  ];

  const sampleRows = [
    {
      item_name: 'Sample Item A', item_code: 'ITM-001',
      type_id: '<paste-type-uuid>', supplier_id: '<paste-supplier-uuid>',
      purchase_price: 10.5, tax_id: '<paste-tax-uuid>',
      current_qty: 100, quantityType: 'unit',
      location_id: '<paste-location-uuid>',
      rol: 10, moq: 5, eoq: 50,
      defaultIncrease: 1, defaultDecrease: 1, packQty: 12, groupName: '',
    },
    {
      item_name: 'Sample Item B', item_code: 'ITM-002',
      type_id: '<paste-type-uuid>', supplier_id: '',
      purchase_price: 25.0, tax_id: '',
      current_qty: 50, quantityType: 'kilogram',
      location_id: '',
      rol: 5, moq: 2, eoq: 20,
      defaultIncrease: 1, defaultDecrease: 1, packQty: '', groupName: '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleRows, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  XLSX.writeFile(wb, 'bulk_items_template.xlsx');
}

export function downloadErrorReport(rows: ParsedRow[]): void {
  const errorRows = rows
    .filter(r => !r.isValid)
    .map(r => ({
      row: r.rowIndex,
      item_code: r.data.item_code,
      item_name: r.data.item_name,
      errors: r.errors.join('; '),
    }));

  const ws = XLSX.utils.json_to_sheet(errorRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Errors');
  XLSX.writeFile(wb, 'bulk_upload_errors.xlsx');
}

// ─── Supplier Bulk ───────────────────────────────────────────────
export interface ParsedSimpleRow {
  rowIndex: number;
  data: Record<string, any>;
  errors: string[];
  isValid: boolean;
}

export interface SimpleParseResult {
  rows: ParsedSimpleRow[];
  validCount: number;
  invalidCount: number;
}

function parseSimple(
  file: File,
  requiredCols: string[],
  transform: (raw: Record<string, unknown>, errors: string[]) => Record<string, any>
): Promise<SimpleParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
        if (rawRows.length === 0) { reject(new Error('File is empty.')); return; }
        const headers = Object.keys(rawRows[0]);
        const missing = requiredCols.filter(c => !headers.includes(c));
        if (missing.length > 0) { reject(new Error(`Missing columns: ${missing.join(', ')}`)); return; }
        const rows: ParsedSimpleRow[] = rawRows.map((raw, idx) => {
          const errors: string[] = [];
          const rowData = transform(raw, errors);
          return { rowIndex: idx + 2, data: rowData, errors, isValid: errors.length === 0 };
        });
        const validCount = rows.filter(r => r.isValid).length;
        resolve({ rows, validCount, invalidCount: rows.length - validCount });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseSupplierFile(file: File): Promise<SimpleParseResult> {
  return parseSimple(file, ['supplierName'], (raw, errors) => {
    const supplierName = String(raw['supplierName'] ?? '').trim();
    if (!supplierName) errors.push('supplierName is required');
    return {
      supplierName,
      contactPerson: String(raw['contactPerson'] ?? '').trim() || undefined,
      phone: String(raw['phone'] ?? '').trim() || undefined,
      SecondaryPhone: String(raw['SecondaryPhone'] ?? '').trim() || undefined,
      email: String(raw['email'] ?? '').trim() || undefined,
      secondaryEmail: String(raw['secondaryEmail'] ?? '').trim() || undefined,
      address: String(raw['address'] ?? '').trim() || undefined,
      vatId: String(raw['vatId'] ?? '').trim() || undefined,
      taxId: String(raw['taxId'] ?? '').trim() || undefined,
      ibanNumber: String(raw['ibanNumber'] ?? '').trim() || undefined,
    };
  });
}

export function downloadSupplierTemplate(): void {
  const sampleRows = [
    { supplierName: 'Supplier A', contactPerson: 'Raj', phone: '+1234567890', SecondaryPhone: 'info@supplierb.com', email: 'john@example.com', secondaryEmail: 'test@example.com', address: '123 Main St', vatId: 'VAT001', taxId: 'T179273', ibanNumber: 'GB29NWBK60161331926819' },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
  XLSX.writeFile(wb, 'bulk_suppliers_template.xlsx');
}

export function parseCategoryFile(file: File): Promise<SimpleParseResult> {
  return parseSimple(file, ['typeName', 'type'], (raw, errors) => {
    const typeName = String(raw['typeName'] ?? '').trim();
    const type = String(raw['type'] ?? '').trim();
    const validTypes = ['item', 'financial', 'group', 'quantityType', 'paymentType'];
    if (!typeName) errors.push('typeName is required');
    if (!type) errors.push('type is required');
    else if (!validTypes.includes(type)) errors.push(`type must be one of: ${validTypes.join(', ')}`);
    return {
      typeName,
      type,
      description: String(raw['description'] ?? '').trim() || undefined,
    };
  });
}

export function downloadCategoryTemplate(): void {
  const sampleRows = [
    { typeName: 'Cool drinks', type: 'item', description: 'All drink items' },
    { typeName: 'Rent', type: 'financial', description: '' },
    { typeName: 'chilly', type: 'group', description: '' },
    { typeName: 'bottle', type: 'quantityType', description: 'Weight unit' },
    { typeName: 'Cash', type: 'paymentType', description: '' },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Categories');
  XLSX.writeFile(wb, 'bulk_categories_template.xlsx');
}

export function parseTaxFile(file: File): Promise<SimpleParseResult> {
  return parseSimple(file, ['tax_name', 'taxPercentage'], (raw, errors) => {
    const tax_name = String(raw['tax_name'] ?? '').trim();
    const taxPercentage = Number(raw['taxPercentage']);
    if (!tax_name) errors.push('tax_name is required');
    if (isNaN(taxPercentage) || taxPercentage < 0) errors.push('taxPercentage must be a non-negative number');
    return {
      tax_name,
      taxPercentage,
      description: String(raw['description'] ?? '').trim() || undefined,
    };
  });
}

export function downloadTaxTemplate(): void {
  const sampleRows = [
    { tax_name: 'VAT 20%', taxPercentage: 20, description: 'Standard VAT' },
    { tax_name: 'VAT 5%', taxPercentage: 5, description: 'Reduced VAT' },
    { tax_name: 'Zero Rate', taxPercentage: 0, description: '' },
  ];
  const ws = XLSX.utils.json_to_sheet(sampleRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Taxes');
  XLSX.writeFile(wb, 'bulk_taxes_template.xlsx');
}
