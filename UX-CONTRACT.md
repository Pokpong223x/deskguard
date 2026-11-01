# DeskGuard interaction contract

Sources: the user's selected DeskGuard brief, subsequent iOS requirement, the 2026-11-01 instruction to use the style in `C:\Users\usEr\Downloads\original-948190befeeb9aba7b613d8fe40b99d0.mp4`, and the subsequent request for screen-off monitoring and the phone's own unlock method. Visual ownership and the intentional desktop-to-mobile adaptation are recorded in DESIGN.md. Platform limits follow [Apple DTS on Core Motion/background execution](https://developer.apple.com/forums/thread/841001) and [Expo SDK 57 LocalAuthentication](https://docs.expo.dev/versions/v57.0.0/sdk/local-authentication/): this implementation provides OS authentication and an honest foreground dark-screen alternative, not continuous detection after real screen lock.

## Canonical UI Map

| Capability  | Canonical owner                              | Source of truth               | Allowed variants                           | Verification                                                      |
| ----------- | -------------------------------------------- | ----------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Form        | src/components/ui.tsx PinField and App modal | This contract                 | setup, change, disarm                      | PIN mismatch/wrong PIN/success flow                               |
| Toast       | src/components/ui.tsx Feedback               | Hook error/notice state       | info, error                                | persistent feedback and modal errors                              |
| Date        | App EventRow Intl.DateTimeFormat             | Device-local Thai time        | read only                                  | actual persisted timestamp                                        |
| Scrollbar   | Native ScrollView / web global CSS           | Platform scroll behavior      | screen and modal                           | narrow screen scrolling                                           |
| CRUD        | useDeskGuard + storage service               | Local history and settings    | clear with confirmation                    | persisted reload and delete                                       |
| Carousel    | src/components/GuardCards.tsx                | This contract                 | automatic idle, manual                     | swipe, arrow, pause, reduced-motion and lifecycle checks          |
| Device auth | src/services/deviceAuth + useDeskGuard       | OS authentication result      | native device credentials; web unavailable | success/cancel/failure/stale-result handling                      |
| Dark screen | src/components/DarkGuardScreen.tsx           | Active foreground guard phase | armed, alarm, explicit demo                | monitoring persists; return does not disarm; real lock interrupts |

No dropdowns, tables, remote API, billing, accounts, or server authorization are part of the app.

## State and navigation

Three tabs: เฝ้าระวัง, ประวัติ, ตั้งค่า. Tab changes preserve the runtime guard. Detector phases are idle → countdown → armed → alarm, with interrupted for a stopped active session awaiting owner confirmation; authorized stop returns idle. Before arming, either OS authentication must be available or an app PIN must already exist. Five-second countdown precedes sensor calibration; calibration is not claimed as armed. Cancel during countdown is immediate. Armed, alarm, and interrupted states require successful OS authentication or the configured app PIN to end through the UI. An alarm or interruption brings the monitor tab forward. Settings and mode changes remain unavailable until the session is ended.

Navigation does not automatically dismiss important interruption, permission, or storage feedback. These messages remain available until explicitly dismissed or resolved. Routine navigation must not erase the only explanation that protection stopped.

## Feature carousel

The monitor presents three feature cards for guard, motion/settings, and history. These cards are entry points and summaries of existing functionality; the design does not add capabilities suggested by the sports source. The primary start/cancel/stop action remains outside the moving cards and vertical scrolling, directly above bottom navigation.

Horizontal swiping has visible previous/next controls. A pause/resume control makes automatic movement optional. Cards advance every six seconds only when the guard is idle, the app is in the foreground, and reduced motion is not enabled. Direct interaction pauses automatic movement. Countdown and alarm snap back to the first card so the guard state stays the immediate focus. Active sessions do not automatically rotate cards; card navigation cannot cancel or stop protection without the existing guard rules.

Reduced motion disables automatic advancement and decorative transitions while preserving manual navigation. Backgrounding stops both automatic motion and foreground monitoring under the existing interruption policy. App resume never silently rearms the guard.

Backgrounding, real screen lock, and sensor loss stop foreground monitoring. An armed/alarm session becomes interrupted and records that interruption; the UI explicitly states that detection is not running and requires authentication to end the round before starting again. A cancelled countdown does not need disarm authentication. No session is silently rearmed. The app cannot prevent force-quitting, volume changes, or device locking, and does not persist an anti-theft lock across force quit. The UI and README disclose foreground-only scope.

The OS authentication sheet may temporarily emit inactive; this must not be treated as authorization or automatically end an active session. A genuine background transition invalidates an in-flight result, and late results cannot end another session. Cancellation/failure keeps the round protected from UI disarm, with alarm audio restored on foreground return if that same round remains in alarm. No success is simulated on web.

The user can open “เปิดหน้าจอมืด” while armed or in alarm. This is a black foreground view using the existing keep-awake session, labeled “หน้าจอมืด · จอยังเปิดอยู่”; it is not hardware screen-off or an iOS lock screen. It displays active/alarm status and elapsed time, preserves demo labeling, offers authentication to stop, and offers return to the monitor without stopping. Real backgrounding exits the dark screen and presents the interruption honestly on return.

## Persistence and data

Settings and up to 100 latest events are stored locally. History is displayed in batches of 15 with an explicit Load more action. Clear history names the count, requires an app-owned confirmation, offers cancel, and closes only after storage succeeds. There is no network sync or account.

The app PIN is optional when OS authentication is available, and required as an alternative before arming otherwise. It is four digits, confirmed on creation, current app PIN required for change, salted and hashed before storage. Native secure storage owns the verifier; browser local storage is for demonstration only. The app PIN is distinct from the phone passcode and never logged or saved raw. Errors preserve context and never claim success before persistence. There is no in-app forgotten-PIN recovery in this prototype; iOS Keychain may survive reinstall, so a developer reset would be required. This is not a hardened anti-theft product.

Device authentication is performed only by the OS via LocalAuthentication with system passcode fallback enabled. Passcode-only devices may qualify without enrolled biometrics. DeskGuard receives the result, not the phone passcode or biometric data, and never collects the phone passcode in its own text field. Face ID-capable iPhones in Expo Go offer “รหัสเครื่อง” when a device credential exists, explain that Face ID needs a development build, and rely on the OS passcode fallback rather than falsely advertising Face ID. A development build is not incorrectly classified as Expo Go. Web shows device authentication unavailable. Native provisioning and physical-device behavior remain outside browser verification.

## Sensor and demo honesty

Real sensors are explicitly connected on the device. No fake motion enters device mode. Demo is deliberately selected and visibly labeled across monitor, graph and history. Simulate movement drives the same detector logic. Leaving demo cannot inherit an armed phase. Sensor permission failures, unavailable hardware, and stale samples provide corrective instructions.

Use a compact demo badge plus one short persistent explanation on the monitor. Avoid repeating the same routine demo notice in multiple feedback panels; event history and the graph still identify their own data source. Suppressing duplicate explanatory text must not hide sensor errors or interruption messages.

## Interaction and accessibility

### Custom alarm audio

Settings owns one selected custom sound. Native Files/browser file selection accepts MP3, M4A, WAV, AAC or MP4 up to 10 MiB, with actual-size checks and decoder validation before replacing the selection. MP4 imports extract an AAC audio track into an audio-only M4A file locally; saved output contains no video track. The input video and output audio must both fit the size limit. MP4 without audio, unsupported audio codecs, encrypted tracks, and malformed files are rejected with explanatory feedback. Cancel, invalid files, failed extraction, failed copy, and failed persistence keep the previous selection. Native storage copies into app Documents with generated filenames; web persists a Blob in IndexedDB. Neither audio nor video uploads to a server. Reset removes only the app-owned copy/selection; the user's original file remains intact.

The selected filename and size remain visible. Extracted audio uses the M4A filename and shows “เสียงจากวิดีโอ” with the original video filename; filenames wrap naturally. The import action says “เลือกเสียงหรือวิดีโอ” before selection and “เปลี่ยนไฟล์” afterward. Supporting copy explains that only the video's audio is used and processing/storage stay on the device. Import/reset are blocked during a guard session; importing blocks starting a new session. Preview has an explicit stop action and ends after ten seconds or when leaving settings, backgrounding, starting protection, or changing the file. Preview is explicitly allowed with the alert-sound switch off. Alarm playback loops the selected sound from its beginning. Unreadable custom playback falls back to the bundled sound with visible feedback; imported-file errors are separate from active alarm playback errors. Returning from Files reconnects sensor readings without resuming a previous guard session.

### Shared controls

All actions use native Pressable/Button roles; native Switch and TextInput provide keyboard, touch, and accessibility semantics. Icons accompany text; icon-only actions have names. Modal content stays within the viewport and keyboard bounds. Escape/platform back closes a cancelable app dialog without disarming; active alarms require successful authentication unless monitoring is separately interrupted. While an OS authentication request is pending, duplicate requests and competing disarm actions are blocked. Modal errors are visible inside the dialog. PIN reveal is explicit and resets on reopening. Persistent feedback announces changes politely. Data charts have text equivalents. Date/time uses th-TH in the device's local timezone.

The carousel exposes its current card and named controls without requiring drag gestures. Mascots are decorative when adjacent copy communicates the same meaning. Bundled Anuphan supports Thai and native font scaling; headings, labels, and PIN errors must remain readable on narrow screens. Native safe areas and keyboard avoidance remain required across all three tabs.

## Verification limits

Automated detector tests prove signal-processing edge cases, not real iPhone sensitivity or speaker behavior. Typecheck and iOS bundle export verify compile/bundle compatibility. Browser demo verifies interaction and persistence. Final physical iPhone test is required for sensor permission, real movement, sound, haptics, and lifecycle behavior. Device authentication additionally requires native success/cancellation/failure, OS passcode fallback, true-background-during-auth stale-result rejection, and Expo Go limitation checks. Dark-screen verification must distinguish foreground monitoring from a real lock; browser results cannot establish continuous background detection.

The selected-clip reskin additionally requires rendered visual comparison against the extracted frame/contact sheet, documenting the intentional mobile adaptation, plus runtime checks of swipe/arrows, automatic pause, reduced motion, and the unchanged end-to-end guard/PIN flow. Design documentation alone does not establish that these checks passed.
