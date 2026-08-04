import Dexie from 'dexie';
import fakeIndexedDB from 'fake-indexeddb';
import fakeIDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

let isIndexedDBAvailable = false;
try {
    if (typeof indexedDB !== 'undefined' && indexedDB !== null) {
        // Synchronously try to invoke .open which will throw a SecurityError in sandboxed iframes
        const testRequest = indexedDB.open('__sandbox_test_db__');
        if (testRequest) {
            isIndexedDBAvailable = true;
        }
    }
} catch (e) {
    console.warn("IndexedDB test failed with SecurityError, using fake-indexeddb fallback:", e);
    isIndexedDBAvailable = false;
}

let dbInstance;

if (globalThis.__dbInstance) {
    dbInstance = globalThis.__dbInstance;
} else {
    const dbOptions = {};
    if (!isIndexedDBAvailable) {
        console.warn("IndexedDB is blocked or unavailable in this environment (likely due to cross-origin iframe sandboxing in AI Studio). Falling back to in-memory fake-indexeddb database!");
        dbOptions.indexedDB = fakeIndexedDB;
        dbOptions.IDBKeyRange = fakeIDBKeyRange;
    }

    dbInstance = new Dexie('CicaNyT', dbOptions);
    globalThis.__dbInstance = dbInstance;
}

try {
    if (!dbInstance.isOpen()) {
        dbInstance.version(1).stores({
          cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus',
          oltások: 'id, catId, datum',
          tesztek: 'id, catId, datum',
          kezelesek: 'id, catId, datum',
          meta: 'key'
        });

        dbInstance.version(2).stores({
          cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson'
        });

        dbInstance.version(3).stores({
          settings: 'id'
        });

        dbInstance.version(4).stores({
          cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType'
        });

        dbInstance.version(5).stores({
          cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType, hasKiskonyv'
        });

        dbInstance.version(6).stores({
          cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType, hasKiskonyv'
        });

        dbInstance.version(7).stores({
          cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType, hasKiskonyv, chipNumber, chipDate, chipLocation',
          events: '++id, catId, type, date, status, createdAt'
        }).upgrade(tx => {
          return tx.cats.toCollection().modify(cat => {
            if (cat.chipNumber === undefined) cat.chipNumber = null;
            if (cat.chipDate === undefined) cat.chipDate = null;
            if (cat.chipLocation === undefined) cat.chipLocation = null;
          });
        });

        dbInstance.version(8).stores({
          cats: 'id, sorszam, nev, ivar, szin, szuletes, created, syncStatus, status, gazdisDate, gazdisPerson, intakeType, hasKiskonyv, chipNumber, chipDate, chipLocation, isSpayed',
          events: '++id, catId, type, date, status, createdAt'
        }).upgrade(tx => {
          return tx.cats.toCollection().modify(cat => {
            if (cat.isSpayed === undefined) cat.isSpayed = false;
            if (cat.spayedDate === undefined) cat.spayedDate = null;
            if (cat.spayedLocation === undefined) cat.spayedLocation = null;
          });
        });
    }
} catch (e) {
    console.warn("Failed to define versions because the database is already open/initialized:", e);
}

export const db = dbInstance;

