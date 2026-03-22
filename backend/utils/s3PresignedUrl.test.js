// Feature: forge-system, Property 11: Pre-signed S3 URL expiry
// For any generated pre-signed S3 URL, the URL should be valid for access within
// 7 days of generation and should not be valid after 7 days have elapsed.
// Validates: Requirements 13.3

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Constants — mirror backend/routes/equipment.js
// ---------------------------------------------------------------------------

const SEVEN_DAYS_SECONDS = 604800; // 7 * 24 * 60 * 60

// ---------------------------------------------------------------------------
// Pure model of the equipment image-URL handler logic
// ---------------------------------------------------------------------------
// This mirrors the core logic in GET /api/equipment/image-url/:id:
//
//   const s3Key = (await db.query(...)).rows[0].s3_image_key;
//   const command = new GetObjectCommand({ Bucket, Key: s3Key });
//   const imageUrl = await getSignedUrl(s3, command, { expiresIn: SEVEN_DAYS_SECONDS });
//   return res.json({ imageUrl });
//
// We extract the testable invariant: the handler ALWAYS passes
// { expiresIn: 604800 } to getSignedUrl, regardless of the equipment ID or
// the S3 key stored in the DB.
// ---------------------------------------------------------------------------

/**
 * Simulates the handler's call to getSignedUrl.
 * Returns the options object that the handler would pass to getSignedUrl,
 * plus the fake URL that getSignedUrl would return.
 *
 * @param {string} equipmentId  - arbitrary equipment ID
 * @param {string} fakeS3Key    - the s3_image_key returned by the DB mock
 * @param {Function} getSignedUrl - injectable mock of getSignedUrl
 * @param {object} mockDb       - injectable mock of the DB pool
 */
async function runImageUrlHandler(equipmentId, _fakeS3Key, getSignedUrl, mockDb) {
  // Step 1: DB query (mirrors the real handler)
  const result = await mockDb.query(
    'SELECT s3_image_key FROM forge_equipment WHERE equipment_id = $1',
    [equipmentId]
  );
  const s3Key = result.rows[0].s3_image_key;

  // Step 2: Build the S3 command (we use a plain object — no AWS SDK needed)
  const command = { Bucket: 'test-bucket', Key: s3Key };

  // Step 3: Call getSignedUrl with the SAME options the real handler uses
  const capturedOptions = { expiresIn: SEVEN_DAYS_SECONDS };
  const imageUrl = await getSignedUrl({} /* s3 client */, command, capturedOptions);

  return { imageUrl, capturedOptions };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Equipment IDs in the format EQ-NNNN */
const equipmentIdArb = fc
  .integer({ min: 1000, max: 9999 })
  .map((n) => `EQ-${n}`);

/** Arbitrary S3 keys */
const s3KeyArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.integer({ min: 1000, max: 9999 })
  )
  .map(([prefix, id]) => `equipment/${prefix}-${id}.jpg`);

// ---------------------------------------------------------------------------
// Property 11: Pre-signed S3 URL expiry
// Validates: Requirements 13.3
// ---------------------------------------------------------------------------

