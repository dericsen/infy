import * as XLSX from 'xlsx';
import { MenuItem, SaleRecord, Station } from '../types';
import { MultiDayForecastBundle } from '../engine/forecastingEngine';

export interface ParsedSalesUploadResult {
  validRecords: SaleRecord[];
  errors: string[];
  detectedDishes: string[];
  minDate: string | null;
  maxDate: string | null;
}

const VALID_STATIONS: Station[] = ['Grill', 'Saute', 'Garde Manger', 'Bakery'];

function detectDelimiter(headerLine: string): ',' | ';' | '\t' {
  const semicolons = (headerLine.match(/;/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  if (tabs > commas && tabs >= semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeHeader(h: string): string {
  return String(h || '').replace(/^\uFEFF/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

function inferDayFirstPreference(rawDates: string[]): boolean {
  for (const raw of rawDates) {
    const m = raw.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (!m) continue;
    const first = Number(m[1]);
    const second = Number(m[2]);
    if (first > 12) return true;
    if (second > 12) return false;
  }
  return true;
}

export function normalizeDateToIso(raw: string, preferDayFirst: boolean): string | null {
  const trimmed = raw.trim().split(/[T\s]/)[0];
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]);
    const d = Number(isoMatch[3]);
    if (!isValidCalendarDate(y, m, d)) return null;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const part1 = Number(dmyMatch[1]);
    const part2 = Number(dmyMatch[2]);
    const y = Number(dmyMatch[3]);
    let day = preferDayFirst ? part1 : part2;
    let month = preferDayFirst ? part2 : part1;
    if (month > 12 && day <= 12) {
      const tmp = month;
      month = day;
      day = tmp;
    }
    if (!isValidCalendarDate(y, month, day)) return null;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return null;
}

function formatCellAsDateString(cell: unknown): string {
  if (typeof cell === 'number' && Number.isFinite(cell) && cell > 20000 && cell < 90000) {
    const parsed = XLSX.SSF.parse_date_code(cell);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    const y = cell.getUTCFullYear();
    const m = cell.getUTCMonth() + 1;
    const d = cell.getUTCDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return String(cell ?? '').trim();
}

function slugifyDishId(name: string): string {
  return `dish_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'item'}`;
}

function parseTabularMatrix(
  headerRow: string[],
  rawRows: string[][],
  existingMenuItems: MenuItem[],
  restaurantId: string
): ParsedSalesUploadResult {
  const headers = headerRow.map(normalizeHeader);

  const idxDate = headers.findIndex(h =>
    ['date', 'tanggal', 'tgl', 'saledate', 'businessdate', 'orderdate', 'day'].includes(h)
  );
  const idxDishId = headers.findIndex(h =>
    ['menuitemid', 'dishid', 'itemid', 'sku', 'id'].includes(h)
  );
  const idxDishName = headers.findIndex(h =>
    ['dishname', 'dish', 'menuitem', 'menu', 'item', 'itemname', 'namamenu', 'nama', 'produk', 'product', 'name'].includes(h)
  );
  const idxStation = headers.findIndex(h =>
    ['station', 'section', 'kitchenstation', 'category', 'kategori'].includes(h)
  );
  const idxQty = headers.findIndex(h =>
    ['quantitysold', 'qty', 'quantity', 'sold', 'terjual', 'jumlah', 'portions', 'porsi', 'units'].includes(h)
  );
  const idxRevenue = headers.findIndex(h =>
    ['revenue', 'sales', 'total', 'amount', 'omzet', 'pendapatan'].includes(h)
  );
  const idxPeriod = headers.findIndex(h =>
    ['mealperiod', 'period', 'shift'].includes(h)
  );

  if (idxDate === -1 || idxQty === -1) {
    return {
      validRecords: [],
      errors: ['Missing required columns: expected at least a Date column (date / tanggal) and Quantity column (quantity_sold / qty / jumlah).'],
      detectedDishes: [],
      minDate: null,
      maxDate: null
    };
  }

  const rawDateSamples = rawRows.map(cols => cols[idxDate] || '').filter(Boolean);
  const preferDayFirst = inferDayFirstPreference(rawDateSamples);
  const menuById = new Map<string, MenuItem>(existingMenuItems.map(m => [m.id.toLowerCase(), m]));
  const menuByName = new Map<string, MenuItem>(existingMenuItems.map(m => [m.name.toLowerCase(), m]));

  const aggregated = new Map<string, SaleRecord>();
  const errors: string[] = [];
  const dishNamesSet = new Set<string>();
  let minDate: string | null = null;
  let maxDate: string | null = null;

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2;
    const cols = rawRows[i];
    if (cols.every(c => !String(c || '').trim())) continue;

    const isoDate = normalizeDateToIso(cols[idxDate] || '', preferDayFirst);

    if (!isoDate) {
      errors.push(`Row ${rowNumber}: Invalid date "${cols[idxDate] || ''}". Expected YYYY-MM-DD or DD/MM/YYYY.`);
      continue;
    }

    const rawQtyStr = (cols[idxQty] || '').replace(/[^0-9.,-]/g, '').replace(',', '.');
    const qtyNum = Number(rawQtyStr);
    if (!Number.isFinite(qtyNum) || qtyNum < 0) {
      errors.push(`Row ${rowNumber}: Invalid quantity "${cols[idxQty] || ''}".`);
      continue;
    }

    const rawDishId = idxDishId >= 0 ? (cols[idxDishId] || '').trim() : '';
    const rawDishName = idxDishName >= 0 ? (cols[idxDishName] || '').trim() : '';
    const matchedDish =
      (rawDishId ? menuById.get(rawDishId.toLowerCase()) : undefined) ||
      (rawDishName ? menuByName.get(rawDishName.toLowerCase()) : undefined);

    const dishName = matchedDish?.name || rawDishName || (rawDishId || 'All Menu Items');
    const menuItemId = matchedDish?.id || rawDishId || slugifyDishId(dishName);

    const rawStation = idxStation >= 0 ? (cols[idxStation] || '').trim() : '';
    const station: Station = VALID_STATIONS.includes(rawStation as Station)
      ? (rawStation as Station)
      : matchedDish?.station || 'Grill';

    const rawRevStr = idxRevenue >= 0 ? (cols[idxRevenue] || '').replace(/[^0-9.,-]/g, '').replace(',', '.') : '';
    const parsedRev = rawRevStr ? Number(rawRevStr) : NaN;
    const revenue = Number.isFinite(parsedRev) && parsedRev >= 0
      ? Math.round(parsedRev * 100) / 100
      : Math.round(qtyNum * (matchedDish?.sellingPrice || 15) * 100) / 100;

    const rawPeriod = idxPeriod >= 0 ? (cols[idxPeriod] || '').trim() : 'All Day';
    const mealPeriod: 'All Day' | 'Lunch' | 'Dinner' =
      rawPeriod === 'Lunch' || rawPeriod === 'Dinner' ? rawPeriod : 'All Day';

    const dedupeKey = `${isoDate}__${menuItemId}__${mealPeriod}`;
    const existing = aggregated.get(dedupeKey);
    const roundedQty = Math.round(qtyNum);

    if (existing) {
      existing.quantitySold += roundedQty;
      existing.revenue = Math.round((existing.revenue + revenue) * 100) / 100;
    } else {
      aggregated.set(dedupeKey, {
        id: `csv_${isoDate}_${menuItemId}_${mealPeriod.replace(/\s+/g, '')}`,
        restaurantId,
        date: isoDate,
        dayOfWeek: new Date(isoDate).getUTCDay(),
        menuItemId,
        dishName,
        station,
        quantitySold: roundedQty,
        revenue,
        mealPeriod,
        weatherCondition: 'Clear',
        temperatureC: 20,
        eventTag: 'File Upload',
        isDemonstrationData: false
      });
    }

    dishNamesSet.add(dishName);
    if (!minDate || isoDate < minDate) minDate = isoDate;
    if (!maxDate || isoDate > maxDate) maxDate = isoDate;
  }

  const validRecords = Array.from(aggregated.values()).sort((a, b) => b.date.localeCompare(a.date));

  return {
    validRecords,
    errors,
    detectedDishes: Array.from(dishNamesSet),
    minDate,
    maxDate
  };
}

export function parseUploadedSalesCsv(
  csvText: string,
  existingMenuItems: MenuItem[],
  restaurantId: string = 'rst_rustic_table'
): ParsedSalesUploadResult {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const lines = cleanText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      validRecords: [],
      errors: ['CSV must include a header row and at least one sales row.'],
      detectedDishes: [],
      minDate: null,
      maxDate: null
    };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerRow = splitDelimitedLine(lines[0], delimiter);
  const rawRows = lines.slice(1).map(line => splitDelimitedLine(line, delimiter));

  return parseTabularMatrix(headerRow, rawRows, existingMenuItems, restaurantId);
}

export function parseUploadedExcelWorkbook(
  buffer: ArrayBuffer,
  existingMenuItems: MenuItem[],
  restaurantId: string = 'rst_rustic_table'
): ParsedSalesUploadResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return {
      validRecords: [],
      errors: ['Excel workbook does not contain any worksheet.'],
      detectedDishes: [],
      minDate: null,
      maxDate: null
    };
  }

  const sheet = workbook.Sheets[firstSheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '' });
  if (matrix.length < 2) {
    return {
      validRecords: [],
      errors: ['Excel sheet must include a header row and at least one sales row.'],
      detectedDishes: [],
      minDate: null,
      maxDate: null
    };
  }

  const headerRow = matrix[0].map(cell => String(cell ?? '').trim());
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const dateColIdx = normalizedHeaders.findIndex(h =>
    ['date', 'tanggal', 'tgl', 'saledate', 'businessdate', 'orderdate', 'day'].includes(h)
  );

  const rawRows = matrix.slice(1).map(row =>
    row.map((cell, colIdx) => (colIdx === dateColIdx ? formatCellAsDateString(cell) : String(cell ?? '').trim()))
  );

  return parseTabularMatrix(headerRow, rawRows, existingMenuItems, restaurantId);
}

