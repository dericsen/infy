import { MeasurementUnit } from '../types';

export interface ConversionResult {
  compatible: boolean;
  value: number;
  error?: string;
}

const MASS_TO_GRAMS: Record<string, number> = {
  kg: 1000,
  g: 1
};

const VOLUME_TO_ML: Record<string, number> = {
  L: 1000,
  ml: 1
};

export function areUnitsCompatible(fromUnit: MeasurementUnit, toUnit: MeasurementUnit): boolean {
  if (fromUnit === toUnit) return true;
  if (fromUnit in MASS_TO_GRAMS && toUnit in MASS_TO_GRAMS) return true;
  if (fromUnit in VOLUME_TO_ML && toUnit in VOLUME_TO_ML) return true;
  return false;
}

export function convertQuantity(
  quantity: number,
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit
): ConversionResult {
  if (!Number.isFinite(quantity) || quantity < 0) {
    return {
      compatible: false,
      value: 0,
      error: 'Quantity must be a valid non-negative number.'
    };
  }

  if (fromUnit === toUnit) {
    return {
      compatible: true,
      value: quantity
    };
  }

  if (fromUnit in MASS_TO_GRAMS && toUnit in MASS_TO_GRAMS) {
    const inGrams = quantity * MASS_TO_GRAMS[fromUnit];
    const converted = inGrams / MASS_TO_GRAMS[toUnit];
    return {
      compatible: true,
      value: Math.round(converted * 10000) / 10000
    };
  }

  if (fromUnit in VOLUME_TO_ML && toUnit in VOLUME_TO_ML) {
    const inMl = quantity * VOLUME_TO_ML[fromUnit];
    const converted = inMl / VOLUME_TO_ML[toUnit];
    return {
      compatible: true,
      value: Math.round(converted * 10000) / 10000
    };
  }

  return {
    compatible: false,
    value: 0,
    error: `Incompatible measurement units: cannot convert ${fromUnit} to ${toUnit}.`
  };
}
