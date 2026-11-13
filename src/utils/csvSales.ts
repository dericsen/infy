import { MenuItem, SaleRecord, Station } from '../types';
import { getDayOfWeekFromIso, isValidIsoDate } from '../engine/forecastingEngine';
import { PrepSheetDecompositionResult } from '../engine/prepEngine';

export interface CsvParseError {
  rowNumber: number;
  message: string;
}

export interface CsvParseResult {
  validRecords: SaleRecord[];
  errors: CsvParseError[];
}

function splitCsvLine(line: string): string[] {
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
    } else if (char === ',' && !inQuotes) {
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
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const VALID_STATIONS: Station[] = ['Grill', 'Saute', 'Garde Manger', 'Bakery'];

export function parseSalesCsv(
  csvText: string,
  menuItems: MenuItem[],
  restaurantId: string = 'rst_rustic_table'
): CsvParseResult {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      validRecords: [],
      errors: [{ rowNumber: 1, message: 'CSV file must contain a header row and at least one data row.' }]
    };
  }

  const rawHeaders = splitCsvLine(lines[0]).map(normalizeHeader);
  const idxDate = rawHeaders.findIndex(h => h === 'date' || h === 'businessdate' || h === 'saledate');
  const idxDishId = rawHeaders.findIndex(h => h === 'menuitemid' || h === 'dishid' || h === 'id');
  const idxDishName = rawHeaders.findIndex(h => h === 'dishname' || h === 'dish' || h === 'menuitem' || h === 'name');
  const idxStation = rawHeaders.findIndex(h => h === 'station');
  const idxQty = rawHeaders.findIndex(h => h === 'quantitysold' || h === 'qty' || h === 'quantity' || h === 'sold');
  const idxRevenue = rawHeaders.findIndex(h => h === 'revenue' || h === 'sales' || h === 'amount');
  const idxPeriod = rawHeaders.findIndex(h => h === 'mealperiod' || h === 'period' || h === 'shift');
  const idxWeather = rawHeaders.findIndex(h => h === 'weathercondition' || h === 'weather');
  const idxTemp = rawHeaders.findIndex(h => h === 'temperaturec' || h === 'tempc' || h === 'temperature');
  const idxEvent = rawHeaders.findIndex(h => h === 'eventtag' || h === 'event');

  if (idxDate === -1 || idxQty === -1 || (idxDishId === -1 && idxDishName === -1)) {
    return {
      validRecords: [],
      errors: [
        {
          rowNumber: 1,
          message: 'Missing required CSV columns. Expected at least date, quantity_sold, and menu_item_id or dish_name.'
        }
      ]
    };
  }

  const menuById = new Map<string, MenuItem>(menuItems.map(m => [m.id.toLowerCase(), m]));
  const menuByName = new Map<string, MenuItem>(menuItems.map(m => [m.name.toLowerCase(), m]));

  const validRecords: SaleRecord[] = [];
  const errors: CsvParseError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cols = splitCsvLine(lines[i]);
    const dateVal = (cols[idxDate] || '').trim();

    if (!isValidIsoDate(dateVal)) {
      errors.push({ rowNumber: rowNum, message: `Invalid ISO date "${dateVal}". Expected YYYY-MM-DD.` });
      continue;
    }

    const rawDishId = idxDishId >= 0 ? (cols[idxDishId] || '').trim() : '';
    const rawDishName = idxDishName >= 0 ? (cols[idxDishName] || '').trim() : '';
    const matchedDish =
      (rawDishId ? menuById.get(rawDishId.toLowerCase()) : undefined) ||
      (rawDishName ? menuByName.get(rawDishName.toLowerCase()) : undefined);

    if (!matchedDish && !rawDishName) {
      errors.push({ rowNumber: rowNum, message: 'Row is missing a valid menu item ID or dish name.' });
      continue;
    }

    const qtyNum = Number(cols[idxQty]);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      errors.push({ rowNumber: rowNum, message: `Invalid quantity_sold "${cols[idxQty] || ''}". Must be > 0.` });
      continue;
    }

    const rawStation = idxStation >= 0 ? (cols[idxStation] || '').trim() : '';
    const station: Station = VALID_STATIONS.includes(rawStation as Station)
      ? (rawStation as Station)
      : matchedDish?.station || 'Grill';

    const parsedRev = idxRevenue >= 0 ? Number(cols[idxRevenue]) : NaN;
    const revenue = Number.isFinite(parsedRev) && parsedRev >= 0
      ? Math.round(parsedRev * 100) / 100
      : Math.round(qtyNum * (matchedDish?.sellingPrice || 15) * 100) / 100;

    const rawPeriod = idxPeriod >= 0 ? (cols[idxPeriod] || '').trim() : 'All Day';
    const mealPeriod: 'All Day' | 'Lunch' | 'Dinner' =
      rawPeriod === 'Lunch' || rawPeriod === 'Dinner' ? rawPeriod : 'All Day';

    const weatherCondition = idxWeather >= 0 && cols[idxWeather] ? cols[idxWeather].trim() : 'Clear';
    const tempVal = idxTemp >= 0 ? Number(cols[idxTemp]) : NaN;
    const temperatureC = Number.isFinite(tempVal) ? tempVal : 20;
    const eventTag = idxEvent >= 0 && cols[idxEvent] ? cols[idxEvent].trim() : 'CSV Import';

    const menuItemId = matchedDish?.id || rawDishId || `custom_${rawDishName.toLowerCase().replace(/\s+/g, '_')}`;
    const dishName = matchedDish?.name || rawDishName;

    validRecords.push({
      id: `csv_${dateVal}_${menuItemId}_${i}`,
      restaurantId,
      date: dateVal,
      dayOfWeek: getDayOfWeekFromIso(dateVal),
      menuItemId,
      dishName,
      station,
      quantitySold: Math.round(qtyNum),
      revenue,
      mealPeriod,
      weatherCondition,
      temperatureC,
      eventTag,
      isDemonstrationData: false
    });
  }

  return { validRecords, errors };
}

