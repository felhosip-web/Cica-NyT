import { BackupData } from './googleDriveService';

/**
 * Helper to escape single quotes for SQL string literals
 */
function sqlEscape(str: any): string {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'boolean') return str ? 'TRUE' : 'FALSE';
  if (typeof str === 'number') return isNaN(str) ? 'NULL' : String(str);
  if (typeof str === 'object') {
    // Escape stringified JSON/Array for SQL
    const jsonStr = JSON.stringify(str).replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  return `'${String(str).replace(/'/g, "''")}'`;
}

/**
 * Generates a production-ready SQL script (DML & Schema comments) from BackupData
 */
export function generateSqlDump(backupData: BackupData): string {
  const exportDate = backupData.backupMetadata?.exportDate || new Date().toISOString();
  const appVersion = backupData.backupMetadata?.appVersion || '2.8.0';

  let sql = `-- ========================================================\n`;
  sql += `-- Cica-NYT Adatbázis SQL Dump (PostgreSQL / Supabase / SQLite)\n`;
  sql += `-- Készült: ${exportDate}\n`;
  sql += `-- Rendszer Verzió: v${appVersion}\n`;
  sql += `-- ========================================================\n\n`;

  sql += `BEGIN;\n\n`;

  // 1. Cats table SQL
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tábla: cats (Macskák)\n`;
  sql += `-- --------------------------------------------------------\n`;
  if (Array.isArray(backupData.cats) && backupData.cats.length > 0) {
    backupData.cats.forEach((c) => {
      const id = sqlEscape(c.id);
      const sorszam = sqlEscape(c.sorszam);
      const nev = sqlEscape(c.nev || 'Névtelen');
      const ivar = sqlEscape(c.ivar || 'ismeretlen');
      const szin = sqlEscape(c.szin);
      const szuletes = sqlEscape(c.szuletes);
      const status = sqlEscape(c.status || 'gondozasban');
      const gazdisDate = sqlEscape(c.gazdisDate);
      const gazdisPerson = sqlEscape(c.gazdisPerson);
      const intakeType = sqlEscape(c.intakeType || 'sajat');
      const hasKiskonyv = sqlEscape(!!c.hasKiskonyv);
      const chipNumber = sqlEscape(c.chipNumber);
      const chipDate = sqlEscape(c.chipDate);
      const chipLocation = sqlEscape(c.chipLocation);
      const isSpayed = sqlEscape(!!c.isSpayed);
      const spayedDate = sqlEscape(c.spayedDate);
      const fosterId = sqlEscape(c.fosterId);
      const tags = sqlEscape(Array.isArray(c.tags) ? c.tags : []);

      sql += `INSERT INTO cats (id, sorszam, nev, ivar, szin, szuletes, status, gazdis_date, gazdis_person, intake_type, has_kiskonyv, chip_number, chip_date, chip_location, is_spayed, spayed_date, foster_id, tags) VALUES (${id}, ${sorszam}, ${nev}, ${ivar}, ${szin}, ${szuletes}, ${status}, ${gazdisDate}, ${gazdisPerson}, ${intakeType}, ${hasKiskonyv}, ${chipNumber}, ${chipDate}, ${chipLocation}, ${isSpayed}, ${spayedDate}, ${fosterId}, ${tags}) ON CONFLICT (id) DO UPDATE SET nev = EXCLUDED.nev, status = EXCLUDED.status, updated_at = NOW();\n`;
    });
  } else {
    sql += `-- Nincs rögzített macska adat.\n`;
  }
  sql += `\n`;

  // 2. Events table SQL
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tábla: events (Események, oltások, orvosi bejegyzések)\n`;
  sql += `-- --------------------------------------------------------\n`;
  if (Array.isArray(backupData.events) && backupData.events.length > 0) {
    backupData.events.forEach((e) => {
      const id = sqlEscape(e.id);
      const catId = sqlEscape(e.catId);
      const type = sqlEscape(e.type);
      const date = sqlEscape(e.date);
      const title = sqlEscape(e.title || e.type);
      const notes = sqlEscape(e.notes || e.description || null);
      const status = sqlEscape(e.status || 'elkeszult');

      sql += `INSERT INTO events (id, cat_id, type, date, title, notes, status) VALUES (${id}, ${catId}, ${type}, ${date}, ${title}, ${notes}, ${status}) ON CONFLICT DO NOTHING;\n`;
    });
  } else {
    sql += `-- Nincs rögzített esemény adat.\n`;
  }
  sql += `\n`;

  // 3. TNR table SQL
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tábla: tnr (TNR Befogások és Ivartalanítások)\n`;
  sql += `-- --------------------------------------------------------\n`;
  if (Array.isArray(backupData.tnr) && backupData.tnr.length > 0) {
    backupData.tnr.forEach((t) => {
      const id = sqlEscape(t.id);
      const locationTrapped = sqlEscape(t.locationTrapped);
      const dateTrapped = sqlEscape(t.dateTrapped);
      const trappedBy = sqlEscape(t.trappedBy);
      const clinicLocation = sqlEscape(t.clinicLocation);
      const surgeonName = sqlEscape(t.surgeonName);
      const locationReleased = sqlEscape(t.locationReleased);
      const status = sqlEscape(t.status || 'folyamatban');

      sql += `INSERT INTO tnr (id, location_trapped, date_trapped, trapped_by, clinic_location, surgeon_name, location_released, status) VALUES (${id}, ${locationTrapped}, ${dateTrapped}, ${trappedBy}, ${clinicLocation}, ${surgeonName}, ${locationReleased}, ${status}) ON CONFLICT (id) DO NOTHING;\n`;
    });
  } else {
    sql += `-- Nincs rögzített TNR adat.\n`;
  }
  sql += `\n`;

  // 4. Foster Parents table SQL
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tábla: foster_parents (Ideiglenes Befogadók)\n`;
  sql += `-- --------------------------------------------------------\n`;
  if (Array.isArray(backupData.fosterParents) && backupData.fosterParents.length > 0) {
    backupData.fosterParents.forEach((f) => {
      const id = sqlEscape(f.id);
      const name = sqlEscape(f.name);
      const phone = sqlEscape(f.phone);
      const city = sqlEscape(f.city);
      const status = sqlEscape(f.status || 'aktiv');
      const maxCapacity = sqlEscape(f.maxCapacity || 1);

      sql += `INSERT INTO foster_parents (id, name, phone, city, status, max_capacity) VALUES (${id}, ${name}, ${phone}, ${city}, ${status}, ${maxCapacity}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;
    });
  } else {
    sql += `-- Nincs rögzített ideiglenes befogadó adat.\n`;
  }
  sql += `\n`;

  // 5. Inventory table SQL
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tábla: inventory (Raktár / Készletnyilvántartás)\n`;
  sql += `-- --------------------------------------------------------\n`;
  if (Array.isArray(backupData.inventory) && backupData.inventory.length > 0) {
    backupData.inventory.forEach((inv) => {
      const id = sqlEscape(inv.id);
      const direction = sqlEscape(inv.direction || 'in');
      const itemType = sqlEscape(inv.itemType || 'táp');
      const sourceType = sqlEscape(inv.sourceType || 'vásárlás');
      const date = sqlEscape(inv.date || new Date().toISOString().slice(0, 10));
      const sourceOrRecipient = sqlEscape(inv.sourceOrRecipient);

      sql += `INSERT INTO inventory (id, direction, item_type, source_type, date, source_or_recipient) VALUES (${id}, ${direction}, ${itemType}, ${sourceType}, ${date}, ${sourceOrRecipient}) ON CONFLICT DO NOTHING;\n`;
    });
  } else {
    sql += `-- Nincs rögzített raktár / készlet adat.\n`;
  }
  sql += `\n`;

  // 6. Finances table SQL
  sql += `-- --------------------------------------------------------\n`;
  sql += `-- Tábla: finances (Pénzügyi kezelés)\n`;
  sql += `-- --------------------------------------------------------\n`;
  if (Array.isArray(backupData.finances) && backupData.finances.length > 0) {
    backupData.finances.forEach((f) => {
      const id = sqlEscape(f.id);
      const type = sqlEscape(f.type || 'bevetel');
      const category = sqlEscape(f.category || 'adomany');
      const amount = f.amount || 0;
      const date = sqlEscape(f.date || new Date().toISOString().slice(0, 10));
      const title = sqlEscape(f.title || 'Pénzügyi tételek');
      const partnerName = sqlEscape(f.partnerName);
      const paymentMethod = sqlEscape(f.paymentMethod || 'keszpenz');
      const status = sqlEscape(f.status || 'teljesult');

      sql += `INSERT INTO finances (id, type, category, amount, date, title, partner_name, payment_method, status) VALUES (${id}, ${type}, ${category}, ${amount}, ${date}, ${title}, ${partnerName}, ${paymentMethod}, ${status}) ON CONFLICT DO NOTHING;\n`;
    });
  } else {
    sql += `-- Nincs rögzített pénzügyi adat.\n`;
  }
  sql += `\n`;

  sql += `COMMIT;\n`;
  sql += `-- Mentés sikeresen lezárva.\n`;

  return sql;
}
