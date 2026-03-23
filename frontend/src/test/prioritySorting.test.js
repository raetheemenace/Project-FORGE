import { describe, it, expect } from 'vitest';

describe('Ticket Priority Sorting', () => {
  it('should sort tickets by priority (Critical > High > Medium > Low > null) then by date', () => {
    const tickets = [
      { ticket_id: 1, priority: 'LOW', created_at: '2024-01-01T10:00:00Z' },
      { ticket_id: 2, priority: 'CRITICAL', created_at: '2024-01-02T10:00:00Z' },
      { ticket_id: 3, priority: null, created_at: '2024-01-03T10:00:00Z' },
      { ticket_id: 4, priority: 'HIGH', created_at: '2024-01-04T10:00:00Z' },
      { ticket_id: 5, priority: 'MEDIUM', created_at: '2024-01-05T10:00:00Z' },
      { ticket_id: 6, priority: 'CRITICAL', created_at: '2024-01-01T10:00:00Z' },
      { ticket_id: 7, priority: null, created_at: '2024-01-01T10:00:00Z' },
    ];

    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const sorted = tickets.sort((a, b) => {
      const aPriority = a.priority ? priorityOrder[a.priority] : 999;
      const bPriority = b.priority ? priorityOrder[b.priority] : 999;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Expected order: CRITICAL (newest first), HIGH, MEDIUM, LOW, null (newest first)
    expect(sorted[0].ticket_id).toBe(2); // CRITICAL, 2024-01-02
    expect(sorted[1].ticket_id).toBe(6); // CRITICAL, 2024-01-01
    expect(sorted[2].ticket_id).toBe(4); // HIGH, 2024-01-04
    expect(sorted[3].ticket_id).toBe(5); // MEDIUM, 2024-01-05
    expect(sorted[4].ticket_id).toBe(1); // LOW, 2024-01-01
    expect(sorted[5].ticket_id).toBe(3); // null, 2024-01-03
    expect(sorted[6].ticket_id).toBe(7); // null, 2024-01-01
  });

  it('should handle tickets with same priority sorted by date descending', () => {
    const tickets = [
      { ticket_id: 1, priority: 'HIGH', created_at: '2024-01-01T10:00:00Z' },
      { ticket_id: 2, priority: 'HIGH', created_at: '2024-01-03T10:00:00Z' },
      { ticket_id: 3, priority: 'HIGH', created_at: '2024-01-02T10:00:00Z' },
    ];

    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const sorted = tickets.sort((a, b) => {
      const aPriority = a.priority ? priorityOrder[a.priority] : 999;
      const bPriority = b.priority ? priorityOrder[b.priority] : 999;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    expect(sorted[0].ticket_id).toBe(2); // 2024-01-03 (newest)
    expect(sorted[1].ticket_id).toBe(3); // 2024-01-02
    expect(sorted[2].ticket_id).toBe(1); // 2024-01-01 (oldest)
  });

  it('should handle empty ticket array', () => {
    const tickets = [];
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const sorted = tickets.sort((a, b) => {
      const aPriority = a.priority ? priorityOrder[a.priority] : 999;
      const bPriority = b.priority ? priorityOrder[b.priority] : 999;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    expect(sorted).toEqual([]);
  });
});
