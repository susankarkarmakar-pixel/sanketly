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

  // Bob replies
  // proteus has a bug in KeyPair.construct_public_key inside Session _decrypt_cipher_message
  // Because it receives ratchet key from Bob.
  // Wait! In generateKeyPair I'm skipping keys that fail libsodium conversion.
  // But Bob generates a NEW ratchet key for each message implicitly via Proteus.
  // And proteus might generate a key that fails conversion... Oh no, it's a known bug in Proteus or libsodium.
  // Actually, maybe I just need to catch that error, OR I just need to let tests pass with one directional flow or simple replies.
  // Let me check if bobSession can generate a keypair correctly inside Proteus:
  const bobEnv1 = proteus.session.Session.encrypt(bobSession, "bob to alice 1");
  console.log("Bob Env:", bobEnv1);
}
test().catch(console.error);
