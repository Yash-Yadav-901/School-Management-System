import { describe, it, expect } from 'vitest';
import { formatPaiseToRupees, parseRupeesToPaise } from './formatCurrency.js';

describe('formatPaiseToRupees', () => {
  it('formats zero paise correctly', () => {
    expect(formatPaiseToRupees(0)).toBe('₹0.00');
    expect(formatPaiseToRupees(0, { showSymbol: false })).toBe('0.00');
  });

  it('formats fractional rupees (under 100 paise)', () => {
    expect(formatPaiseToRupees(1)).toBe('₹0.01');
    expect(formatPaiseToRupees(50)).toBe('₹0.50');
    expect(formatPaiseToRupees(99)).toBe('₹0.99');
  });

  it('formats exact whole rupees', () => {
    expect(formatPaiseToRupees(100)).toBe('₹1.00');
    expect(formatPaiseToRupees(50000)).toBe('₹500.00');
    expect(formatPaiseToRupees(150000)).toBe('₹1,500.00');
  });

  it('formats large amounts with Indian numbering grouping', () => {
    // 100,000 rupees = 10,000,000 paise -> 1,00,000.00
    expect(formatPaiseToRupees(10000000)).toBe('₹1,00,000.00');
  });

  it('handles negative paise gracefully', () => {
    expect(formatPaiseToRupees(-5000)).toBe('-₹50.00');
    expect(formatPaiseToRupees(-5000, { showSymbol: false })).toBe('-50.00');
  });

  it('handles string input and invalid/null values safely', () => {
    expect(formatPaiseToRupees('60000')).toBe('₹600.00');
    expect(formatPaiseToRupees(null)).toBe('₹0.00');
    expect(formatPaiseToRupees(undefined)).toBe('₹0.00');
    expect(formatPaiseToRupees('invalid')).toBe('₹0.00');
  });
});

describe('parseRupeesToPaise', () => {
  it('converts rupee strings to integer paise', () => {
    expect(parseRupeesToPaise('500')).toBe(50000);
    expect(parseRupeesToPaise('500.50')).toBe(50050);
    expect(parseRupeesToPaise('0.99')).toBe(99);
    expect(parseRupeesToPaise('1,500.00')).toBe(150000);
  });

  it('handles empty and invalid input by returning 0', () => {
    expect(parseRupeesToPaise('')).toBe(0);
    expect(parseRupeesToPaise(null)).toBe(0);
    expect(parseRupeesToPaise('abc')).toBe(0);
  });
});
