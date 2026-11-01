---
version: alpha
name: DeskGuard
description: A Thai iPhone motion alarm with bold editorial type, playful mascots, and sliding pastel cards.
colors:
  background: "#FFFFFF"
  surface: "#F5F5F5"
  ink: "#171717"
  muted: "#636363"
  primary: "#171717"
  primaryPressed: "#333333"
  primaryWash: "#ECECEC"
  line: "#E3E3E3"
  success: "#306B46"
  successWash: "#E5F2D4"
  warning: "#785A11"
  warningWash: "#F6F1C8"
  danger: "#A72F3D"
  dangerWash: "#F9D9DE"
  lavender: "#C9CEF4"
  yellow: "#F0ED91"
  mint: "#CAE999"
  pink: "#EF8E9B"
  lilac: "#D6A5F5"
  orange: "#FF8D4A"
  chart: "#7757B8"
  onPrimary: "#FFFFFF"
  darkScreen: "#000000"
typography:
  body:
    fontFamily: "AnuphanRegular, sans-serif"
  control:
    fontFamily: "AnuphanMedium, sans-serif"
  display:
    fontFamily: "AnuphanBold, sans-serif"
  data:
    fontFamily: "Menlo, monospace"
rounded:
  control: "12px"
  panel: "28px"
  sheet: "28px"
spacing:
  page: "24px"
  section: "16px"
  control-height: "56px"
components:
  button: {}
  panel: {}
  pin-field: {}
  feedback: {}
  motion-chart: {}
  feature-carousel: {}
  mascot: {}
---

# DeskGuard Design System

## Overview

The product is a student sensor project for a Thai-speaking iPhone owner. Its job is to arm a foreground motion detector, show honest sensor state, and allow the owner to stop the alarm with device authentication or an app PIN. iOS cannot provide continuous locked-screen motion monitoring for this use case; an explicitly labeled dark-screen mode keeps the app and display on.

On 2026-11-01 the user directly selected the visual style in `C:\Users\usEr\Downloads\original-948190befeeb9aba7b613d8fe40b99d0.mp4`. Source evidence is captured in `docs/reference/frame-00.png` and `docs/reference/contact-sheet.jpg`. The clip shows a desktop sports-club page with a white canvas, large black editorial type, rounded pale-gray cards, colorful illustration panels, and a horizontal moving card sequence. This is the authoritative visual direction for the reskin.

DeskGuard adapts that desktop composition to a native mobile screen rather than copying the sports website's information architecture. The signature is a horizontally sliding set of three illustrated feature cards: guard, motion/settings, and history. The headline and black primary action frame this carousel. The illustrations reinterpret the clip's simple cheerful silhouettes as phone monitoring, motion, and history mascots; they do not imply new app capabilities.

`src/theme.ts` remains the canonical runtime token owner. This file mirrors the user-driven token change; shared React Native primitives and App styles consume that theme. Bundled Anuphan files from `@expo-google-fonts/anuphan` are loaded through `expo-font` as `AnuphanRegular`, `AnuphanMedium`, and `AnuphanBold`, providing Thai-capable type without a runtime font download. Native monospace is reserved for measured readings. Locale is Thai; the brand and sensor names remain English. Japan-market guidance is not applicable.

### User-driven token change

| Previous direction                        | Selected direction                             | Reason                                                          |
| ----------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| Blue-gray canvas and cobalt actions       | White canvas and near-black actions            | Matches the selected clip's editorial contrast                  |
| Circular shield instrument and tick marks | Illustrated pastel feature carousel            | Recreates the clip's memorable card structure and movement      |
| System body font                          | Bundled Anuphan with regular/medium/bold roles | Preserves the reference's confident typography in readable Thai |
| Tonal instrument rings                    | Lavender, yellow, and mint illustration panels | Carries the source palette into the existing app workflows      |

These changes intentionally replace the first visual identity at the user's request; they do not change detector or PIN behavior.

## Colors

White `background` and pale-gray `surface` reproduce the source's spacious base. `ink` and `primary` are near-black; black actions use `onPrimary` for white labels. `primaryPressed` and `primaryWash` supply interaction states without introducing a second accent system. `line` and `muted` support separators and quieter copy.

Lavender, yellow, and mint distinguish the lower illustration panels of the three feature cards. Orange, pink, and lilac belong to the mascot artwork. These expressive colors do not replace semantic status colors: success green still means an armed detector, warning amber identifies simulation or interruption, and danger red identifies detected movement. The purple `chart` token marks real or explicitly labeled demo samples. Text and icons accompany all status colors. The app supports a light theme in this iteration.

## Typography

Bundled Anuphan is used throughout the product: bold for the compact wordmark, two-line editorial heading, card titles, and primary actions; medium for controls and labels; regular for explanatory text. The headline is deliberately larger than supporting content, following the clip's black typographic hierarchy. Use native Menlo/monospace only for measured acceleration, rotation, and session readings. Do not apply forced uppercase or wide tracking to Thai. Preserve Thai marks, natural wrapping, readable line height, and native font scaling; avoid clipping a longer status or validation message to preserve a decorative layout.

## Layout