function escapeCsvField(val: string | number | boolean): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeMultiDayForecastCsv(bundle: MultiDayForecastBundle): string {
  const header = [
    'dish_name',
    'station',
    'historical_avg',
    ...bundle.days.map(d => `${d.date}_expected`),
    ...bundle.days.map(d => `${d.date}_recommended_prep`),
    'total_expected',
    'total_recommended_prep'
  ].join(',');

  const rows = bundle.dishMatrices.map(row =>
    [
      row.dishName,
      row.station,
      row.historicalAvg,
      ...row.dailyResults.map(r => r.expectedSales),
      ...row.dailyResults.map(r => r.recommendedPrep),
      row.totalHorizonExpected,
      row.totalHorizonPrep
    ]
      .map(escapeCsvField)
      .join(',')
  );

  return [header, ...rows].join('\n');
}

export function buildSampleSalesRows(endDate: string = '2026-11-12'): {
  date: string;
  dish_name: string;
  station: Station;
  quantity_sold: number;
  revenue: number;
}[] {
  const sampleDishes: { name: string; station: Station; weekday: number; weekend: number; price: number }[] = [
    { name: 'Nasi Goreng Kampung', station: 'Saute', weekday: 42, weekend: 62, price: 6.5 },
    { name: 'Ayam Bakar Madu', station: 'Grill', weekday: 35, weekend: 54, price: 7.5 },
    { name: 'Salmon Panggang', station: 'Grill', weekday: 18, weekend: 29, price: 14.0 },
    { name: 'Caesar Salad', station: 'Garde Manger', weekday: 24, weekend: 31, price: 5.5 },
    { name: 'Roti Sourdough', station: 'Bakery', weekday: 22, weekend: 38, price: 4.5 }
  ];

  const rows: {
    date: string;
    dish_name: string;
    station: Station;
    quantity_sold: number;
    revenue: number;
  }[] = [];

  const end = new Date(`${endDate}T00:00:00Z`);
  const totalDays = 730;

  for (let offset = totalDays - 1; offset >= 0; offset--) {
    const d = new Date(end);
    d.setUTCDate(d.getUTCDate() - offset);
    const iso = d.toISOString().split('T')[0];
    const dow = d.getUTCDay();
    const month = d.getUTCMonth();
    const isWeekend = dow === 5 || dow === 6 || dow === 0;
    const seasonalBump = month === 10 || month === 11 ? 1.12 : month === 6 || month === 7 ? 1.06 : 0.96;

    for (let j = 0; j < sampleDishes.length; j++) {
      const dish = sampleDishes[j];
      const base = isWeekend ? dish.weekend : dish.weekday;
      const noise = (((offset * 13 + j * 7) % 7) - 3) * 0.03;
      const qty = Math.max(3, Math.round(base * seasonalBump * (1 + noise)));
      const rev = Math.round(qty * dish.price * 100) / 100;
      rows.push({
        date: iso,
        dish_name: dish.name,
        station: dish.station,
        quantity_sold: qty,
        revenue: rev
      });
    }
  }

  return rows;
}

