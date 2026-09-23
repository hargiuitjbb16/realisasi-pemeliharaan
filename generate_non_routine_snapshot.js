const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'data');
const csv = fs.readFileSync(path.join(dir, 'non_routine_source.csv'), 'utf8').replace(/^﻿/, '');
const rows = [];
let row = [], cell = '', quoted = false;
for (let i = 0; i < csv.length; i++) {
  const ch = csv[i], next = csv[i + 1];
  if (ch === '"') {
    if (quoted && next === '"') { cell += '"'; i++; }
    else quoted = !quoted;
  } else if (ch === ',' && !quoted) { row.push(cell); cell = ''; }
  else if ((ch === '\n' || ch === '\r') && !quoted) {
    if (ch === '\r' && next === '\n') i++;
    row.push(cell); if (row.some(v => v.trim() !== '')) rows.push(row);
    row = []; cell = '';
  } else cell += ch;
}
if (cell || row.length) { row.push(cell); if (row.some(v => v.trim() !== '')) rows.push(row); }
const headers = rows.shift().map(v => v.trim());
const records = rows.map(values => Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()]))).filter(r => Object.values(r).some(Boolean));
const metadata = {
  worksheet: 'NON RUTIN_EMERGENCY 2026',
  spreadsheetId: '1F7lFnzj7YhqQvhbuHCsrkVrtaHpr8NtyCvdBhfPo1lk',
  gid: '1764063918',
  sourceUrl: 'https://docs.google.com/spreadsheets/d/1F7lFnzj7YhqQvhbuHCsrkVrtaHpr8NtyCvdBhfPo1lk/edit?gid=1764063918#gid=1764063918',
  exportUrl: 'https://docs.google.com/spreadsheets/d/1F7lFnzj7YhqQvhbuHCsrkVrtaHpr8NtyCvdBhfPo1lk/export?format=csv&gid=1764063918',
  snapshotAt: new Date().toISOString(),
  recordCount: records.length
};
fs.writeFileSync(path.join(dir, 'non_routine_data.json'), JSON.stringify({ metadata, records }, null, 2) + '\n');
fs.writeFileSync(path.join(dir, 'non_routine_data.js'), `window.NON_ROUTINE_DATA_METADATA = ${JSON.stringify(metadata, null, 2)};\nwindow.NON_ROUTINE_DATA = ${JSON.stringify(records, null, 2)};\n`);
console.log(JSON.stringify({ recordCount: records.length, metadata }, null, 2));
