import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;
  const generateKeyPair = () => {
    const kp = libsodium.crypto_sign_keypair();
    return new proteus.keys.KeyPair(
      proteus.keys.KeyPair.construct_public_key(kp),
      proteus.keys.KeyPair.construct_private_key(kp)
    );
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

  // Create a new aliceSession from serialisation, just to check
  const aliceSessionBuf = aliceSession.serialise();
  const restoredAliceSession = proteus.session.Session.deserialise(aliceId, aliceSessionBuf);

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

  // Wait, wait... why did out of order or next message fail before?
  const envelope2 = proteus.session.Session.encrypt(bobSession, "world");
  const pt2 = await restoredAliceSession.decrypt(new MockPreKeyStore(), envelope2);
  console.log('Alice decrypted:', new TextDecoder().decode(pt2));
}
test().catch(console.error);
