import mammoth from 'mammoth';
import fs from 'node:fs/promises';

const input = 'D:/个人简历/范升耀_创新实践报告_v3.docx';
const output = 'src/content/about/raw-resume.txt';

const result = await mammoth.extractRawText({ path: input });
await fs.writeFile(output, result.value, 'utf-8');
console.log(`Extracted ${result.value.length} chars to ${output}`);
console.log('--- PREVIEW ---');
console.log(result.value.slice(0, 500));
