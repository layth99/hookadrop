/**
 * Unit tests for dateRange utilities
 * 
 * To run these tests, you'll need to set up a test framework:
 * npm install --save-dev vitest @testing-library/react
 * 
 * Then add to package.json:
 * "scripts": { "test": "vitest" }
 */

import { describe, it, expect } from 'vitest'
import {
  resolveRange,
  validateCustomRange,
  getGranularity,
  groupByGranularity,
  getPreviousPeriod,
  calculateChange
} from './dateRange'
import { subDays, addDays, startOfMonth, endOfMonth, addMonths } from 'date-fns'

describe('resolveRange', () => {
  const today = new Date('2026-10-22')
  
  it('resolves 7D preset', () => {
    const result = resolveRange('7D')
    expect(result.label).toBe('Last 7 days')
    // Should be 6 days ago to today (7 days total)
  })
  
  it('resolves 30D preset', () => {
    const result = resolveRange('30D')
    expect(result.label).toBe('Last 30 days')
  })
  
  it('resolves 90D preset', () => {
    const result = resolveRange('90D')
    expect(result.label).toBe('Last 90 days')
  })
  
  it('resolves thisMonth preset', () => {
    const result = resolveRange('thisMonth')
    expect(result.label).toContain('2026') // Should show current month/year
  })
  
  it('resolves lastMonth preset', () => {
    const result = resolveRange('lastMonth')
    expect(result.label).toContain('2026') // Should show previous month
  })
  
  it('resolves custom range', () => {
    const from = new Date('2026-10-01')
    const to = new Date('2026-10-15')
    const result = resolveRange('custom', { from, to })
    expect(result.from).toBeDefined()
    expect(result.to).toBeDefined()
    expect(result.label).toContain('Oct')
  })
  
  it('falls back to 7D for invalid preset', () => {
    const result = resolveRange('invalid')
    expect(result.label).toBe('Last 7 days')
  })
  
  it('handles ISO string dates in custom range', () => {
    const result = resolveRange('custom', {
      from: '2026-10-01',
      to: '2026-10-15'
    })
    expect(result.from).toBeInstanceOf(Date)
    expect(result.to).toBeInstanceOf(Date)
  })
})

describe('validateCustomRange', () => {
  it('validates correct range', () => {
    const from = new Date('2026-10-01')
    const to = new Date('2026-10-15')
    const result = validateCustomRange(from, to)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })
  
  it('rejects missing dates', () => {
    const result = validateCustomRange(null, null)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Both dates are required')
  })
  
  it('rejects start date after end date', () => {
    const from = new Date('2026-10-15')
    const to = new Date('2026-10-01')
    const result = validateCustomRange(from, to)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Start date must be before end date')
  })
  
  it('rejects future end date', () => {
    const from = new Date('2026-10-01')
    const to = addDays(new Date(), 10) // 10 days in the future
    const result = validateCustomRange(from, to)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('End date cannot be in the future')
  })
  
  it('rejects range > 365 days', () => {
    const from = new Date('2025-01-01')
    const to = new Date('2026-12-31')
    const result = validateCustomRange(from, to)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Maximum range is 1 year')
  })
})

describe('getGranularity', () => {
  it('returns "day" for range ≤ 31 days', () => {
    const from = new Date('2026-10-01')
    const to = new Date('2026-10-15') // 14 days
    expect(getGranularity(from, to)).toBe('day')
  })
  
  it('returns "day" for exactly 31 days', () => {
    const from = new Date('2026-10-01')
    const to = new Date('2026-10-31') // 30 days
    expect(getGranularity(from, to)).toBe('day')
  })
  
  it('returns "week" for 32-120 days', () => {
    const from = new Date('2026-07-01')
    const to = new Date('2026-09-30') // ~90 days
    expect(getGranularity(from, to)).toBe('week')
  })
  
  it('returns "month" for > 120 days', () => {
    const from = new Date('2026-01-01')
    const to = new Date('2026-12-31') // ~365 days
    expect(getGranularity(from, to)).toBe('month')
  })
})

describe('groupByGranularity', () => {
  const orders = [
    { createdAt: '2026-10-16T10:00:00Z', totalPrice: 100 },
    { createdAt: '2026-10-16T14:00:00Z', totalPrice: 50 },
    { createdAt: '2026-10-18T09:00:00Z', totalPrice: 200 },
  ]
  
  it('groups by day with zero-filling', () => {
    const from = new Date('2026-10-16')
    const to = new Date('2026-10-18')
    const result = groupByGranularity(orders, from, to, 'day')
    
    expect(result).toHaveLength(3)
    expect(result[0].revenue).toBe(150) // Oct 16: 100 + 50
    expect(result[0].orders).toBe(2)
    expect(result[1].revenue).toBe(0) // Oct 17: no orders
    expect(result[1].orders).toBe(0)
    expect(result[2].revenue).toBe(200) // Oct 18: 200
    expect(result[2].orders).toBe(1)
  })
  
  it('handles empty orders array', () => {
    const from = new Date('2026-10-16')
    const to = new Date('2026-10-18')
    const result = groupByGranularity([], from, to, 'day')
    
    expect(result).toHaveLength(3)
    expect(result.every(d => d.revenue === 0 && d.orders === 0)).toBe(true)
  })
  
  it('groups by week', () => {
    const from = new Date('2026-10-01')
    const to = new Date('2026-10-31')
    const result = groupByGranularity(orders, from, to, 'week')
    
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('label')
    expect(result[0].label).toContain('–') // Week range format
  })
  
  it('groups by month', () => {
    const from = new Date('2026-01-01')
    const to = new Date('2026-03-31')
    const result = groupByGranularity(orders, from, to, 'month')
    
    expect(result).toHaveLength(3) // Jan, Feb, Mar
    expect(result[0].label).toContain('2026')
  })
})

describe('getPreviousPeriod', () => {
  it('calculates previous 7-day period', () => {
    const from = new Date('2026-10-16')
    const to = new Date('2026-10-22')
    const prev = getPreviousPeriod(from, to)
    
    // Previous period should be Oct 9-15 (7 days before)
    expect(prev.from.getDate()).toBe(9)
    expect(prev.to.getDate()).toBe(15)
  })
  
  it('calculates previous 30-day period', () => {
    const from = new Date('2026-10-01')
    const to = new Date('2026-10-30')
    const prev = getPreviousPeriod(from, to)
    
    // Should be ~30 days before
    expect(prev.from.getMonth()).toBe(8) // September
  })
  
  it('handles single-day range', () => {
    const from = new Date('2026-10-22')
    const to = new Date('2026-10-22')
    const prev = getPreviousPeriod(from, to)
    
    expect(prev.from.getDate()).toBe(21)
    expect(prev.to.getDate()).toBe(21)
  })
})

describe('calculateChange', () => {
  it('calculates positive change', () => {
    const change = calculateChange(120, 100)
    expect(change).toBe(20) // +20%
  })
  
  it('calculates negative change', () => {
    const change = calculateChange(80, 100)
    expect(change).toBe(-20) // -20%
  })
  
  it('handles zero previous value', () => {
    const change = calculateChange(100, 0)
    expect(change).toBe(100) // 100% increase from zero
  })
  
  it('handles zero current and previous', () => {
    const change = calculateChange(0, 0)
    expect(change).toBe(0)
  })
  
  it('handles decline to zero', () => {
    const change = calculateChange(0, 100)
    expect(change).toBe(-100) // -100%
  })
})
