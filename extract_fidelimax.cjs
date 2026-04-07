const Database = require('better-sqlite3');
const db = new Database('d:/API FIDELIMAX/app/server/data/fidelimax.db');
try {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('TABLES:', tables);
  for (const table of tables) {
    console.log(`\nTable: ${table.name}`);
    try {
      const rows = db.prepare(`SELECT * FROM ${table.name}`).all();
      console.log(rows);
    } catch (e) {
      console.log(`Could not read table ${table.name}: ${e.message}`);
    }
  }
} catch (e) {
  console.error(e.message);
}
db.close();
