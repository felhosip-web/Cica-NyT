import fakeIndexedDB from 'fake-indexeddb';
import fakeIDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import Dexie from 'dexie';
import assert from 'node:assert';

console.log('🧪 Starting Tombstone & Soft-Delete Acceptance Verification Tests...');

// Setup Dexie with fake-indexeddb
const db = new Dexie('TestCicaNyT', { indexedDB: fakeIndexedDB, IDBKeyRange: fakeIDBKeyRange });

db.version(19).stores({
  cats: 'id, sorszam, nev, syncStatus, deletedAt',
  events: '++id, catId, type, syncStatus, deletedAt',
  finances: '++id, title, status, syncStatus, deletedAt'
});

async function runTests() {
  await db.open();

  // Test 1: Soft Delete sets tombstone fields
  console.log('Test 1: Soft-delete sets deletedAt, deletedBy, syncStatus...');
  const catId = 'cat_test_123';
  await db.cats.put({
    id: catId,
    nev: 'Mirci',
    syncStatus: 'synced',
    deletedAt: null,
    deletedBy: null
  });

  const nowIso = new Date().toISOString();
  await db.cats.update(catId, {
    deletedAt: nowIso,
    deletedBy: 'teszt_felhasznalo',
    syncStatus: 'pending'
  });

  const catAfterDelete = await db.cats.get(catId);
  assert(catAfterDelete !== undefined, 'Record still exists in IndexedDB');
  assert(catAfterDelete.deletedAt === nowIso, 'deletedAt is set');
  assert(catAfterDelete.deletedBy === 'teszt_felhasznalo', 'deletedBy is set');
  assert(catAfterDelete.syncStatus === 'pending', 'syncStatus is pending for sync');
  console.log('✅ Test 1 passed!');

  // Test 2: UI Read Filtering
  console.log('Test 2: UI read filtering excludes tombstones...');
  await db.cats.put({ id: 'cat_active_1', nev: 'Cirmos', deletedAt: null });
  const allCats = await db.cats.toArray();
  const activeCats = allCats.filter((c) => !c.deletedAt);

  assert.strictEqual(allCats.length, 2, 'Total records in DB is 2');
  assert.strictEqual(activeCats.length, 1, 'Filtered active records is 1');
  assert.strictEqual(activeCats[0].nev, 'Cirmos', 'Active cat is Cirmos');
  console.log('✅ Test 2 passed!');

  // Test 3: Conflict Resolution Rule "Last non-null deletedAt wins"
  console.log('Test 3: Sync conflict resolution (shouldApplyRemoteRecord logic)...');

  function shouldApplyRemoteRecord(local, mappedRemote) {
    if (!local) return true;
    const localDeletedAt = local.deletedAt ? new Date(local.deletedAt).getTime() : 0;
    const remoteDeletedAt = mappedRemote.deletedAt ? new Date(mappedRemote.deletedAt).getTime() : 0;

    if (local.deletedAt && local.syncStatus === 'pending' && !mappedRemote.deletedAt) {
      return false; // Local pending tombstone wins over active remote copy
    }

    if (mappedRemote.deletedAt && !local.deletedAt) {
      return true; // Remote tombstone wins over active local copy
    }

    if (localDeletedAt > 0 && remoteDeletedAt > 0) {
      return remoteDeletedAt >= localDeletedAt; // Last delete wins
    }

    const localUpdated = local.updatedAt || local.updated || local.createdAt || '';
    const remoteUpdated = mappedRemote.updatedAt || mappedRemote.updated || mappedRemote.createdAt || '';
    if (!localUpdated) return true;
    if (!remoteUpdated) return false;
    return new Date(remoteUpdated).getTime() > new Date(localUpdated).getTime();
  }

  // 3a. Local pending tombstone vs active remote copy -> Local wins (don't resurrect)
  const localPendingDeleted = { id: 'c1', deletedAt: '2026-10-12T10:00:00Z', syncStatus: 'pending' };
  const remoteActive = { id: 'c1', deletedAt: null, updatedAt: '2026-10-11T10:00:00Z' };
  assert.strictEqual(shouldApplyRemoteRecord(localPendingDeleted, remoteActive), false, 'Remote active copy must NOT resurrect local pending tombstone');

  // 3b. Local active vs remote tombstone -> Remote wins (apply tombstone)
  const localActive = { id: 'c2', deletedAt: null, syncStatus: 'synced', updatedAt: '2026-10-10T10:00:00Z' };
  const remoteDeleted = { id: 'c2', deletedAt: '2026-10-12T12:00:00Z' };
  assert.strictEqual(shouldApplyRemoteRecord(localActive, remoteDeleted), true, 'Remote tombstone MUST propagate to active local copy');

  // 3c. Both tombstoned -> Newer deletedAt wins
  const localOlderDelete = { id: 'c3', deletedAt: '2026-10-10T10:00:00Z' };
  const remoteNewerDelete = { id: 'c3', deletedAt: '2026-10-12T10:00:00Z' };
  assert.strictEqual(shouldApplyRemoteRecord(localOlderDelete, remoteNewerDelete), true, 'Newer remote deletedAt wins');

  console.log('✅ Test 3 passed!');

  // Test 4: Storno vs Soft-Delete Distinction
  console.log('Test 4: Storno vs Soft-Delete distinction...');
  await db.finances.put({ id: 1, title: 'Orvosi számla', status: 'teljesult', amount: 5000, deletedAt: null });
  await db.finances.put({ id: 2, title: 'Sztornózott számla', status: 'storno', amount: 3000, deletedAt: null });
  await db.finances.put({ id: 3, title: 'Soft-deleted számla', status: 'teljesult', amount: 2000, deletedAt: '2026-10-12T10:00:00Z' });

  const allFinances = await db.finances.toArray();
  const activeFinances = allFinances.filter((f) => !f.deletedAt);
  const ledgerFinances = activeFinances.filter((f) => f.status !== 'storno');

  assert.strictEqual(allFinances.length, 3, '3 finance records in DB');
  assert.strictEqual(activeFinances.length, 2, '2 active finances (storno included, tombstone excluded)');
  assert.strictEqual(ledgerFinances.length, 1, '1 ledger active financial transaction for totals calculation');
  console.log('✅ Test 4 passed!');

  // Test 5: Physical Purge
  console.log('Test 5: Physical Purge...');
  const tombstonedInDb = allCats.filter((c) => !!c.deletedAt);
  for (const item of tombstonedInDb) {
    await db.cats.delete(item.id);
  }

  const catsAfterPurge = await db.cats.toArray();
  assert.strictEqual(catsAfterPurge.length, 1, 'Purge removed tombstoned item physically');
  assert.strictEqual(catsAfterPurge[0].id, 'cat_active_1', 'Only active cat remains');
  console.log('✅ Test 5 passed!');

  console.log('\n🎉 ALL TOMBSTONE ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
