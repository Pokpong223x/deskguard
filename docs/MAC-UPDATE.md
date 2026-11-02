# Refresh an existing Mac/Xcode installation

Current source version: **1.0.2 (build 3)**. Settings shows this version at the bottom. Earlier versions displayed a hardcoded `DeskGuard 1.0`, so that label could not identify the installed source.

Run these commands in the same checkout whose Xcode workspace you intend to open:

```sh
git pull --ff-only origin main
git log -1 --oneline
npm ci
npx expo prebuild --platform ios --no-clean
open ios/DeskGuard.xcworkspace
```

The project uses Expo SDK 57. `--no-clean` applies app.json changes (including icons and native version) to the existing native project without deleting its directory. Native directories are intentionally gitignored; git pull alone does not synchronize them. If prebuild or CocoaPods reports an error, resolve it before proceeding.

In Xcode:

1. Select the DeskGuard scheme and your connected iPhone.
2. Under Product → Scheme → Edit Scheme → Run → Info, choose **Release** for Build Configuration so the current JavaScript is bundled into the installed app.
3. Confirm your existing Apple development team under Signing & Capabilities.
4. Choose Product → Clean Build Folder, then Product → Run.
5. In the installed app, check Settings for **DeskGuard 1.0.2 · Build 3**, the EN button in the header, and the quiet-on-still switch under Alerts.

If these are absent, provide the output of `pwd`, `git remote -v`, `git log -1 --oneline`, and the full Xcode build error (if any). Do not delete the installed app to troubleshoot: doing so may discard its local settings and history.

Verified on Windows: a fresh GitHub clone renders EN at a 390px viewport, switches Settings and Quiet when still into English, preserves English after reload, and raises no browser page errors. This does not verify Mac signing or physical iPhone installation.
