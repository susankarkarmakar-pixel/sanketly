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

  // prekey bundle signature: (publicIdentityKey: IdentityKey, preKey: PreKey) or (publicIdentityKey: IdentityKey, preKeyId: number, publicKey: PublicKey, signature?: Uint8Array | null, version?: number)
  // Let's use the first one:
  const bobIdentityKey = new proteus.keys.IdentityKey(bobId.public_key);
  const bobBundle = new proteus.keys.PreKeyBundle(bobIdentityKey, bobPreKey);

  const aliceSession = proteus.session.Session.init_from_prekey(aliceId, bobBundle);

  const envelope = proteus.session.Session.encrypt(aliceSession, "hello");
  console.log('Alice sent:', envelope);

  // Bob needs to decrypt this message. First message is a PreKeyMessage.
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
