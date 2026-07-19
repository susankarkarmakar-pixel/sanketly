import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';

async function test() {
  await libsodium.ready;

  // Let's create keypairs using libsodium directly if RandomUtil fails
  const aliceSodiumKp = libsodium.crypto_sign_keypair();
  const aliceKp = new proteus.keys.KeyPair(
    proteus.keys.KeyPair.construct_public_key(aliceSodiumKp),
    proteus.keys.KeyPair.construct_private_key(aliceSodiumKp)
  );

  console.log(aliceKp);
}
test().catch(console.error);
