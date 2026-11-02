import { Text } from "../i18n";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  AppState,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import type { GuardMode, GuardPhase } from "../types";
import { colors, fonts, radii } from "../theme";
import { Icon, type IconName } from "./ui";

export interface GuardCardsProps {
  phase: GuardPhase;
  countdown: number;
  elapsedSeconds: number;
  mode: GuardMode;
  sensorReady: boolean;
  sensitivityLabel: string;
  onPrimary: () => void;
  primaryLabel: string;
  busy: boolean;
  onHistory: () => void;
  onSettings: () => void;
}

const CARD_GAP = 12;
const CARD_COUNT = 3;
const durationLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

export function GuardCards({
  phase,
  countdown,
  elapsedSeconds,
  mode,
  sensorReady,
  sensitivityLabel,
  onPrimary,
  primaryLabel,
  busy,
  onHistory,
  onSettings,
}: GuardCardsProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(0);
  const cardHeights = useRef<Record<string, number>>({});
  const [selected, setSelected] = useState(0);
  const [width, setWidth] = useState(340);
  const [maxCardHeight, setMaxCardHeight] = useState(294);
  const [autoPlay, setAutoPlay] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active" || Platform.OS === "web",
  );
  const cardWidth = Math.max(180, Math.min(width * 0.84, 300));
  const step = cardWidth + CARD_GAP;
  const pauseAuto = useCallback(() => setAutoPlay(false), []);
  const canAutoPlay = phase === "idle" && !reducedMotion && foreground;
  const isPlaying = canAutoPlay && autoPlay;

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReducedMotion(value);
      })
      .catch(() => {
        // No animation is the safe default if the system preference is unavailable.
      });
    const motionSubscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        setForeground(state === "active");
      },
    );
    return () => {
      alive = false;
      motionSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const goTo = useCallback(
    (index: number, animated = true) => {
      const next = Math.max(0, Math.min(index, CARD_COUNT - 1));
      indexRef.current = next;
      setSelected(next);
      scrollRef.current?.scrollTo({
        x: next * step,
        y: 0,
        animated: animated && !reducedMotion,
      });
    },
    [reducedMotion, step],
  );

  useEffect(() => {
    // Arming/alarm must always bring the live guard card back into view.
    if (phase === "countdown" || phase === "alarm" || phase === "interrupted") {
      setAutoPlay(false);
      goTo(0, false);
    }
  }, [goTo, phase]);

  useEffect(() => {
    // Keep the current card aligned after a rotation or web-preview resize.
    goTo(indexRef.current, false);
  }, [goTo]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % CARD_COUNT;
      goTo(next);
    }, 6_000);
    return () => clearInterval(timer);
  }, [goTo, isPlaying]);

  const recordScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.max(
        0,
        Math.min(
          CARD_COUNT - 1,
          Math.round(event.nativeEvent.contentOffset.x / step),
        ),
      );
      if (next !== indexRef.current) {
        indexRef.current = next;
        setSelected(next);
      }
    },
    [step],
  );

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const measured = event.nativeEvent.layout.width;
    if (measured > 0) setWidth(measured);
  }, []);

  const recordCardHeight = useCallback(
    (key: string, event: LayoutChangeEvent) => {
      const measured = Math.ceil(event.nativeEvent.layout.height);
      if (measured <= 0 || cardHeights.current[key] === measured) return;
      cardHeights.current[key] = measured;
      setMaxCardHeight(Math.max(294, ...Object.values(cardHeights.current)));
    },
    [],
  );

  const guardBadge =
    phase === "alarm"
      ? "ตรวจพบการขยับ"
      : phase === "armed"
        ? "กำลังเฝ้าระวัง"
        : phase === "interrupted"
          ? "ไม่ได้เฝ้า · รอยืนยันจบรอบ"
          : phase === "countdown"
            ? countdown > 0
              ? `เริ่มใน ${countdown} วินาที`
              : "กำลังปรับเซนเซอร์"
            : mode === "demo"
              ? "โหมดตัวอย่าง"
              : sensorReady
                ? "เซนเซอร์พร้อม"
                : "ยังไม่เริ่มเฝ้า";
  const guardTitle =
    phase === "alarm"
      ? "มีการขยับ.\nเช็กมือถือหน่อย."
      : phase === "armed"
        ? "กำลังเฝ้า.\nวางใจได้เลย."
        : phase === "interrupted"
          ? "การเฝ้าหยุดลง.\nยืนยันเพื่อจบรอบ."
          : phase === "countdown"
            ? "วางให้นิ่ง.\nอีกนิดก็พร้อม."
            : "วางมือถือ.\nให้เราเฝ้า.";
  const guardDescription =
    phase === "alarm"
      ? "ยืนยันตัวตนเพื่อหยุดการแจ้งเตือน"
      : phase === "armed"
        ? `เฝ้ามาแล้ว ${durationLabel(elapsedSeconds)} · เปิดแอปค้างไว้`
        : phase === "interrupted"
          ? "ขณะนี้ไม่ได้ตรวจจับการขยับ ยืนยันตัวตนก่อนเริ่มใหม่"
          : phase === "countdown"
            ? "กำลังเตรียมตรวจจับการขยับเครื่อง"
            : "เริ่มเฝ้าเมื่อคุณพร้อม แล้วเปิดแอปไว้";

  const cards = [
    {
      key: "guard",
      badge: guardBadge,
      title: guardTitle,
      description: guardDescription,
      color: colors.lavender,
      image: require("../../assets/mascot-guard.png"),
      actionLabel: primaryLabel,
      action: onPrimary,
      disabled: busy,
      icon:
        phase === "alarm"
          ? ("lock-open-outline" as IconName)
          : ("arrow-up-outline" as IconName),
    },
    {
      key: "motion",
      badge: `ความไว${sensitivityLabel}`,
      title: "ขยับแค่ไหน.\nก็เห็นชัด.",
      description: "ปรับการตรวจจับให้พอดีกับโต๊ะของคุณ",
      color: colors.yellow,
      image: require("../../assets/mascot-motion.png"),
      actionLabel: "ตั้งค่าความไวเซนเซอร์",
      action: onSettings,
      disabled: false,
      icon: "arrow-up-outline" as IconName,
    },
    {
      key: "history",
      badge: "บันทึกในเครื่อง",
      title: "ทุกเหตุการณ์.\nย้อนดูได้.",
      description: "เวลาและการขยับที่ตรวจพบ อยู่ที่นี่",
      color: colors.mint,
      image: require("../../assets/mascot-history.png"),
      actionLabel: "ดูประวัติการเฝ้าระวัง",
      action: onHistory,
      disabled: false,
      icon: "arrow-up-outline" as IconName,
    },
  ];

  return (
    <View onLayout={onLayout} style={s.container}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        accessibilityLabel="การ์ด DeskGuard ปัดเพื่อดูการตรวจจับและประวัติ"
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={step}
        snapToAlignment="start"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onTouchStart={pauseAuto}
        onFocus={pauseAuto}
        onScrollBeginDrag={pauseAuto}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: Platform.OS !== "web", listener: recordScroll },
        )}
        contentContainerStyle={[
          s.track,
          { paddingRight: Math.max(0, width - cardWidth) },
        ]}
        style={[s.scroller, { height: maxCardHeight + 16 }]}
      >
        {cards.map((card, index) => (
          <Animated.View
            key={card.key}
            onLayout={(event) => recordCardHeight(card.key, event)}
            style={[
              s.card,
              {
                width: cardWidth,
                marginRight: index === CARD_COUNT - 1 ? 0 : CARD_GAP,
                transform: [
                  {
                    translateY: reducedMotion
                      ? 0
                      : scrollX.interpolate({
                          inputRange: [
                            (index - 1) * step,
                            index * step,
                            (index + 1) * step,
                          ],
                          outputRange: [8, 0, 8],
                          extrapolate: "clamp",
                        }),
                  },
                ],
              },
            ]}
          >
            <View style={s.cardCopy}>
              <View style={s.topRow}>
                <View
                  style={[
                    s.badge,
                    card.key === "guard" &&
                      phase === "alarm" && {
                        backgroundColor: colors.dangerWash,
                      },
                  ]}
                >
                  <Text
                    style={[
                      s.badgeText,
                      card.key === "guard" &&
                        phase === "alarm" && { color: colors.danger },
                    ]}
                  >
                    {card.badge}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={card.actionLabel}
                  accessibilityState={{ disabled: card.disabled }}
                  disabled={card.disabled}
                  onFocus={pauseAuto}
                  onPress={() => {
                    pauseAuto();
                    card.action();
                  }}
                  style={({ pressed }) => [
                    s.cardAction,
                    { opacity: card.disabled ? 0.4 : pressed ? 0.6 : 1 },
                  ]}
                >
                  <View
                    style={
                      card.icon === "arrow-up-outline"
                        ? { transform: [{ rotate: "45deg" }] }
                        : undefined
                    }
                  >
                    <Icon name={card.icon} size={21} color={colors.ink} />
                  </View>
                </Pressable>
              </View>
              <Text style={s.cardTitle}>{card.title}</Text>
              <Text style={s.cardDescription}>{card.description}</Text>
            </View>
            <View style={[s.artPanel, { backgroundColor: card.color }]}>
              <Image
                source={card.image}
                resizeMode="contain"
                style={s.mascot}
                accessible={false}
              />
              {card.key === "guard" && phase === "countdown" && (
                <View style={s.countdownBadge} accessibilityLiveRegion="polite">
                  <Text style={s.countdownText}>
                    {countdown > 0 ? countdown : "…"}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        ))}
      </Animated.ScrollView>
      <View style={s.controls}>
        <Text
          style={s.pageCount}
          accessibilityLabel={`การ์ด ${selected + 1} จาก ${CARD_COUNT}`}
        >
          {String(selected + 1).padStart(2, "0")}
          <Text style={{ color: colors.muted }}> / 03</Text>
        </Text>
        <View style={s.controlButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isPlaying ? "พักการเลื่อนการ์ดอัตโนมัติ" : "เล่นการ์ดอัตโนมัติ"
            }
            accessibilityState={{ disabled: !canAutoPlay }}
            disabled={!canAutoPlay}
            accessibilityHint={
              !canAutoPlay
                ? reducedMotion
                  ? "ปิดตามการลดการเคลื่อนไหวของอุปกรณ์"
                  : "ใช้งานได้เมื่อไม่ได้เฝ้าระวัง"
                : undefined
            }
            onPress={() => setAutoPlay((value) => !value)}
            style={({ pressed }) => [
              s.pagerButton,
              { opacity: !canAutoPlay ? 0.35 : pressed ? 0.6 : 1 },
            ]}
          >
            <Icon
              name={isPlaying ? "pause-outline" : "play-outline"}
              size={16}
              color={colors.ink}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="การ์ดก่อนหน้า"
            accessibilityState={{ disabled: selected === 0 }}
            disabled={selected === 0}
            onFocus={pauseAuto}
            onPress={() => {
              pauseAuto();
              goTo(selected - 1);
            }}
            style={({ pressed }) => [
              s.pagerButton,
              { opacity: selected === 0 ? 0.3 : pressed ? 0.6 : 1 },
            ]}
          >
            <Icon name="arrow-back-outline" size={19} color={colors.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="การ์ดถัดไป"
            accessibilityState={{ disabled: selected === CARD_COUNT - 1 }}
            disabled={selected === CARD_COUNT - 1}
            onFocus={pauseAuto}
            onPress={() => {
              pauseAuto();
              goTo(selected + 1);
            }}
            style={({ pressed }) => [
              s.pagerButton,
              {
                opacity: selected === CARD_COUNT - 1 ? 0.3 : pressed ? 0.6 : 1,
              },
            ]}
          >
            <Icon name="arrow-forward-outline" size={19} color={colors.ink} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: 0 },
  scroller: { flexGrow: 0 },
  track: { paddingTop: 0, paddingBottom: 10, alignItems: "flex-start" },
  card: {
    minHeight: 294,
    borderRadius: radii.panel,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  cardCopy: {
    minHeight: 146,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: -4,
    marginBottom: -1,
    gap: 4,
  },
  badge: {
    backgroundColor: colors.line,
    borderRadius: 30,
    paddingHorizontal: 9,
    paddingVertical: 3,
    flexShrink: 1,
  },
  badgeText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 15,
    color: colors.ink,
  },
  cardAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.6,
    color: colors.ink,
  },
  cardDescription: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 6,
  },
  artPanel: {
    height: 148,
    borderRadius: radii.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  mascot: { width: 176, height: 158 },
  countdownBadge: {
    position: "absolute",
    right: 14,
    bottom: 12,
    minWidth: 37,
    minHeight: 37,
    paddingHorizontal: 7,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  countdownText: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 30,
    color: colors.ink,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 44,
  },
  pageCount: { fontFamily: fonts.data, fontSize: 11, color: colors.ink },
  controlButtons: { flexDirection: "row", gap: 3 },
  pagerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.surface,
  },
});
