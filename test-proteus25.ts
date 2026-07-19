import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const generateKeyPair = () => {
    // Some keys fail conversion randomly with libsodium?
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

  const plaintext = new TextDecoder().decode(plaintextBytes);
  console.log('Bob decrypted:', plaintext);

  const envelope2 = proteus.session.Session.encrypt(bobSession, "world");

  const pt2 = await aliceSession.decrypt(new MockPreKeyStore(), envelope2);
  console.log('Alice decrypted:', new TextDecoder().decode(pt2));
}
test().catch(console.error);
