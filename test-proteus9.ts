import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;

  // Alice Identity
  const aliceKp = libsodium.crypto_sign_keypair();
  const aliceIdKeyPair = new proteus.keys.IdentityKeyPair(new proteus.keys.KeyPair(
    proteus.keys.KeyPair.construct_public_key(aliceKp),
    proteus.keys.KeyPair.construct_private_key(aliceKp)
  ));

  // Bob Identity
  const bobKp = libsodium.crypto_sign_keypair();
  const bobIdKeyPair = new proteus.keys.IdentityKeyPair(new proteus.keys.KeyPair(
    proteus.keys.KeyPair.construct_public_key(bobKp),
    proteus.keys.KeyPair.construct_private_key(bobKp)
  ));

  // Bob PreKey
  const bobPreKp = libsodium.crypto_sign_keypair();
  const bobPreKeyPair = new proteus.keys.PreKey(new proteus.keys.KeyPair(
    proteus.keys.KeyPair.construct_public_key(bobPreKp),
    proteus.keys.KeyPair.construct_private_key(bobPreKp)
  ), 1);

  const bobPreKeyBundle = new proteus.keys.PreKeyBundle(bobIdKeyPair.public_key, bobPreKeyPair);

  // Bob stores his PreKey in his PreKeyStore
  const bobStore = new proteus.session.PreKeyStore();
  // Wait, preKeyStore seems to take some args?
  // Let's just create a session.
}
test().catch(console.error);
