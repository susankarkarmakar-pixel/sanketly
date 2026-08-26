#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-susankarkarmakar-pixel/sanketly}"
ALIAS="ssa-pilot"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT
umask 077

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi
if ! command -v keytool >/dev/null 2>&1; then
  echo "Java keytool is required." >&2
  exit 1
fi

KEYSTORE="$TEMP_DIR/ssa-pilot.jks"
STORE_PASSWORD="$(openssl rand -hex 32)"
KEY_PASSWORD="$(openssl rand -hex 32)"

keytool -genkeypair \
  -keystore "$KEYSTORE" \
  -storetype JKS \
  -storepass "$STORE_PASSWORD" \
  -keypass "$KEY_PASSWORD" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 3072 \
  -validity 10000 \
  -dname "CN=Sanket Setu Alert Pilot, OU=Pilot, O=Sanket Setu Alert, L=Malda, ST=West Bengal, C=IN" \
  >/dev/null 2>&1

base64 -w 0 "$KEYSTORE" | gh secret set SSA_PILOT_KEYSTORE_BASE64 --repo "$REPO"
printf '%s' "$STORE_PASSWORD" | gh secret set SSA_PILOT_KEYSTORE_PASSWORD --repo "$REPO"
printf '%s' "$KEY_PASSWORD" | gh secret set SSA_PILOT_KEY_PASSWORD --repo "$REPO"
printf '%s' "$ALIAS" | gh secret set SSA_PILOT_KEY_ALIAS --repo "$REPO"

cat <<'MESSAGE'
Pilot signing secrets configured successfully.
The keystore and passwords were temporary local files and have been removed.
Keep this pilot key separate from the future production/Play signing key.
MESSAGE
