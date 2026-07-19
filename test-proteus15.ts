import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const pair = proteus.keys.IdentityKeyPair.new();
}
test().catch(console.error);
