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
