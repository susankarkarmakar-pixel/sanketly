import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;

  const keyPair = libsodium.crypto_sign_keypair();
  const identityKeyPair = new proteus.keys.IdentityKeyPair(new proteus.keys.KeyPair(
    proteus.keys.KeyPair.construct_public_key(keyPair),
    proteus.keys.KeyPair.construct_private_key(keyPair)
  ));
  console.log('IdentityKeyPair:', identityKeyPair);
}
test().catch(console.error);
