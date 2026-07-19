import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const store = new proteus.session.PreKeyStore();
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(store)));
}
test().catch(console.error);
