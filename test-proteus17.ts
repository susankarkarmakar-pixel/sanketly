import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const aliceKp = new proteus.keys.KeyPair();
  const aliceId = new proteus.keys.IdentityKeyPair(aliceKp.public_key, aliceKp.secret_key);

  const bobKp = new proteus.keys.KeyPair();
  const bobId = new proteus.keys.IdentityKeyPair(bobKp.public_key, bobKp.secret_key);

  const bobPreKp = new proteus.keys.KeyPair();
  const bobPreKey = new proteus.keys.PreKey(1, bobPreKp);

  const bobBundle = new proteus.keys.PreKeyBundle(bobId.public_key, bobPreKey);

  const aliceSession = proteus.session.Session.init_from_prekey(aliceId, bobBundle);

  const ciphertext = proteus.session.Session.encrypt(aliceSession, "hello");
  console.log('Alice sent:', ciphertext);
}
test().catch(console.error);
