import { readFile, writeFile } from "node:fs/promises";

const path = process.argv[2] ?? "mobile/android/app/build.gradle";
const source = await readFile(path, "utf8");
const signingBlock = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            storeFile file(System.getenv('SSA_PILOT_KEYSTORE_FILE') ?: 'ssa-pilot.keystore')
            storePassword System.getenv('SSA_PILOT_KEYSTORE_PASSWORD')
            keyAlias System.getenv('SSA_PILOT_KEY_ALIAS')
            keyPassword System.getenv('SSA_PILOT_KEY_PASSWORD')
        }
    }
`;
const replaced = source.replace(/    signingConfigs \{[\s\S]*?^    buildTypes \{/m, `${signingBlock}    buildTypes {`);
if (replaced === source) {
  throw new Error(`Could not find the generated signingConfigs block in ${path}`);
}
const releaseUpdated = replaced.replace(/release \{\n            \/\/ Caution![\s\S]*?signingConfig signingConfigs\.debug/m, "release {\n            signingConfig signingConfigs.release");
if (releaseUpdated === replaced) {
  throw new Error(`Could not replace the generated release signing configuration in ${path}`);
}
await writeFile(path, releaseUpdated);
console.log(`Configured pilot signing in ${path}`);
