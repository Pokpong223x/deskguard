# DeskGuard verification — 2026-11-01

## Native iPhone IPA for Sideloadly — 2026-11-01

- EAS build `1dbe1007-3505-4daf-936b-3e969bf1ed49` finished successfully at 21:20 Asia/Bangkok using the `sideload` custom profile: https://expo.dev/accounts/ppmb/projects/deskguard/builds/1dbe1007-3505-4daf-936b-3e969bf1ed49
- Checked Expo account usage before submission: Free plan, 0 of 15 included iOS builds used, no add-ons, estimated overage $0. Used one cloud build without Apple Developer Program signing credentials.
- Release native compilation passed on the EAS macOS worker for physical iPhone (`iphoneos`, ARM64), minimum iOS 16.4. The custom workflow packages the app without signing for Sideloadly to sign on Windows.
- Downloaded `artifacts/DeskGuard-unsigned.ipa` (9.34 MiB), verified all ZIP entry CRCs and the cloud-generated SHA-256: `b98bee361fbe23923b3c4a8ee343818ee7768e2d9c90ce681eb00ff5ac5d8d99`.
- Inspected the actual packaged `Info.plist`: bundle ID `com.deskguard.studentapp`, physical iPhone platform, Thai `NSFaceIDUsageDescription` and `NSMotionUsageDescription` present. Verified the main executable is ARM64 Mach-O and `main.jsbundle` is embedded (2,387,365 bytes).
- No embedded provisioning profile is expected: this IPA requires Sideloadly signing before installation. It is not a direct Safari/OTA installation package.
- Native build metadata is in `artifacts/build-info.json`; local verification is in `artifacts/local-verification.json`. Artifacts are excluded from source and subsequent EAS uploads.
- Sideloadly signing/install, Face ID success/cancel, device passcode fallback, and real sensor/audio behavior remain to be tested on the user's iPhone. Earlier browser/unit checks below are separate from this successful native compilation.

## Automated checks

- `npm run typecheck`: passes.
- `npm test`: 12 motion detector cases pass, including stationary noise, isolated taps, acceleration, rotation, tilt, variable intervals, stale data, invalid readings, sensitivity and one-shot triggering.
- `npx expo-doctor`: 21/21 checks pass.
- `npx expo install --check`: dependencies match Expo SDK 57.
- `npm run export:web`: web bundle and assets export successfully.
- `npm run export:ios`: iOS Hermes bundle and assets export successfully. This is not a signed IPA or a hardware test.
- Premium UI static audit: zero findings. DESIGN.md lint: zero errors; prose-owned component color references produce informational orphan-token warnings.

## Browser interaction checks

Verified in the local browser at a 390 × 844 viewport, plus the default desktop viewport:

- Explicitly enter demo mode; device mode on desktop cannot falsely arm.
- Create PIN; mismatched confirmation shows an inline error.
- Start five-second countdown, calibrate, and reach armed state.
- Simulate sustained movement through the real detector and reach alarm state.
- Wrong PIN keeps the alarm active; correct PIN stops it.
- Demo event appears in history with a demo label and measured values.
- Device-only filter correctly displays an empty state.
- PIN, sensitivity, sound setting, and history survive reload.
- History clear dialog names the record count; cancel preserves data; confirm removes the test event.
- Clear dialog initially focuses the safe action.
- Settings remain reachable by scrolling. The primary action now stays above bottom navigation while the content scrolls.
- Final preview is idle in device mode, uses medium sensitivity and sound enabled, and has test PIN `1234`. iPhone storage is separate. Choose demo mode to try the flow on desktop.

## Clip-inspired redesign checks

