import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const keypair = proteus.keys.KeyPair.generate();
  console.log(keypair);
}
test().catch(console.error);
