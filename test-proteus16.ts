import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const kp = new proteus.keys.KeyPair();
  const identityKeyPair = new proteus.keys.IdentityKeyPair(kp.public_key, kp.secret_key);
  console.log(identityKeyPair);
}
test().catch(console.error);
