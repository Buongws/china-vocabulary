import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await readFile(path.join(root, 'data/hsk6-vocabulary.json'), 'utf8'));
for (const word of source.words) {
  if (word.example_sentence && /[A-Za-zÀ-ỹ]/u.test(word.example_sentence)) {
    throw new Error(`Example contains non-Chinese OCR noise: ${word.term}`);
  }
  if (word.example_sentence && !word.example_sentence.includes(word.term.replaceAll('-', ''))) {
    throw new Error(`Example does not contain term: ${word.term}`);
  }
}
const literal = (value) => `'${String(value ?? '').replaceAll("'", "''")}'`;
const deckRows = source.decks.map((deck) => `(${literal(deck.id)}, NULL, 'zh', ${literal(deck.name)}, ${literal(deck.description)}, 'HSK 6', ${deck.number - 1}, false)`);
const wordRows = source.words.map((word) => `(${literal(word.id)}, ${literal(word.deck_id)}, 'zh', ${literal(word.term)}, ${literal(word.pronunciation)}, ${literal(word.meaning)}, ${literal(word.example_sentence)}, ${literal(word.example_translation)}, ARRAY[${literal(word.term)}]::text[], ${word.order_index}, false)`);

const missingExamples = source.words.filter((word) => !word.example_sentence).length;
const sql = `-- TNA Vocabulary — HSK 6 Standard Course (40 lessons, source-checked)
-- Source: the four HSK 6 PDFs supplied for this project; vocabulary fields are transcribed
-- from the lesson vocabulary tables. Run after the initial schema migration.
-- This is intentionally separate from supabase/seed.sql so the original English seed can stay intact.
-- ${source.words.length - missingExamples} examples are source-matched; ${missingExamples} are left blank rather than invented.
BEGIN;

-- Clean previously imported HSK 6 rows before the upsert. This targets only the
-- built-in HSK 6 decks and never touches a user's custom Chinese deck.
UPDATE public.words w
SET example_sentence = '', example_translation = ''
FROM public.decks d
WHERE d.id = w.deck_id
  AND d.owner_id IS NULL
  AND d.language = 'zh'
  AND d.name LIKE 'HSK 6 · %'
  AND w.example_sentence ~ '[A-Za-zÀ-ỹ]';

-- Archive only the built-in Chinese decks and words. User-owned decks and progress are preserved.
UPDATE public.words w
SET archived = true
FROM public.decks d
WHERE d.id = w.deck_id AND d.owner_id IS NULL AND d.language = 'zh';
UPDATE public.decks
SET archived = true
WHERE owner_id IS NULL AND language = 'zh';

INSERT INTO public.decks (id, owner_id, language, name, description, level, order_index, archived) VALUES
${deckRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  language = EXCLUDED.language,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  level = EXCLUDED.level,
  order_index = EXCLUDED.order_index,
  archived = false;

INSERT INTO public.words (id, deck_id, language, term, pronunciation, meaning, example_sentence, example_translation, accepted_answers, order_index, archived) VALUES
${wordRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  deck_id = EXCLUDED.deck_id,
  language = EXCLUDED.language,
  term = EXCLUDED.term,
  pronunciation = EXCLUDED.pronunciation,
  meaning = EXCLUDED.meaning,
  example_sentence = EXCLUDED.example_sentence,
  example_translation = EXCLUDED.example_translation,
  accepted_answers = EXCLUDED.accepted_answers,
  order_index = EXCLUDED.order_index,
  archived = false;

COMMIT;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.words WHERE language = 'zh' AND NOT archived AND example_sentence ~ '[A-Za-z]') THEN
    RAISE EXCEPTION 'HSK6 seed contains OCR/Latin noise in an example sentence';
  END IF;
END $$;
`;
await mkdir(path.join(root, 'supabase'), { recursive: true });
await writeFile(path.join(root, 'supabase/hsk6-chinese.sql'), sql);
await writeFile(path.join(root, 'data/hsk6-vocabulary.json'), `${JSON.stringify(source, null, 2)}\n`);
console.log(`Generated HSK 6 seed: ${source.decks.length} decks, ${source.words.length} words.`);
