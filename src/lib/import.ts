import Papa from 'papaparse';
import { z } from 'zod';

export const importWordSchema = z.object({
  term: z.string().trim().min(1).max(100),
  pronunciation: z.string().trim().min(1).max(200),
  meaning: z.string().trim().min(1).max(500),
  example_sentence: z.string().trim().min(1).max(1000),
  example_translation: z.string().trim().min(1).max(1000),
  accepted_answers: z.array(z.string().trim().min(1).max(100)).max(20),
});
export type ImportWord = z.infer<typeof importWordSchema>;
export function parseVocabularyCsv(text: string): { words: ImportWord[]; errors: string[]; total: number } {
  const parsed = Papa.parse<Record<string,string>>(text.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy', transformHeader: header => header.trim() });
  const errors: string[] = parsed.errors.map(error => `Dòng ${(error.row ?? 0) + 2}: ${error.message}`);
  const required = ['term','pronunciation','meaning','example_sentence','example_translation'];
  const missing = required.filter(column => !parsed.meta.fields?.includes(column));
  if (missing.length) return { words: [], errors: [`Thiếu cột: ${missing.join(', ')}. Hãy sử dụng file mẫu.`], total: parsed.data.length };
  if (parsed.data.length > 1000) return { words: [], errors: ['Mỗi lần nhập tối đa 1.000 từ. Hãy chia nhỏ file.'], total: parsed.data.length };
  if (!parsed.data.length) return { words: [], errors: ['File chưa có từ vựng nào.'], total: 0 };
  const words: ImportWord[] = [];
  const seen = new Set<string>();
  parsed.data.forEach((row, index) => {
    const result = importWordSchema.safeParse({ ...row, accepted_answers: (row.accepted_answers || '').split('|').map(value => value.trim()).filter(Boolean) });
    if (!result.success) { errors.push(`Dòng ${index+2}: kiểm tra các trường ${[...new Set(result.error.issues.map(issue => issue.path[0]))].join(', ')}.`); return; }
    const key = result.data.term.normalize('NFKC').toLowerCase();
    if (seen.has(key)) { errors.push(`Dòng ${index+2}: từ “${result.data.term}” bị trùng trong file.`); return; }
    seen.add(key);
    words.push(result.data);
  });
  return { words, errors, total: parsed.data.length };
}
