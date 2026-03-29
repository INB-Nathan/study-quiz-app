const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

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

    const { data, errors } = Papa.parse(content, {
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (errors.length > 0) {
      console.warn(`Warnings parsing ${file}:`, errors.map(e => e.message));
    }

    // Row 0 = header, Row 1 = description/instruction row
    // Data starts at row 2
    const header = data[0];
    const descRow = data[1];
    const dataRows = data.slice(2);

    // Map column indices
    const colIdx = {};
    header.forEach((col, i) => { colIdx[col] = i; });

    for (const row of dataRows) {
      const questionText = (row[colIdx['Question Text']] || '').trim();
      if (!questionText) continue;

      // Build options array from Option 1–5
      const rawOptions = [];
      for (let n = 1; n <= 5; n++) {
        const val = (row[colIdx[`Option ${n}`]] || '').trim();
        rawOptions.push(val);
      }

      // Filter to non-empty options
      const nonEmptyOptions = rawOptions.filter(v => v && v.length > 0);

      // Correct Answer is an integer (1–5)
      const caRaw = (row[colIdx['Correct Answer']] || '').trim();

      // Skip open-ended, poll, draw, fill-in-the-blank (not 1–5)
      if (!/^[1-5]$/.test(caRaw)) {
        rowsRejected++;
        continue;
      }

      const ca = parseInt(caRaw, 10);

      // Validate CA doesn't exceed available options
      if (ca > nonEmptyOptions.length || ca < 1) {
        rowsRejected++;
        continue;
      }

      const optionMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E' };
      const options = {};
      nonEmptyOptions.forEach((opt, idx) => {
        options[optionMap[idx + 1]] = opt;
      });

      const explanation = (row[colIdx['Answer explanation']] || '').trim();

      allQuestions.push({
        id: id++,
        topic,
        question: questionText,
        options,
        correctAnswer: optionMap[ca],
        explanation,
      });

      topicsFound.add(topic);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allQuestions, null, 2));

  console.log(`total_questions: ${allQuestions.length}`);
  console.log(`topics_found: ${Array.from(topicsFound).sort().join(', ')}`);
  console.log(`rows_rejected: ${rowsRejected}`);
  console.log(`Output written to: ${OUTPUT_FILE}`);
}

processCSVs().catch(console.error);
