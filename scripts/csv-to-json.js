const fs = require('fs');
const path = require('path');
const csv = require('csv-parse');

const CSV_DIR = '/home/xynate/workspace-dev/personal/system_integration_question-bank/';
const OUTPUT_FILE = path.join(__dirname, '../public/questions.json');

async function processCSVs() {
  const files = fs.readdirSync(CSV_DIR).filter(f => f.endsWith('.csv'));

  let allQuestions = [];
  let id = 1;
  const topicsFound = new Set();
  let rowsRejected = 0;

  for (const file of files) {
    const topic = file.replace('.csv', '');
    const filePath = path.join(CSV_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const rows = content.split('\n');

    // Skip row 0 (headers) and rows 1-22 (instruction/description rows)
    // The actual data starts after the instruction block
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      // Skip header row and instruction rows (contain "(required)", "(optional)", etc.)
      if (i === 0 || row.includes('(required)') || row.includes('(optional)') ||
          row.includes('default is') || row.includes('between 1-5') ||
          row.includes('Time in seconds') || row.includes('Image Link') ||
          row.includes('Explanation for the answer') || row.trim() === '') {
        continue;
      }

      // Parse CSV row
      const parsed = parseCSVRow(row);
      if (parsed.length < 8) continue;

      const [questionText, , opt1, opt2, opt3, opt4, opt5, correctAnswer, , , explanation] = parsed;

      // Skip if question text is empty
      if (!questionText || questionText.trim() === '') continue;

      // Skip open-ended rows (Correct Answer not 1-5)
      const ca = correctAnswer ? correctAnswer.trim() : '';
      if (!['1', '2', '3', '4', '5'].includes(ca)) {
        rowsRejected++;
        continue;
      }

      // Build options object
      const options = {};
      const optionMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };
      const rawOptions = [opt1, opt2, opt3, opt4, opt5];

      rawOptions.forEach((opt, idx) => {
        if (opt && opt.trim() && !opt.includes('No answer text provided')) {
          options[optionMap[idx + 1]] = opt.trim();
        }
      });

      // Skip if no valid options
      if (Object.keys(options).length === 0) {
        rowsRejected++;
        continue;
      }

      allQuestions.push({
        id: id++,
        topic,
        question: questionText.replace(/"/g, '').trim(),
        options,
        correctAnswer: optionMap[parseInt(ca)],
        explanation: explanation ? explanation.replace(/"/g, '').trim() : ''
      });

      topicsFound.add(topic);
    }
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allQuestions, null, 2));

  console.log(`total_questions: ${allQuestions.length}`);
  console.log(`topics_found: ${Array.from(topicsFound).sort().join(', ')}`);
  console.log(`rows_rejected: ${rowsRejected}`);
  console.log(`Output written to: ${OUTPUT_FILE}`);
}

function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

processCSVs().catch(console.error);