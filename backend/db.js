// Tiny JSON-file "database". Each collection is one file in ./data.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'data');
const file = (name) => path.join(DIR, `${name}.json`);

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch {
    return [];
  }
}

// Write to a temp file first, then rename, so a crash never leaves half a file.
function write(name, data) {
  const tmp = file(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file(name));
}

const nextId = (items) => items.reduce((m, i) => Math.max(m, i.id), 0) + 1;

module.exports = { read, write, nextId };
