import 'fake-indexeddb/auto';
import { set, get, clear } from 'idb-keyval';

async function run() {
  await set('foo', 'bar');
  console.log('foo:', await get('foo'));
  await clear();
  console.log('foo after clear:', await get('foo'));
}
run();
