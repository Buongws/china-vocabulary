import { describe, expect, it } from 'vitest';
import { parseVocabularyCsv } from './import';
const header = 'term,pronunciation,meaning,example_sentence,example_translation,accepted_answers\n';
describe('Vocabulary CSV', () => {
  it('preserves quoted commas and Vietnamese UTF-8 with BOM', () => {
    const result = parseVocabularyCsv('\uFEFF'+header+'hello,/həˈləʊ/,xin chào,"Hello, my friend.","Xin chào, bạn tôi.",hi\n');
    expect(result.errors).toEqual([]); expect(result.words[0].example_sentence).toBe('Hello, my friend.'); expect(result.words[0].accepted_answers).toEqual(['hi']);
  });
  it('reports missing fields and duplicates before insertion', () => {
    expect(parseVocabularyCsv('term\nhello').errors[0]).toContain('Thiếu cột');
    const row='hello,/həˈləʊ/,xin chào,Hello!,Xin chào!,\n';
    expect(parseVocabularyCsv(header+row+row).errors[0]).toContain('Dòng 3');
    expect(parseVocabularyCsv(header+'hello,,xin chào,Hello!,Xin chào!,').errors[0]).toContain('pronunciation');
  });
  it('rejects an empty or too large batch', () => {
    expect(parseVocabularyCsv(header).errors.length).toBeGreaterThan(0);
    expect(parseVocabularyCsv(header+Array.from({length:1001},(_,i)=>`w${i},p,m,s,t,`).join('\n')).errors[0]).toContain('1.000');
  });
});
