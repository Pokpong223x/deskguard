# DeskGuard clip adaptation — design QA

Status: passed for the implemented visual adaptation and browser demo flow.
Date: 2026-11-01. Physical iPhone behavior remains separately unverified.

## Source and evidence

- User-selected source: `C:/Users/usEr/Downloads/original-948190befeeb9aba7b613d8fe40b99d0.mp4`.
- Source metadata: 3200 × 2400, 30 fps, 180 frames, approximately six seconds.
- Frames: `docs/reference/frame-00.png` through `frame-07.png`; overview: `docs/reference/contact-sheet.jpg`.
- Side-by-side visual comparison: `docs/reference/comparison.jpg`. Both images are proportionally resized for comparison; no product screenshot content was edited.
- Final rendered monitor: `docs/deskguard-pastel.jpg`, 390 × 844 CSS pixels, DPR 1.
- Other views: `docs/deskguard-pastel-history.jpg`, `docs/deskguard-pastel-settings.jpg`.
- Responsive evidence: `docs/deskguard-pastel-320.jpg` at 320 × 740 and `docs/deskguard-pastel-wide.jpg` at 1024 × 900, DPR 1.

## Intended adaptation

The reference is a desktop sports landing page. The requested app remains a Thai iPhone motion-monitoring tool. Its desktop left/right composition becomes a heading above a horizontal carousel. Sports navigation, subscriptions, and sports activities are intentionally replaced by guard, sensor settings, and history. The monitoring action is fixed above native bottom navigation. This is a style and motion adaptation, not a pixel-identical website clone.

## Comparison pass

| Surface                 | Source evidence                                                                                                     | Implemented result                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typography              | Heavy black sans-serif, short multiline headings, quiet gray copy                                                   | Bundled Anuphan Bold/Medium/Regular preserves Thai marks and the same hierarchy. Display heading 38/44, card title 22/26. Native measurements use monospace.                                                                                        |
| Layout and spacing      | Rounded gray card top, pastel lower panel, small pill and circular arrow; horizontal cards with a partial next card | Three real React Native cards preserve that structure. 24px page margins, 12px card gap, 28px corners, 44px carousel controls. Desktop preview caps app width at 520px.                                                                             |
| Colors and surfaces     | White canvas, near-black type and CTA, lavender/orange and lemon/coral pairings                                     | Shared theme maps these pairings directly. Mint/lilac supplies the history variant. Flat surfaces avoid additional gradients or decorative shadows. Error state retains semantic red.                                                               |
| Images and icons        | Playful flat mascots with black facial lines and clear pastel backgrounds                                           | Three generated transparent PNGs depict a phone guardian, motion, and history. Sharp at tested sizes, no white masking rectangles or halos. Consistent Ionicons supply functional controls. Subjects intentionally change from sports to DeskGuard. |
| Behavior and resilience | Cards shift horizontally with small vertical offsets                                                                | Native Animated carousel, six-second idle-only advance, swipe/arrows, play/pause, and reduced-motion handling. Card copy uses intrinsic height, and the scroller measures the tallest card. Main action remains reachable at all tested widths.     |

## Iterations and resolved findings

1. The previous circular blue dial and blue-gray UI did not fit the chosen clip. Replaced them with the pastel feature carousel, white base, black controls, and matching history/settings surfaces.
2. A first click on Pause restarted autoplay because focus and pointer handlers competed. Removed the competing focus/pointer behavior from that toggle; verified one click pauses and changes the label to Play.
3. Fixed card heights would clip native scaled text. Changed copy/card heights to intrinsic measurements and the scroller to the tallest measured card plus 16px clearance. Native Larger Text is still a device validation item.
4. Browser switches inherited a teal active thumb despite the black palette. Added the web-specific active thumb color and visually verified white thumbs.
5. Moved the primary action outside vertical scrolling so small viewports retain access to start, cancel, and PIN disarm.

## Interaction and accessibility verification

- Browser demo: start, five-second countdown, armed state, simulated movement, alarm, incorrect PIN rejection, correct PIN disarm, and labeled history event all pass.
- Manual carousel navigation and pause work; countdown/alarm return to the guard card and disable autoplay. Reduced-motion and app-background rules were reviewed in code; no native OS preference test is claimed.
- Controls have button/switch/textbox semantics and accessible names. Mascots are decorative. PIN input stays masked, and validation feedback remains in the dialog. Focus styling is supplied for web controls.
- Narrow layouts scroll vertically without document-level horizontal overflow. At 320px, lower carousel controls require scrolling, while the main monitoring action remains fixed and usable.
- No final browser console errors. Typecheck, web export, iOS Hermes export, and all 12 detector tests pass.

No unresolved visual blocker was found for the selected mobile adaptation. Real sensor accuracy, permissions, speaker/haptics, native Larger Text/VoiceOver, safe areas, and lifecycle must still be checked on a physical iPhone using the README checklist.
