# MOBILE

## 1. Create the app on the day

Remove the placeholder file, then initialize the app from the repo root:

```bash
rm mobile/.gitkeep
npx @react-native-community/cli@latest init <AppName> --directory mobile --skip-git-init
cd mobile && npx react-native doctor
```

Do not let a nested `.git` appear inside `mobile/`.

## 2. Warm the Gradle cache at home

Campus may block `dl.google.com` and `plugins.gradle.org`, so warm the cache on a network that can reach them.

Create a throwaway React Native app, add the libraries likely needed for navigation and HTTP such as react-navigation and its peers, react-native-screens, safe-area-context, gesture-handler, async-storage, and axios, then build once online and once offline:

```bash
cd android && ./gradlew assembleDebug
./gradlew assembleDebug --offline
```

Check that `~/.gradle/wrapper/dists` exists before travel.

## 3. Phone setup

Enable USB debugging on the phone and verify the cable with:

```bash
adb devices
```

`unauthorized` means accept the prompt on the phone. `no permissions` means a udev rule is needed for the vendor ID.

## 4. Reaching the backend

If the phone is cabled to the same laptop that runs the backend, reverse the ports and call the host loopback address:

```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081
```

Use `http://localhost:3000` in the app.

If the backend runs on another laptop, use that laptop's hotspot IP from `hostname -I`, for example `http://192.168.x.x:3000`.

Keep the base URL in one config file and read it from an env var or constant, not from hard-coded copies across screens.

## 5. Cleartext HTTP

Debug builds allow `http://` by default. Release builds block cleartext unless `android:usesCleartextTraffic="true"` is set in `AndroidManifest.xml`.

Decide early whether the grader needs a release APK.

## 6. Appium

Install Appium 2 and the UiAutomator2 driver:

```bash
npm i -g appium@2
appium driver install uiautomator2
appium
```

`APP_PATH` should point at the debug APK, usually `mobile/android/app/build/outputs/apk/debug/app-debug.apk`.

## 7. RAM tips

Use the physical phone, never the emulator.
Set `org.gradle.jvmargs=-Xmx2g` in `~/.gradle/gradle.properties`.
Unset or lower `_JAVA_OPTIONS`.
Close browsers and IDE windows before a Gradle or Appium run.
