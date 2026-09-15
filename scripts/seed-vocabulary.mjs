import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const validateOnly = process.argv.includes('--check');
const uuid = (value) => {
  const hex = createHash('sha256').update(`tna-vocabulary-v1:${value}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const decks = [];
const words = [];
for (const language of ['zh', 'en']) {
  const source = await readFile(path.join(root, 'data', `vocabulary-${language}.txt`), 'utf8');
  let deck;
  let order = 0;
  let deckOrder = 0;
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('#')) {
      const [slug, name, description] = line.slice(1).split('|');
      if (!slug || !name || !description) throw new Error(`Invalid deck: ${line}`);
      deck = { id: uuid(`deck:${language}:${slug}`), language, name, description, level: 'Cơ bản', order_index: deckOrder++ };
      decks.push(deck);
      order = 0;
      continue;
    }
    if (!deck) throw new Error('A word must follow a deck heading.');
    const fields = line.split('|');
    if (fields.length !== 5 || fields.some((field) => !field.trim())) throw new Error(`Invalid entry: ${line}`);
    const [term, pronunciation, meaning, example_sentence, example_translation] = fields;
    words.push({ id: uuid(`word:${language}:${term}`), deck_id: deck.id, language, term, pronunciation, meaning, example_sentence, example_translation, accepted_answers: [term], order_index: order++ });
  }
}

for (const language of ['zh', 'en']) {
  const subset = words.filter((word) => word.language === language);
  if (subset.length !== 300) throw new Error(`${language}: expected 300 words, found ${subset.length}`);
  if (decks.filter((deck) => deck.language === language).length !== 10) throw new Error(`${language}: expected 10 decks`);
  const seen = new Set();
  for (const word of subset) {
    const key = word.term.normalize('NFC').toLocaleLowerCase();
    if (seen.has(key)) throw new Error(`Duplicate ${language} term: ${word.term}`);
    seen.add(key);
    if (!word.example_sentence.toLocaleLowerCase().includes(key)) throw new Error(`Example must include ${word.term}`);
    if (language === 'en' && !/^\/.+\/$/.test(word.pronunciation)) throw new Error(`Missing IPA: ${word.term}`);
    if (language === 'zh' && !/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u.test(word.pronunciation) && !['的', '吗', '呢'].includes(word.term)) throw new Error(`Missing tone marks: ${word.term}`);
  }
}
for (const deck of decks) {
  const count = words.filter((word) => word.deck_id === deck.id).length;
  if (count !== 30) throw new Error(`${deck.name} (${deck.language}): expected 30 words, found ${count}`);
}
if (new Set([...decks, ...words].map((item) => item.id)).size !== decks.length + words.length) throw new Error('Duplicate UUID.');

const vocabulary = { decks, words };
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const deckRows = decks.map((deck) => `(${literal(deck.id)}, NULL, ${literal(deck.language)}, ${literal(deck.name)}, ${literal(deck.description)}, ${literal(deck.level)}, ${deck.order_index})`);
const wordRows = words.map((word) => `(${literal(word.id)}, ${literal(word.deck_id)}, ${literal(word.language)}, ${literal(word.term)}, ${literal(word.pronunciation)}, ${literal(word.meaning)}, ${literal(word.example_sentence)}, ${literal(word.example_translation)}, ARRAY[${word.accepted_answers.map(literal).join(', ')}]::text[], ${word.order_index})`);
const sql = `-- TNA Vocabulary: 600 original beginner entries, 20 decks.\n-- Regenerate with: node scripts/seed-vocabulary.mjs\n-- Apply after the schema migration. Safe to run more than once.\nBEGIN;\n\nINSERT INTO public.decks (id, owner_id, language, name, description, level, order_index) VALUES\n${deckRows.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n\nINSERT INTO public.words (id, deck_id, language, term, pronunciation, meaning, example_sentence, example_translation, accepted_answers, order_index) VALUES\n${wordRows.join(',\n')}\nON CONFLICT (id) DO NOTHING;\n\nCOMMIT;\n`;
const json = `${JSON.stringify(vocabulary, null, 2)}\n`;
if (validateOnly) {
  const [existingJson, existingSql] = await Promise.all([
    readFile(path.join(root, 'data/vocabulary.json'), 'utf8'),
    readFile(path.join(root, 'supabase/seed.sql'), 'utf8'),
  ]);
  if (existingJson !== json || existingSql !== sql) throw new Error('Generated vocabulary is out of date. Run node scripts/seed-vocabulary.mjs.');
  console.log('Vocabulary verified: 300 Chinese + 300 English; 20 decks × 30; unique IDs and terms; all examples include their term; generated files match sources.');
} else {
  await mkdir(path.join(root, 'supabase'), { recursive: true });
  await writeFile(path.join(root, 'data/vocabulary.json'), json);
  await writeFile(path.join(root, 'supabase/seed.sql'), sql);
  console.log('Generated data/vocabulary.json and supabase/seed.sql: 600 words in 20 decks.');
}