- Matched the selected video with white canvas, black Anuphan headings, gray card tops, pastel illustration panels, generated mascot PNGs, and horizontal card movement.
- Checked 390 × 844, 320 × 740, and 1024 × 900 CSS-pixel browser viewports at DPR 1. Narrow document width stays inside the viewport; the wide layout remains a centered mobile app.
- Repeated countdown → simulated sustained motion → alarm → wrong PIN rejected → correct PIN disarms. The resulting event appears with a demo label in history.
- Fixed the pause button's focus/click race and verified that one click changes Pause to Play. Manual arrows update the selected card. Active countdown/alarm returns to the first card and disables autoplay.
- Replaced fixed copy/card heights with intrinsic measurement to accommodate larger text. Native Larger Text and VoiceOver still require an iPhone check.
- Restyled and visually inspected history and settings. Corrected React Native Web's active switch thumb to the theme's white color.
- Final browser console has no errors. Typecheck, final web export and final iOS Hermes export pass; all 12 existing detector tests pass.
- Source comparison and final screenshots are recorded in `design-qa.md` and `docs/reference/comparison.jpg`.

## Custom alarm sound — 2026-11-01

- Added `expo-document-picker` and `expo-file-system` using `expo install`; SDK compatibility check passes.
- `npm test`: all 16 cases pass, including four new checks for file types/sizes, metadata recovery, and native path containment. Typecheck passes.
- Both iOS Hermes and web exports succeed with the custom-audio implementation. These are bundle checks, not signed-device builds.
- Browser file chooser successfully imports a locally generated 12-second WAV fixture; selected filename and actual size appear. Preview enters playing state and returns to stopped state automatically.
- Reload restores the selected sound from IndexedDB. A file larger than 10 MiB is rejected immediately; a malformed WAV is rejected by decoder readiness timeout. Both retain the previous selection.
- A rejected import does not leak its validation error into the subsequent alarm screen. Demo countdown, armed state, simulated motion, alarm and PIN disarm succeed with the selected custom sound.
- Import, preview, and reset are disabled during an active guard session. Source review confirms pending preview cancellation on navigation/background and source replacement; preview cannot resume late after cancellation.
- Manual stop, stopping on settings-tab exit, keyboard preview activation, and reset to the default sound pass in the browser. The generated test audio was removed from the active selection afterward.
- Visually inspected the new panel at 390px and 320px widths; stacked controls and wrapping filenames/captions fit. Evidence: `docs/custom-alarm-selected.jpg`, `docs/custom-alarm-320.jpg`, and `docs/custom-alarm-preview.jpg`.
- The browser automation file chooser cannot cancel an intercepted selection (it requires at least one file). Native/browser cancellation branches and empty-selection recovery were reviewed in code; real picker dismissal remains a device/manual check.
- The original user file is never deleted. Native app-owned copies and web Blob selections are replaced only after successful persistence. No sound is sent to a server.

### Physical-device checks still required

No iPhone was connected to this Windows workspace. Real accelerometer/gyroscope permissions, sensor thresholds, audible alarm, vibration, keep-awake, and native background interruption require the physical-device checklist in README.md. Browser simulation cannot validate these.

Custom audio also needs native Files/iCloud import, return-from-picker sensor reconnection, audio output volume, supported codec variants, silent-mode behavior, and saved-file persistence checked on an iPhone. Simulator/browser playback state does not prove speaker output on that device.

The runtime uses Expo SDK 57 to match the current Expo Go physical-device guidance. npm audit reports 13 advisories inherited through Expo build-tool dependencies; the suggested major SDK upgrade was not forced because it changes Expo Go compatibility. Review dependency advisories when upgrading the SDK.

## MP4 audio import — 2026-11-01

