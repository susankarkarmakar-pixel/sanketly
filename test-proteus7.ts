import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;

  // Try finding how to generate a keypair.
  console.log(proteus.keys.KeyPair.construct_private_key.toString());
}
test().catch(console.error);