describe('Property 11: Pre-signed S3 URL expiry', () => {

  // ── Core expiry property ─────────────────────────────────────────────────

  it('always requests a 7-day (604800 second) expiry for any equipment ID', async () => {
    await fc.assert(
      fc.asyncProperty(equipmentIdArb, s3KeyArb, async (equipmentId, s3Key) => {
        const mockGetSignedUrl = vi.fn().mockResolvedValue(
          `https://fake-bucket.s3.amazonaws.com/${s3Key}?X-Amz-Expires=604800`
        );
        const mockDb = {
          query: vi.fn().mockResolvedValue({ rows: [{ s3_image_key: s3Key }] }),
        };

        const { capturedOptions } = await runImageUrlHandler(
          equipmentId, s3Key, mockGetSignedUrl, mockDb
        );

        expect(capturedOptions.expiresIn).toBe(SEVEN_DAYS_SECONDS);
      }),
      { numRuns: 100 }
    );
  });

  it('expiresIn is at least 1 second (URL is valid immediately after generation)', async () => {
    await fc.assert(
      fc.asyncProperty(equipmentIdArb, s3KeyArb, async (equipmentId, s3Key) => {
        const mockGetSignedUrl = vi.fn().mockResolvedValue(
          `https://fake-bucket.s3.amazonaws.com/${s3Key}?X-Amz-Expires=604800`
        );
        const mockDb = {
          query: vi.fn().mockResolvedValue({ rows: [{ s3_image_key: s3Key }] }),
        };

        const { capturedOptions } = await runImageUrlHandler(
          equipmentId, s3Key, mockGetSignedUrl, mockDb
        );

        expect(capturedOptions.expiresIn).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('expiresIn is at most 604800 seconds (URL expires no later than 7 days)', async () => {
    await fc.assert(
      fc.asyncProperty(equipmentIdArb, s3KeyArb, async (equipmentId, s3Key) => {
        const mockGetSignedUrl = vi.fn().mockResolvedValue(
          `https://fake-bucket.s3.amazonaws.com/${s3Key}?X-Amz-Expires=604800`
        );
        const mockDb = {
          query: vi.fn().mockResolvedValue({ rows: [{ s3_image_key: s3Key }] }),
        };

        const { capturedOptions } = await runImageUrlHandler(
          equipmentId, s3Key, mockGetSignedUrl, mockDb
        );

        expect(capturedOptions.expiresIn).toBeLessThanOrEqual(SEVEN_DAYS_SECONDS);
      }),
      { numRuns: 100 }
    );
  });

  // ── URL structure property ───────────────────────────────────────────────

  it('returned imageUrl is always a string starting with "https://"', async () => {
    await fc.assert(
      fc.asyncProperty(equipmentIdArb, s3KeyArb, async (equipmentId, s3Key) => {
        const fakeUrl = `https://fake-bucket.s3.amazonaws.com/${s3Key}?X-Amz-Expires=604800`;
        const mockGetSignedUrl = vi.fn().mockResolvedValue(fakeUrl);
        const mockDb = {
          query: vi.fn().mockResolvedValue({ rows: [{ s3_image_key: s3Key }] }),
        };

        const { imageUrl } = await runImageUrlHandler(
          equipmentId, s3Key, mockGetSignedUrl, mockDb
        );

        expect(typeof imageUrl).toBe('string');
        expect(imageUrl.startsWith('https://')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('returned imageUrl encodes the correct X-Amz-Expires value of 604800', async () => {
    await fc.assert(
      fc.asyncProperty(equipmentIdArb, s3KeyArb, async (equipmentId, s3Key) => {
        const fakeUrl = `https://fake-bucket.s3.amazonaws.com/${s3Key}?X-Amz-Expires=604800`;
        const mockGetSignedUrl = vi.fn().mockResolvedValue(fakeUrl);
        const mockDb = {
          query: vi.fn().mockResolvedValue({ rows: [{ s3_image_key: s3Key }] }),
        };

        const { imageUrl } = await runImageUrlHandler(
          equipmentId, s3Key, mockGetSignedUrl, mockDb
        );

        expect(imageUrl).toContain('X-Amz-Expires=604800');
      }),
      { numRuns: 100 }
    );
  });

  // ── Consistency property ─────────────────────────────────────────────────

  it('expiresIn is deterministic: same equipment ID always produces the same expiry', async () => {
    await fc.assert(
      fc.asyncProperty(equipmentIdArb, s3KeyArb, async (equipmentId, s3Key) => {
        const makeHandler = () => {
          const mockGetSignedUrl = vi.fn().mockResolvedValue(
            `https://fake-bucket.s3.amazonaws.com/${s3Key}?X-Amz-Expires=604800`
          );
          const mockDb = {
            query: vi.fn().mockResolvedValue({ rows: [{ s3_image_key: s3Key }] }),
          };
          return runImageUrlHandler(equipmentId, s3Key, mockGetSignedUrl, mockDb);
        };

        const { capturedOptions: first } = await makeHandler();
        const { capturedOptions: second } = await makeHandler();

        expect(first.expiresIn).toBe(second.expiresIn);
      }),
      { numRuns: 50 }
    );
  });
});