export function generateSampleMultiYearCsv(endDate: string = '2026-11-12'): string {
  const rows = buildSampleSalesRows(endDate);
  const lines = ['date,dish_name,station,quantity_sold,revenue'];
  for (const r of rows) {
    lines.push(`${r.date},${escapeCsvField(r.dish_name)},${r.station},${r.quantity_sold},${r.revenue.toFixed(2)}`);
  }
  return lines.join('\n');
}

export function buildSampleMultiYearWorkbook(endDate: string = '2026-11-12'): XLSX.WorkBook {
  const rows = buildSampleSalesRows(endDate);
  const wb = XLSX.utils.book_new();

  const dataSheet = XLSX.utils.json_to_sheet(rows);
  dataSheet['!cols'] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 16 },
    { wch: 15 },
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Data Penjualan');

  const guideRows = [
    { Kolom: 'date', Wajib: 'Ya', Keterangan: 'Tanggal penjualan (YYYY-MM-DD atau DD/MM/YYYY)' },
    { Kolom: 'dish_name', Wajib: 'Opsional', Keterangan: 'Nama menu/hidangan (bisa juga pakai kolom menu/item)' },
    { Kolom: 'quantity_sold', Wajib: 'Ya', Keterangan: 'Jumlah porsi terjual pada tanggal tersebut' },
    { Kolom: 'station', Wajib: 'Opsional', Keterangan: 'Grill, Saute, Garde Manger, atau Bakery' },
    { Kolom: 'revenue', Wajib: 'Opsional', Keterangan: 'Total omzet penjualan menu pada tanggal tersebut' }
  ];
  const guideSheet = XLSX.utils.json_to_sheet(guideRows);
  guideSheet['!cols'] = [{ wch: 16 }, { wch: 12 }, { wch: 52 }];
  XLSX.utils.book_append_sheet(wb, guideSheet, 'Panduan Format');

  return wb;
}

export function downloadSampleExcelWorkbook(filename: string = 'contoh_data_penjualan_restoran.xlsx'): void {
  const wb = buildSampleMultiYearWorkbook('2026-11-12');
  XLSX.writeFile(wb, filename);
}