- Added pinned `mp4box@2.5.0` for local AAC remuxing. MP4 input produces an audio-only M4A; video samples are omitted and audio samples are copied without transcoding. No backend or new native module is required.
- All 31 tests pass: 12 detector, 6 file/metadata validation, 8 MP4 extraction, and 5 web import preparation cases. Ordinary and fragmented MP4 fixtures retain every AAC sample's bytes, decode/composition timestamps, duration, timescale, size, and edits while containing no video track.
- Invalid/truncated files, impossible sample tables, out-of-range sample offsets, unsupported/encrypted audio, audio configuration changes, silent video, and inputs above 10 MiB are rejected. Actual source byte size is checked independently of picker metadata. Prepared Blob URLs are released without revoking the source URL.
- FFmpeg fully decoded both extracted fixture outputs as AAC audio with no video stream. Typecheck and final web/iOS Hermes exports pass. iOS export is a bundle check, not native playback validation.
- Browser chooser imported `video-aac.mp4` and displayed `video-aac.m4a`, its audio-only size, and original source name. Preview entered playing state and finished; after reload the selected M4A and source label were restored and preview still worked.
- A silent MP4 produced an actionable error and retained the previously selected M4A. The selected extracted sound completed the demo countdown → movement → alarm → PIN disarm flow without a playback/fallback error. Browser error logs were empty.
- Reset restored the default alarm; the browser was returned to idle device mode afterward. Temporary responsive viewport overrides were reset. A demo event remains marked as simulated in browser history.
- Visually checked the imported-video panel at 390 × 844 and 320 × 740, with no horizontal overflow. Evidence: `docs/mp4-alarm-selected.jpg` and `docs/mp4-alarm-320.jpg`.
- Strict Premium UI audit reports zero findings; its unchanged JSON result is retained in `premium-audit.json`. The existing design tokens, canonical settings panel, and button/focus behavior remain in use.
- Physical iPhone Files/iCloud import, AAC variants, saved-file playback after restarting Expo Go, looping, silent-switch behavior, and sensor reconnection after picker dismissal remain device checks. Picker cache copies may remain until iOS reclaims cache; only the extracted M4A is retained in the alarm's persistent storage.

## Device authentication and foreground dark screen — 2026-11-01

- Integrated Expo LocalAuthentication with OS passcode fallback. Passcode-only phones qualify; Face ID-capable Expo Go uses the system passcode label and explains that Face ID requires a development build. Web never simulates biometric success. App PIN remains a separate optional fallback.
- Added `expo-local-authentication`, `expo-dev-client`, and `eas.json` for a physical iOS development build. Native config introspection confirms the Thai `NSFaceIDUsageDescription`; no background execution mode is added. `npm start` explicitly targets Expo Go and `npm run start:dev` targets a development client. No EAS cloud build, account login, device provisioning, or signed IPA was performed.
- The black-screen modal keeps the app/display on and explicitly labels this limitation. Returning to the monitor does not stop protection. Actual backgrounding stops detection, records interruption, and leaves an active session requiring owner authentication to end; it never silently rearms. Force-quitting still ends this in-memory prototype session.
- OS-authentication-related `inactive` is handled separately from real backgrounding. Backgrounding/unmount invalidates pending results. Failed/cancelled auth cannot authorize disarm; stale sensor data cannot silence an already-triggered alarm. Audio focus is restored when an existing alarm returns from its auth sheet.
- All 39 tests pass, including four device-auth policy cases and four lifecycle regression cases. Typecheck, Expo dependency compatibility, and final web/iOS Hermes exports pass. These checks do not execute iOS LocalAuthentication or validate speaker output on hardware.
- Browser demo: countdown → armed → dark screen → auth sheet; wrong app PIN preserves armed state, closing the sheet preserves monitoring, return-to-monitor preserves monitoring, simulated movement reaches alarm, dark mode shows the alarm, and correct test PIN ends the session. Web settings correctly disclose unavailable device authentication. Browser error logs are empty; preview returned to idle device mode afterward.
- Visually inspected dark mode at 390 × 844 and 320 × 640 with readable labels and reachable actions. Evidence: `docs/dark-guard-screen.jpg` and `docs/dark-guard-320.jpg`. Responsive overrides were reset.
- DESIGN lint has zero errors and 20 informational unused-token warnings because component token ownership is described in prose. The strict Premium UI auditor reports two false positives in `DarkGuardScreen.tsx`: it lowercases React Native `Button` into an HTML button and checks `onclick`, ignoring the real `onPress` callbacks. Both callbacks were exercised above; the unmodified audit output is retained in `premium-audit.json`.
- Still requires a physical iPhone: OS passcode/Face ID/Touch ID success, cancellation/failure, true background during authentication, native alarm audio-focus recovery, actual lock/unlock interruption, and keep-awake behavior. Follow the checklist in README.md. Continuous motion alarms with the real display locked/off are not implemented or claimed; see [Apple DTS](https://developer.apple.com/forums/thread/841001) and [Expo LocalAuthentication](https://docs.expo.dev/versions/v57.0.0/sdk/local-authentication/).
