import Dexie from 'dexie';

export const db = new Dexie('CicaNyT');

db.version(1).stores({
  cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus',
  oltások: 'id, catId, datum',
  tesztek: 'id, catId, datum',
  kezelesek: 'id, catId, datum',
  meta: 'key'
});

db.version(2).stores({
  cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson'
});

db.version(3).stores({
  settings: 'id'
});

db.version(4).stores({
  cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType'
});

db.version(5).stores({
  cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType, hasKiskonyv'
});

db.version(6).stores({
  cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType, hasKiskonyv'
});

db.version(7).stores({
  cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType, hasKiskonyv, chipNumber, chipDate, chipLocation',
  events: '++id, catId, type, date, status, createdAt'
}).upgrade(tx => {
  return tx.cats.toCollection().modify(cat => {
    if (cat.chipNumber === undefined) cat.chipNumber = null;
    if (cat.chipDate === undefined) cat.chipDate = null;
    if (cat.chipLocation === undefined) cat.chipLocation = null;
  });
});