The mobile adaptation uses one column, 24px side gutters, 16px section gaps, and a maximum browser-preview width of 520px. A large black headline sits above the horizontally swipable feature cards. Each card has a pale-gray text area and a pastel illustration area; a glimpse of the neighboring card communicates horizontal movement. Previous, next, and pause controls provide visible alternatives to swiping.

The primary start/cancel/stop action stays outside both the carousel and vertical ScrollView, directly above bottom navigation, so it remains accessible while reviewing the graph. The current status and real sample chart retain their functional prominence. One vertical ScrollView owns each tab's content; the carousel owns only horizontal motion. Bottom navigation respects native safe areas. History and settings use the same black typography, gray surfaces, pastel accents, and restrained mascot thumbnails. Modal content scrolls and responds to the native keyboard.

Source art is a 3200×2400 desktop presentation; the implementation is an iPhone app. Differences in column count, viewport ratio, controls, language, and product content are intentional adaptation, not a claim of pixel-for-pixel website reproduction.

## Elevation & Depth

Use flat gray and pastel fills as in the reference. Spacing and typography establish hierarchy before borders. Avoid gradients, glossy effects, heavy shadows, nested elevated cards, or a return to instrument rings. The app-owned PIN/delete modal retains a translucent scrim so its task stays distinct from the monitor behind it.

## Shapes

Controls use 12px radius, panels and carousel cards 28px, and sheets 28px. All primary buttons are at least 56px high; secondary actions at least 44px. Small icons have no standalone action unless the touch target is padded. Carousel text expands naturally; each card reports its height and the scroller follows the tallest card plus animation clearance.

## Components

`src/components/ui.tsx` owns Button, Panel, PinField, Feedback, Label, and Icon. Button has solid/outline/ghost emphasis and primary/neutral/danger intent; pending occupies the same geometry and disables duplicate actions. Selected sensitivity and navigation states include labels. PIN fields are masked with explicit reveal controls, numeric keyboards, and validation errors. Dialog cancellation remains possible while the alarm continues.

`src/components/AlarmSoundSettings.tsx` owns the custom audio selection panel within settings. It reuses Panel, Button, Feedback, fonts and colors; a lavender music icon identifies the selected audio. Filenames wrap rather than truncate. Import, preview/stop, and reset use stacked controls so all labels remain usable at 320px. The native Files/browser picker owns file browsing; in-app validation and status remain in the panel. No visual tokens change for this feature.

`src/components/DarkGuardScreen.tsx` owns the optional foreground dark screen inside the existing app modal. `darkScreen` is true black with readable light text and explicit “จอยังเปิดอยู่” copy; it is not the iOS lock screen or a power-saving guarantee. Returning to the monitor does not disarm. Stopping uses the same device-authentication/app-PIN sheet. Device credentials are entered only in the OS prompt, never the app PIN field. Interruption visibly says monitoring stopped and requires authentication to end the session.

MP4 imports use this same panel. After extraction it shows the resulting M4A filename, a “เสียงจากวิดีโอ” caption, and the original video filename. The format hint explains local audio-only extraction and the 10 MB import limit. No video player or thumbnail is added because the selected media is used only as an alarm sound.

`src/components/GuardCards.tsx` is the canonical owner of feature-card layout, selection, illustration placement, and motion controls. Cards link to actual guard, motion/settings, and history behavior. The three local PNG mascots in `assets/mascot-guard.png`, `assets/mascot-motion.png`, and `assets/mascot-history.png` use the source's flat expressive shapes and sparse dark linework. Use real raster assets with preserved transparency; do not reconstruct these illustrations from UI shapes. Standard controls continue using Ionicons.

`MotionChart` consumes actual sampled values or explicitly labeled demo values. The dashed line is the acceleration threshold; rotation contributes independently and has a text readout. No fabricated data is displayed in device mode. Countdown and calibration remain named operational states rather than decorative progress.

Feedback is persistent and dismissible, with critical failures also shown inside the open modal. Navigation does not clear important interruption or storage feedback. Demo uses a mode badge and one short persistent explanation instead of repeating the same notice in several panels. History renders 15 entries at a time with Load more and a maximum 100-entry local dataset. Native Switch owns platform toggle semantics.

The carousel advances every six seconds only while the guard is idle, the app is foregrounded, and reduced motion is disabled. User interaction pauses automatic movement; explicit controls allow manual navigation and pause/resume. Countdown and alarm return the carousel to its first card. Automatic movement never relocates the primary action. Reduced motion keeps a static/manual carousel and removes decorative transitions. Sample updates and countdown still communicate necessary state. Web preview preserves native React Native Web keyboard/modal semantics, with visible focus in shared controls.

## Do's and Don'ts

- Do distinguish device readings from simulation in the header, graph and stored events.
- Do show interruption honestly when app backgrounding or sensor loss stops monitoring.
- Do keep PIN and storage errors within the user's current context.
- Do keep the primary guard action stable while the illustrated cards move.
- Do preserve the selected clip's white canvas, black hierarchy, flat fills, and playful simplicity.
- Don't claim theft prevention, background protection, or validated iPhone hardware behavior without real device testing.
- Don't introduce a second visual token source or a separate browser-only application.
- Don't turn the sports reference into new sports features, or animate the carousel during an active guard session.
