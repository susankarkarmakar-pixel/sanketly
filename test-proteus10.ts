import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const pair = proteus.keys.IdentityKeyPair.new();
  console.log(pair);
}
test().catch(console.error);
