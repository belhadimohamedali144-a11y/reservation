const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'reservations.json');

function read() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { normales: [], professionnelles: [] };
  }
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { read, write };
