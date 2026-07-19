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
  const aliceId = new proteus.keys.IdentityKeyPair(aliceKp.public_key, aliceKp.secret_key);

  const bobKp = generateKeyPair();
  const bobId = new proteus.keys.IdentityKeyPair(bobKp.public_key, bobKp.secret_key);

  const bobPreKp = generateKeyPair();
  const bobPreKey = new proteus.keys.PreKey(1, bobPreKp);

  const bobIdentityKey = new proteus.keys.IdentityKey(bobId.public_key);
  const bobBundle = new proteus.keys.PreKeyBundle(bobIdentityKey, bobPreKey);

  const aliceSession = proteus.session.Session.init_from_prekey(aliceId, bobBundle);

  const envelope = proteus.session.Session.encrypt(aliceSession, "hello");
  console.log('Alice sent:', envelope);

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

  // Next message
  const envelope2 = proteus.session.Session.encrypt(bobSession, "world");
  const pt2 = await aliceSession.decrypt(new MockPreKeyStore(), envelope2);
  console.log('Alice decrypted:', new TextDecoder().decode(pt2));
}
test().catch(console.error);
