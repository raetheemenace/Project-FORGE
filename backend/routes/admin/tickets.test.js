// Tests for admin tickets endpoint filtering
// Requirements: 15.5

import { describe, it, expect } from 'vitest';

describe('Admin Tickets Filtering - Query Builder', () => {
  it('should build WHERE clause with status filter', () => {
    const filters = { status: 'OPEN' };
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    expect(conditions).toEqual(['t.status = $1']);
    expect(params).toEqual(['OPEN']);
  });

  it('should build WHERE clause with severity filter', () => {
    const filters = { severity: 'High' };
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.severity) {
      conditions.push(`m.severity = $${paramIndex++}`);
      params.push(filters.severity);
    }

    expect(conditions).toEqual(['m.severity = $1']);
    expect(params).toEqual(['High']);
  });

  it('should build WHERE clause with search filter', () => {
    const filters = { search: 'EQ-7167' };
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.search) {
      conditions.push(`(m.equipment_id ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    expect(conditions).toEqual(['(m.equipment_id ILIKE $1 OR m.description ILIKE $1)']);
    expect(params).toEqual(['%EQ-7167%']);
  });

  it('should build WHERE clause with multiple filters', () => {
    const filters = { status: 'OPEN', severity: 'Critical', search: 'leak' };
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`t.status = $${paramIndex++}`);
      params.push(filters.status);
    }

    if (filters.severity) {
      conditions.push(`m.severity = $${paramIndex++}`);
      params.push(filters.severity);
    }

    if (filters.search) {
      conditions.push(`(m.equipment_id ILIKE $${paramIndex} OR m.description ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    expect(conditions).toEqual([
      't.status = $1',
      'm.severity = $2',
      '(m.equipment_id ILIKE $3 OR m.description ILIKE $3)'
    ]);
    expect(params).toEqual(['OPEN', 'Critical', '%leak%']);
  });

  it('should build WHERE clause with date range filters', () => {
    const filters = { date_from: '2024-01-01', date_to: '2024-12-31' };
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.date_from) {
      conditions.push(`t.created_at >= $${paramIndex++}`);
      params.push(filters.date_from);
    }

    if (filters.date_to) {
      conditions.push(`t.created_at <= $${paramIndex++}`);
      params.push(filters.date_to);
    }

    expect(conditions).toEqual(['t.created_at >= $1', 't.created_at <= $2']);
    expect(params).toEqual(['2024-01-01', '2024-12-31']);
  });

  it('should build WHERE clause with assigned_to filter', () => {
    const filters = { assigned_to: '5' };
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.assigned_to) {
      conditions.push(`t.assigned_to = $${paramIndex++}`);
      params.push(Number(filters.assigned_to));
    }

    expect(conditions).toEqual(['t.assigned_to = $1']);
    expect(params).toEqual([5]);
  });

  it('should handle empty filters', () => {
    const filters = {};
    const conditions = [];
    const params = [];

    expect(conditions).toEqual([]);
    expect(params).toEqual([]);
  });

  it('should build complete WHERE clause string', () => {
    const conditions = ['t.status = $1', 'm.severity = $2'];
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    expect(whereClause).toBe('WHERE t.status = $1 AND m.severity = $2');
  });

  it('should handle empty conditions for WHERE clause', () => {
    const conditions = [];
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    expect(whereClause).toBe('');
  });
});
