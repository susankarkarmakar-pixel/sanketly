import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const idKey = proteus.keys.IdentityKeyPair.generate();
  console.log(idKey);
}
test().catch(console.error);
