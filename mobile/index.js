// This must run before Expo Router evaluates the SSA provider and libsodium.
// react-native-get-random-values uses the platform secure random source on Android/iOS.
import "react-native-get-random-values";
import "expo-router/entry";
