import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  await proteus.init(); // some crypto libs require init

  const idKey = proteus.keys.IdentityKeyPair.new();
  const preKey = proteus.keys.PreKey.new(1);
  const bundle = proteus.keys.PreKeyBundle.create(idKey.public_key, preKey);

  console.log('ID Key:', idKey);
  console.log('Bundle:', bundle);
}
test().catch(console.error);
