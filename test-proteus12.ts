import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const pair = libsodium.crypto_sign_keypair();
  // Proteus might expect just the keys. Let's look at IdentityKeyPair static methods.
  console.log(Object.getOwnPropertyNames(proteus.keys.IdentityKeyPair));
}
test().catch(console.error);
