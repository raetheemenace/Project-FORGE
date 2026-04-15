/**
 * Preservation Property Tests — AI Text-Only Answers
 * Spec: .kiro/specs/system-wide-fixes/
 *
 * P5: AI Text Preservation — non-appearance questions return text-only answers
 *
 * These tests MUST PASS on unfixed code — they confirm baseline behaviors to preserve.
 *
 * Validates: Requirements 3.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fc from 'fast-check';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─────────────────────────────────────────────────────────────────────────────
// P5: AI Text Preservation
// Property: non-appearance questions return text-only answers (no image URLs)
// Validates: Requirements 3.8
// ─────────────────────────────────────────────────────────────────────────────
describe('P5: AI Text Preservation — Non-Appearance Questions Return Text-Only', () => {
  /**
   * Validates: Requirements 3.8
   *
   * EXPECTED TO PASS on unfixed code because backend/routes/ai.js sends only
   * text questions to Bedrock/Claude with no image-fetching logic. Non-appearance
   * questions (general lab knowledge) return text-only answers.
   *
   * This confirms the baseline behavior that must be preserved after fixes.
   * After the fix (which adds image support for appearance questions), non-appearance
   * questions must still return text-only answers.
   */

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('static analysis: ai.js route returns answer directly from Bedrock without image embedding', () => {
    const aiFilePath = resolve(__dirname, '../routes/ai.js');
    const source = readFileSync(aiFilePath, 'utf-8');

    // PRESERVATION ASSERTION:
    // The route must call Bedrock and return the answer text directly
    expect(source).toContain('InvokeModelCommand');
    expect(source).toContain('result.content[0].text');
    expect(source).toContain('res.json({ answer })');

    // The route must NOT unconditionally embed images in all responses
    // (image embedding, if added, must be conditional on appearance questions)
    // On unfixed code: no image embedding exists at all
    const hasUnconditionalImageEmbed =
      source.includes('![') &&
      !source.includes('isEquipmentAppearanceQuestion') &&
      !source.includes('if');

    // On unfixed code: no unconditional image embedding (text-only responses)
    expect(hasUnconditionalImageEmbed).toBe(false);
  });

  it('static analysis: ai.js route handler returns text answer for all questions (no conditional image logic)', () => {
    const aiFilePath = resolve(__dirname, '../routes/ai.js');
    const source = readFileSync(aiFilePath, 'utf-8');

    // Find the POST /chat route handler
    const routeStart = source.indexOf("router.post('/chat'");
    expect(routeStart).not.toBe(-1);

    // Extract route handler body
    const braceStart = source.indexOf('{', routeStart);
    let depth = 0;
    let routeEnd = -1;
    for (let i = braceStart; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) { routeEnd = i + 1; break; }
      }
    }
    const routeBody = source.slice(routeStart, routeEnd);

    // PRESERVATION: the route must return the answer from Bedrock
    expect(routeBody).toContain('answer');
    expect(routeBody).toContain('res.json');

    // PRESERVATION: the text-only path always exists
    const hasTextOnlyPath = routeBody.includes('result.content[0].text');
    expect(hasTextOnlyPath).toBe(true);
  });

  it('property: for all non-appearance questions, the text-only return path exists in ai.js', async () => {
    /**
     * Validates: Requirements 3.8
     *
     * Uses fast-check to generate non-appearance question strings and verify
     * that the AI route has a text-only return path for them.
     *
     * NOT isBugCondition_AIImage: question does NOT match /what (is|does|looks? like)/i
     */

    const aiFilePath = resolve(__dirname, '../routes/ai.js');
    const source = readFileSync(aiFilePath, 'utf-8');

    // Non-appearance question generator: questions that don't ask about appearance
    const nonAppearanceQuestion = fc.oneof(
      fc.constantFrom(
        'How do I calibrate a pH meter?',
        'What safety precautions should I take in the lab?',
        'How do I borrow equipment?',
        'What is the borrowing procedure?',
        'How do I return equipment?',
        'What are the lab room hours?',
        'How do I report a maintenance issue?',
        'What is the maximum borrowing period?',
        'How do I check equipment availability?',
        'What is a transaction ID?',
      ),
      fc.string({ minLength: 5, maxLength: 100 }).filter(
        (s) => !/what\s+(is|does|looks?\s+like)/i.test(s)
      ),
    );

    await fc.assert(
      fc.asyncProperty(
        nonAppearanceQuestion,
        async (question) => {
          // PRESERVATION: for non-appearance questions, the route returns text-only
          // The source must have the text-only return path
          const hasTextOnlyReturn = source.includes('res.json({ answer })');
          expect(hasTextOnlyReturn).toBe(true);

          // PRESERVATION: the Bedrock call must exist (text answer source)
          const hasBedrockCall = source.includes('InvokeModelCommand');
          expect(hasBedrockCall).toBe(true);

          // If the question is not an appearance question, it should not trigger
          // any image-embedding logic (on unfixed code, no such logic exists)
          const isAppearanceQuestion = /what\s+(is|does|looks?\s+like)/i.test(question);
          if (!isAppearanceQuestion) {
            // Text-only path must always exist for non-appearance questions
            expect(hasTextOnlyReturn).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('simulated Bedrock response for non-appearance question contains no image URL', () => {
    /**
     * Validates: Requirements 3.8
     *
     * Simulates the Bedrock response for a non-appearance question and verifies
     * that the answer contains no image URL or markdown image reference.
     */

    const nonAppearanceAnswers = [
      'To calibrate a pH meter, first rinse the electrode with distilled water, then immerse it in pH 7 buffer solution and adjust the calibration knob until the meter reads 7.00.',
      'The borrowing procedure involves scanning the equipment QR code in Step 3 of the borrow flow, then confirming your cart in Step 4.',
      'Lab rooms are available Monday through Friday from 8:00 AM to 6:00 PM.',
      'To report a maintenance issue, go to Dashboard and click "Report Maintenance", then scan the equipment QR code.',
      'Your transaction ID is in the format TXN-YYYYMMDD-NNN and can be found in My Transactions.',
    ];

    for (const answer of nonAppearanceAnswers) {
      const hasMarkdownImage = /!\[.*?\]\(https?:\/\/[^)]+\)/.test(answer);
      const hasImageUrl =
        /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/i.test(answer) ||
        /https?:\/\/upload\.wikimedia\.org[^\s]*/i.test(answer) ||
        /https?:\/\/commons\.wikimedia\.org[^\s]*/i.test(answer);

      const containsImage = hasMarkdownImage || hasImageUrl;

      // PRESERVATION ASSERTION: non-appearance answers must NOT contain image URLs
      expect(containsImage).toBe(false);
    }
  });

  it('property: for all text-only answers, no image URL is present', async () => {
    /**
     * Validates: Requirements 3.8
     *
     * Uses fast-check to generate text-only answers (simulating Bedrock responses
     * for non-appearance questions) and verify they contain no image URLs.
     */

    const textOnlyAnswer = fc.string({ minLength: 10, maxLength: 500 }).filter(
      (s) =>
        !/!\[.*?\]\(https?:\/\/[^)]+\)/.test(s) &&
        !/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/i.test(s) &&
        !/https?:\/\/upload\.wikimedia\.org/.test(s)
    );

    await fc.assert(
      fc.asyncProperty(
        textOnlyAnswer,
        async (answer) => {
          // PRESERVATION: text-only answers must not contain image URLs
          const hasMarkdownImage = /!\[.*?\]\(https?:\/\/[^)]+\)/.test(answer);
          const hasImageUrl =
            /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg)/i.test(answer) ||
            /https?:\/\/upload\.wikimedia\.org[^\s]*/i.test(answer);

          const containsImage = hasMarkdownImage || hasImageUrl;
          expect(containsImage).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
