#!/usr/bin/env bash
set -Eeuo pipefail

# Install the same SSA APK on three explicitly selected Android devices in parallel.
# Default package: in.sanketsetu.alert

PACKAGE_NAME="in.sanketsetu.alert"
APK_PATH=""
DEVICE_A="${SSA_DEVICE_A:-}"
DEVICE_B="${SSA_DEVICE_B:-}"
DEVICE_C="${SSA_DEVICE_C:-}"
DRY_RUN=0
LAUNCH=0
CLEAR_DATA=0

usage() {
  cat <<'USAGE'
Usage:
  scripts/install-ssa-apk-3-devices.sh --apk PATH --a SERIAL --b SERIAL --c SERIAL [options]

Required:
  --apk PATH       APK to install on all three devices
  --a SERIAL       ADB serial for Device A (sender)
  --b SERIAL       ADB serial for Device B (relay)
  --c SERIAL       ADB serial for Device C (recipient)

Options:
  --package NAME   Android application ID (default: in.sanketsetu.alert)
  --launch         Launch SSA after all three installations succeed
  --clear-data     Clear SSA app data before installing (DESTROYS local identity, alerts, and queues)
  --dry-run        Print planned commands without requiring devices or installing anything
  -h, --help       Show this help

Environment alternatives:
  SSA_DEVICE_A, SSA_DEVICE_B, SSA_DEVICE_C may provide the three serials.

Examples:
  scripts/install-ssa-apk-3-devices.sh \
    --apk ./ssa-development.apk \
    --a R58M123A \
    --b R58M123B \
    --c R58M123C

  SSA_DEVICE_A=R58M123A SSA_DEVICE_B=R58M123B SSA_DEVICE_C=R58M123C \
    scripts/install-ssa-apk-3-devices.sh --apk ./ssa-development.apk --launch
USAGE
}

log() {
  printf '[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 2
}

run_or_print() {
  if (( DRY_RUN )); then
    printf '+ '
    printf '%q ' "$@"
    printf '\n'
  else
    "$@"
  fi
}

while (($#)); do
  case "$1" in
    --apk)
      (($# >= 2)) || fail "--apk requires a path"
      APK_PATH="$2"
      shift 2
      ;;
    --a)
      (($# >= 2)) || fail "--a requires an ADB serial"
      DEVICE_A="$2"
      shift 2
      ;;
    --b)
      (($# >= 2)) || fail "--b requires an ADB serial"
      DEVICE_B="$2"
      shift 2
      ;;
    --c)
      (($# >= 2)) || fail "--c requires an ADB serial"
      DEVICE_C="$2"
      shift 2
      ;;
    --package)
      (($# >= 2)) || fail "--package requires an application ID"
      PACKAGE_NAME="$2"
      shift 2
      ;;
    --launch)
      LAUNCH=1
      shift
      ;;
    --clear-data)
      CLEAR_DATA=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

[[ -n "$APK_PATH" ]] || fail "--apk is required"
[[ -n "$DEVICE_A" && -n "$DEVICE_B" && -n "$DEVICE_C" ]] || fail "all of --a, --b, and --c are required"
[[ "$DEVICE_A" != "$DEVICE_B" && "$DEVICE_A" != "$DEVICE_C" && "$DEVICE_B" != "$DEVICE_C" ]] || fail "Device A, B, and C must have different ADB serials"

if (( ! DRY_RUN )); then
  command -v adb >/dev/null 2>&1 || fail "adb was not found on PATH; install Android SDK Platform-Tools"
  [[ -f "$APK_PATH" ]] || fail "APK does not exist: $APK_PATH"
  [[ "$APK_PATH" == *.apk ]] || fail "APK path must end in .apk: $APK_PATH"
else
  log "Dry run: device availability and APK existence checks are skipped"
fi

if (( CLEAR_DATA )); then
  log "WARNING: --clear-data will erase each device's SSA identity, alerts, outbox, and relay queue"
fi

if (( DRY_RUN )); then
  log "Planned package: $PACKAGE_NAME"
  log "Device A / sender: $DEVICE_A"
  log "Device B / relay:  $DEVICE_B"
  log "Device C / target: $DEVICE_C"
  for pair in "A:$DEVICE_A" "B:$DEVICE_B" "C:$DEVICE_C"; do
    role="${pair%%:*}"
    serial="${pair#*:}"
    if (( CLEAR_DATA )); then
      run_or_print adb -s "$serial" shell pm clear "$PACKAGE_NAME"
    fi
    run_or_print adb -s "$serial" install -r -d "$APK_PATH"
    run_or_print adb -s "$serial" shell pm path "$PACKAGE_NAME"
    if (( LAUNCH )); then
      run_or_print adb -s "$serial" shell monkey -p "$PACKAGE_NAME" 1
    fi
    log "Device $role complete"
  done
  exit 0
fi

get_state() {
  local serial="$1"
  adb -s "$serial" get-state 2>/dev/null | tr -d '\r\n' || true
}

for pair in "A:$DEVICE_A" "B:$DEVICE_B" "C:$DEVICE_C"; do
  role="${pair%%:*}"
  serial="${pair#*:}"
  state="$(get_state "$serial")"
  [[ "$state" == "device" ]] || fail "Device $role ($serial) is not ready; adb state is '$state'. Run adb devices -l and accept USB debugging."
done

work_dir="$(mktemp -d -t ssa-apk-install.XXXXXX)"
cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

install_one() {
  local role="$1"
  local serial="$2"
  local log_file="$work_dir/$role.log"

  {
    log "Device $role ($serial): starting"
    if (( CLEAR_DATA )); then
      log "Device $role: clearing app data"
      adb -s "$serial" shell pm clear "$PACKAGE_NAME"
    fi
    log "Device $role: installing $APK_PATH"
    adb -s "$serial" install -r -d "$APK_PATH"
    log "Device $role: validating package $PACKAGE_NAME"
    adb -s "$serial" shell pm path "$PACKAGE_NAME"
    if (( LAUNCH )); then
      log "Device $role: launching SSA"
      adb -s "$serial" shell monkey -p "$PACKAGE_NAME" 1
    fi
    log "Device $role: complete"
  } >"$log_file" 2>&1
}

log "Installing one APK concurrently on Device A, Device B, and Device C"
install_one A "$DEVICE_A" & pid_a=$!
install_one B "$DEVICE_B" & pid_b=$!
install_one C "$DEVICE_C" & pid_c=$!

status_a=0
status_b=0
status_c=0
wait "$pid_a" || status_a=$?
wait "$pid_b" || status_b=$?
wait "$pid_c" || status_c=$?

for role in A B C; do
  printf '\n===== Device %s =====\n' "$role"
  cat "$work_dir/$role.log"
done

if (( status_a != 0 || status_b != 0 || status_c != 0 )); then
  printf '\nInstallation failed: A=%s B=%s C=%s\n' "$status_a" "$status_b" "$status_c" >&2
  exit 1
fi

log "All three SSA installations completed successfully"