function escapeCsvField(val: string | number | boolean): string {
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function serializeSalesToCsv(records: SaleRecord[]): string {
  const header = [
    'date',
    'menu_item_id',
    'dish_name',
    'station',
    'quantity_sold',
    'revenue',
    'meal_period',
    'weather_condition',
    'temperature_c',
    'event_tag',
    'is_demonstration_data'
  ].join(',');

  const rows = records.map(r =>
    [
      r.date,
      r.menuItemId,
      r.dishName,
      r.station,
      r.quantitySold,
      r.revenue.toFixed(2),
      r.mealPeriod,
      r.weatherCondition,
      r.temperatureC,
      r.eventTag,
      r.isDemonstrationData
    ]
      .map(escapeCsvField)
      .join(',')
  );

  return [header, ...rows].join('\n');
}

export function serializePrepSheetToCsv(decomposition: PrepSheetDecompositionResult): string {
  const dishHeader = [
    'section',
    'business_date',
    'station',
    'item_name',
    'base_forecast',
    'expected_sales',
    'recommended_prep',
    'effective_prep_par',
    'unit',
    'current_stock',
    'net_required',
    'status'
  ].join(',');

  const dishRows = decomposition.dishPlans.map(d =>
    [
      'DISH_PREP',
      decomposition.businessDate,
      d.station,
      d.dishName,
      d.baseForecast,
      d.expectedSales,
      d.recommendedPrep,
      d.effectivePrep,
      'portions',
      '',
      '',
      d.riskOfWaste
    ]
      .map(escapeCsvField)
      .join(',')
  );

  const ingRows = decomposition.aggregatedIngredients.map(i =>
    [
      'INGREDIENT_REQ',
      decomposition.businessDate,
      i.category,
      i.ingredientName,
      '',
      '',
      i.grossRequired,
      i.grossRequired,
      i.stockUnit,
      i.currentStock,
      i.netRequired,
      i.isShortage ? 'SHORTAGE' : 'COVERED'
    ]
      .map(escapeCsvField)
      .join(',')
  );

  return [dishHeader, ...dishRows, ...ingRows].join('\n');
}
