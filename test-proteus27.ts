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

  // If Alice encrypts, she ratchets her send chain.
  // If Bob decrypts, he ratchets his receive chain and initializes a new send chain.
  // Alice then needs to know Bob's new ratchet key. How does Bob send it?
  // Ah! It's automatically embedded in Bob's next message's envelope!

  // So Alice encrypts multiple messages to Bob, Bob encrypts multiple to Alice.

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

  const bobEnv1 = proteus.session.Session.encrypt(bobSession, "bob to alice 1");
  const bobEnv2 = proteus.session.Session.encrypt(bobSession, "bob to alice 2");

  // Alice decrypts
  const ptA1 = await aliceSession.decrypt(new MockPreKeyStore(), bobEnv1);
  const ptA2 = await aliceSession.decrypt(new MockPreKeyStore(), bobEnv2);

  console.log("Alice decrypted:", new TextDecoder().decode(ptA1), new TextDecoder().decode(ptA2));
}
test().catch(console.error);
