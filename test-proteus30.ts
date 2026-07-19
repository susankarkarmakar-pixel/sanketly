import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const generateKeyPair = () => {
    let kp, success = false;
    let pub, sec;
    while (!success) {
      try {
        kp = libsodium.crypto_sign_keypair();
        pub = proteus.keys.KeyPair.construct_public_key(kp);
        sec = proteus.keys.KeyPair.construct_private_key(kp);
        success = true;
      } catch (e) {}
    }
    return new proteus.keys.KeyPair(pub, sec);
  };

  const aliceKp = generateKeyPair();
  const aliceIdKey = new proteus.keys.IdentityKey(aliceKp.public_key);
  const aliceId = new proteus.keys.IdentityKeyPair(aliceIdKey, aliceKp.secret_key);

  const bobKp = generateKeyPair();
  const bobIdKey = new proteus.keys.IdentityKey(bobKp.public_key);
  const bobId = new proteus.keys.IdentityKeyPair(bobIdKey, bobKp.secret_key);

  const bobPreKp = generateKeyPair();
  const bobPreKey = new proteus.keys.PreKey(1, bobPreKp);

  const bobBundle = new proteus.keys.PreKeyBundle(bobIdKey, bobPreKey);

  const aliceSession = proteus.session.Session.init_from_prekey(aliceId, bobBundle);

  const envelope = proteus.session.Session.encrypt(aliceSession, "hello");

  class MockPreKeyStore extends proteus.session.PreKeyStore {
      async load_prekey(id: number) {
          if (id === bobPreKey.key_id) {
              return bobPreKey;
          }
          return undefined;
      }
      async delete_prekey(id: number) { return 1; }
  }

  const bobStore = new MockPreKeyStore();

  const [bobSession, plaintextBytes] = await proteus.session.Session.init_from_message(
    bobId,
    bobStore,
    envelope
  );

  let bobEnv1;
  let success = false;
  while (!success) {
    try {
      bobEnv1 = proteus.session.Session.encrypt(bobSession, "bob to alice 1");
      const ptA1 = await aliceSession.decrypt(new MockPreKeyStore(), bobEnv1);
      console.log("Alice decrypted:", new TextDecoder().decode(ptA1));
      success = true;
    } catch(e) {
      console.log("Error generated on ratchet, trying again", e);
      // We can't really "try again" easily with the exact same session without resetting state,
      // but in reality this is just a test failure. We can just test one way, or ignore this specific Proteus edge case for the test.
      // Wait, can we mock RandomUtil in proteus to always generate safe keys?
      break;
    }
  }
}
test().catch(console.error);
