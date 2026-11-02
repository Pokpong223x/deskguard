import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { useDeskGuard } from "./src/hooks/useDeskGuard";
import { SENSITIVITY, type Sensitivity } from "./src/domain/motion";
import {
  Button,
  Feedback,
  Icon,
  Label,
  Panel,
  PinField,
  type IconName,
} from "./src/components/ui";
import { GuardCards } from "./src/components/GuardCards";
import { MotionChart } from "./src/components/MotionChart";
import { AlarmSoundSettings } from "./src/components/AlarmSoundSettings";
import { DarkGuardScreen } from "./src/components/DarkGuardScreen";
import { WebStyles } from "./src/components/WebStyles";
import { colors, fonts, radii } from "./src/theme";
import type { GuardEvent } from "./src/types";

type Tab = "guard" | "history" | "settings";
type Sheet = "pin" | "disarm" | "clear" | null;
const tabs: {
  key: Tab;
  label: string;
  icon: IconName;
  selectedIcon: IconName;
}[] = [
  {
    key: "guard",
    label: "เฝ้าระวัง",
    icon: "shield-checkmark-outline",
    selectedIcon: "shield-checkmark",
  },
  {
    key: "history",
    label: "ประวัติ",
    icon: "time-outline",
    selectedIcon: "time",
  },
  {
    key: "settings",
    label: "ตั้งค่า",
    icon: "options-outline",
    selectedIcon: "options",
  },
];
const formatDuration = (value: number) =>
  `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    AnuphanRegular: require("@expo-google-fonts/anuphan/400Regular/Anuphan_400Regular.ttf"),
    AnuphanMedium: require("@expo-google-fonts/anuphan/500Medium/Anuphan_500Medium.ttf"),
    AnuphanBold: require("@expo-google-fonts/anuphan/700Bold/Anuphan_700Bold.ttf"),
  });
  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator
          color={colors.ink}
          accessibilityLabel="กำลังเตรียม DeskGuard"
        />
      </View>
    );
  }
  return (
    <SafeAreaProvider>
      <DeskGuard />
    </SafeAreaProvider>
  );
}
function DeskGuard() {
  const guard = useDeskGuard();
  const [tab, setTab] = useState<Tab>("guard");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [darkScreen, setDarkScreen] = useState(false);
  const [filter, setFilter] = useState<"all" | "device" | "demo">("all");
  const [visibleCount, setVisibleCount] = useState(15);
  const active = guard.phase !== "idle";
  const modalBusy = busy || guard.authBusy;
  const controlsBusy = modalBusy || guard.alarmSound.busy;
  const alarm = guard.phase === "alarm";
  const interrupted = guard.phase === "interrupted";
  const live = guard.sensorStatus === "ready";
  const events = guard.history.filter(
    (event) => filter === "all" || event.source === filter,
  );
  const openSheet = (value: Sheet) => {
    setDarkScreen(false);
    setPin("");
    setConfirmPin("");
    setCurrentPin("");
    setFormError("");
    guard.clearFeedback();
    setSheet(value);
  };
  useEffect(() => {
    if (alarm) setTab("guard");
  }, [alarm]);
  useEffect(() => {
    if (guard.phase === "armed") setDarkScreen(true);
  }, [guard.phase]);
  useEffect(() => {
    if (guard.phase !== "armed" || darkScreen || sheet !== null) return;
    const timer = setTimeout(() => setDarkScreen(true), 15000);
    return () => clearTimeout(timer);
  }, [guard.phase, darkScreen, sheet]);
  useEffect(() => {
    if (guard.phase === "idle" || guard.phase === "interrupted")
      setDarkScreen(false);
    if (guard.phase === "interrupted") setTab("guard");
  }, [guard.phase]);
  useEffect(() => {
    if (tab !== "settings") guard.alarmSound.stopPreview();
  }, [tab, guard.alarmSound.stopPreview]);
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.title = `${tabs.find((item) => item.key === tab)?.label} · DeskGuard`;
    }
  }, [tab]);
  const submit = async () => {
    if (modalBusy) return;
    guard.clearFeedback();
    setFormError("");
    if (sheet !== "clear" && !/^\d{4}$/.test(pin)) {
      setFormError("กรอก PIN เป็นตัวเลข 4 หลัก");
      return;
    }
    if (sheet === "pin" && pin !== confirmPin) {
      setFormError("PIN ทั้งสองช่องไม่ตรงกัน ลองกรอกอีกครั้ง");
      return;
    }
    if (sheet === "pin" && guard.hasPin && !/^\d{4}$/.test(currentPin)) {
      setFormError("กรอก PIN ปัจจุบันให้ครบ 4 หลัก");
      return;
    }
    setBusy(true);
    try {
      if (sheet === "clear") {
        await guard.clearHistory();
        setSheet(null);
      } else {
        const ok =
          sheet === "pin"
            ? await guard.savePin(pin, guard.hasPin ? currentPin : undefined)
            : await guard.disarm(pin);
        if (ok) {
          setSheet(null);
          setPin("");
          setConfirmPin("");
          setCurrentPin("");
        } else
          setFormError(
            sheet === "pin"
              ? "บันทึกไม่ได้ ตรวจสอบ PIN ปัจจุบันแล้วลองอีกครั้ง"
              : "PIN ไม่ถูกต้อง ลองอีกครั้ง",
          );
      }
    } catch {
      setFormError("บันทึกไม่สำเร็จ ลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };
  const submitDeviceAuth = async () => {
    if (modalBusy) return;
    setFormError("");
    setBusy(true);
    try {
      if (await guard.authenticateAndDisarm()) {
        setSheet(null);
        setPin("");
      }
    } catch {
      setFormError("ยืนยันตัวตนไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };
  const requestStart = async () => {
    if (!guard.canArm) {
      openSheet("pin");
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await guard.start();
    } finally {
      setBusy(false);
    }
  };
  const updateSettings = async (
    patch: Parameters<typeof guard.updateSettings>[0],
  ) => {
    setBusy(true);
    try {
      await guard.updateSettings(patch);
    } catch {
      /* Hook exposes actionable feedback. */
    } finally {
      setBusy(false);
    }
  };
  const primaryLabel =
    guard.phase === "idle"
      ? guard.canArm
        ? "เริ่มเฝ้าระวัง"
        : "ตั้ง PIN ของแอปก่อนเริ่ม"
      : guard.phase === "countdown"
        ? "ยกเลิกการเริ่ม"
        : alarm
          ? "ยืนยันตัวตนเพื่อหยุดเตือน"
          : interrupted
            ? "ยืนยันตัวตนเพื่อจบรอบ"
            : "หยุดเฝ้าระวัง";
  const handlePrimary = () => {
    if (guard.phase === "idle") void requestStart();
    else if (guard.phase === "countdown") guard.cancelCountdown();
    else openSheet("disarm");
  };
  const visibleNotice = guard.notice?.startsWith("โหมดตัวอย่างใช้ข้อมูลจำลอง")
    ? null
    : guard.notice;

  return (
    <View style={s.root}>
      <WebStyles />
      <StatusBar
        hidden={darkScreen}
        barStyle="dark-content"
        backgroundColor={darkScreen ? colors.darkScreen : colors.background}
      />
      <SafeAreaView style={s.app} edges={["top", "left", "right"]}>
        <View style={s.header}>
          <View style={s.brand}>
            <View style={s.brandIcon}>
              <Icon
                name="shield-checkmark-outline"
                color={colors.ink}
                size={26}
              />
            </View>
            <Text style={s.brandName}>
              deskguard<Text style={{ color: colors.primary }}>.</Text>
            </Text>
          </View>
          <View
            style={[
              s.modePill,
              guard.mode === "demo" && { backgroundColor: colors.warningWash },
            ]}
          >
            <View
              style={[
                s.dot,
                {
                  backgroundColor:
                    guard.mode === "demo"
                      ? colors.warning
                      : live
                        ? colors.success
                        : colors.muted,
                },
              ]}
            />
            <Text
              style={[
                s.modeText,
                guard.mode === "demo" && { color: colors.warning },
              ]}
            >
              {guard.mode === "demo" ? "โหมดตัวอย่าง" : "บนอุปกรณ์"}
            </Text>
          </View>
        </View>
        {guard.loading ? (
          <View style={s.loading}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={s.body}>กำลังโหลดการตั้งค่า…</Text>
          </View>
        ) : (
          <ScrollView
            key={tab}
            style={s.scroll}
            contentContainerStyle={s.content}
            keyboardShouldPersistTaps="handled"
          >
            {(guard.error || visibleNotice) && (
              <Feedback
                message={guard.error || visibleNotice || ""}
                error={!!guard.error}
                onDismiss={guard.clearFeedback}
              />
            )}
            {tab === "guard" && (
              <>
                <View style={s.intro}>
                  <Text style={s.eyebrow}>เพื่อนตัวเล็ก ประจำโต๊ะคุณ</Text>
                  <Text
                    accessibilityRole="header"
                    style={[s.heading, alarm && { color: colors.danger }]}
                  >
                    {alarm
                      ? "มีการขยับ.\nลองเช็กดู."
                      : guard.phase === "armed"
                        ? "อยู่ตรงนี้.\nกำลังเฝ้าอยู่."
                        : interrupted
                          ? "การเฝ้าหยุดลง.\nยืนยันเพื่อจบรอบ."
                          : guard.phase === "countdown"
                            ? "วางให้นิ่ง.\nอีกนิดเดียว."
                            : "วางไว้.\nสบายใจได้."}
                  </Text>
                  <Text style={s.introDescription}>
                    {alarm
                      ? "ยืนยันตัวตนเพื่อหยุดเสียง แล้วตรวจดูมือถือของคุณ"
                      : interrupted
                        ? "ขณะนี้ไม่ได้ตรวจจับการขยับ ยืนยันตัวตนก่อนเริ่มรอบใหม่"
                        : "เปิดเฝ้า แล้ววางมือถือบนโต๊ะให้มั่นคง"}
                  </Text>
                </View>
                {guard.mode === "demo" && (
                  <View style={s.demoNote}>
                    <Icon name="flask-outline" size={14} color={colors.muted} />
                    <Text style={s.demoNoteText}>
                      ข้อมูลจำลอง · ยังไม่ได้เฝ้ามือถือจริง
                    </Text>
                  </View>
                )}
                <GuardCards
                  phase={guard.phase}
                  countdown={guard.countdown}
                  elapsedSeconds={guard.elapsedSeconds}
                  mode={guard.mode}
                  sensorReady={live}
                  sensitivityLabel={
                    SENSITIVITY[guard.settings.sensitivity].label
                  }
                  onPrimary={handlePrimary}
                  primaryLabel={primaryLabel}
                  busy={controlsBusy}
                  onHistory={() => setTab("history")}
                  onSettings={() => setTab("settings")}
                />
                <MotionChart
                  samples={guard.samples}
                  acceleration={guard.reading.acceleration}
                  rotation={guard.reading.rotation}
                  threshold={
                    SENSITIVITY[guard.settings.sensitivity]
                      .accelerationThreshold
                  }
                  live={live}
                  demo={guard.mode === "demo"}
                />
                {guard.mode === "device" && !live && guard.phase === "idle" && (
                  <Panel style={s.connectPanel}>
                    <View style={s.row}>
                      <Icon
                        name="phone-portrait-outline"
                        color={colors.ink}
                        size={24}
                      />
                      <View style={s.flex}>
                        <Text style={s.cardTitle}>
                          {Platform.OS === "web"
                            ? "พร้อมลองบน iPhone"
                            : "เชื่อมต่อเซนเซอร์ก่อนเริ่ม"}
                        </Text>
                        <Text style={s.bodySmall}>
                          {Platform.OS === "web"
                            ? "เปิดผ่าน Expo Go เพื่อใช้เซนเซอร์จริง หรือทดลองขั้นตอนบนคอมได้"
                            : "อนุญาตการเคลื่อนไหวเพื่อให้แอปตรวจจับการขยับเครื่อง"}
                        </Text>
                      </View>
                    </View>
                    {Platform.OS !== "web" && (
                      <Button
                        small
                        label="เชื่อมต่อเซนเซอร์"
                        variant="outline"
                        onPress={() => void guard.retrySensors()}
                      />
                    )}
                    <Button
                      small
                      label="ลองโหมดตัวอย่าง"
                      variant="outline"
                      icon="flask-outline"
                      onPress={() => guard.setMode("demo")}
                    />
                  </Panel>
                )}
                {guard.mode === "demo" && (
                  <Button
                    label="จำลองการขยับมือถือ"
                    small
                    variant="outline"
                    icon="hand-left-outline"
                    disabled={guard.phase !== "armed"}
                    onPress={guard.simulateMotion}
                  />
                )}
                {(guard.phase === "armed" || alarm) && (
                  <Panel style={s.settingsPanel}>
                    <View style={s.row}>
                      <Icon name="moon-outline" color={colors.ink} />
                      <View style={s.flex}>
                        <Text style={s.cardTitle}>เฝ้าต่อด้วยหน้าจอมืด</Text>
                        <Text style={s.bodySmall}>
                          จอยังเปิดและแอปยังทำงานอยู่ หากกดล็อกเครื่อง iOS
                          จะหยุดการเฝ้า
                        </Text>
                      </View>
                    </View>
                    <Button
                      small
                      label="เปิดหน้าจอมืด"
                      icon="moon-outline"
                      variant="outline"
                      disabled={controlsBusy}
                      onPress={() => setDarkScreen(true)}
                    />
                  </Panel>
                )}
                <View style={s.tip}>
                  <Icon
                    name="information-circle-outline"
                    color={colors.muted}
                    size={18}
                  />
                  <Text style={s.tipText}>
                    วางบนโต๊ะที่นิ่ง และลองขยับเพื่อทดสอบก่อนใช้งาน
                  </Text>
                </View>
              </>
            )}
            {tab === "history" && (
              <>
                <View style={s.pageIntro}>
                  <Text style={s.eyebrow}>ทุกเหตุการณ์ อยู่ตรงนี้</Text>
                  <Text style={s.heading} accessibilityRole="header">
                    {"ทุกการขยับ.\nบันทึกไว้."}
                  </Text>
                  <Text style={s.body}>
                    เหตุการณ์ล่าสุด เก็บไว้ในอุปกรณ์นี้
                  </Text>
                </View>
                <View style={s.statsRow}>
                  <Panel style={[s.stat, { backgroundColor: colors.lavender }]}>
                    <Text style={s.statNumber}>
                      {
                        guard.history.filter(
                          (e) => e.kind === "motion" && e.source === "device",
                        ).length
                      }
                    </Text>
                    <Text style={s.bodySmall}>ตรวจพบจริง</Text>
                  </Panel>
                  <Panel style={[s.stat, { backgroundColor: colors.yellow }]}>
                    <Text style={s.statNumber}>
                      {guard.history.filter((e) => e.source === "demo").length}
                    </Text>
                    <Text style={s.bodySmall}>จากโหมดตัวอย่าง</Text>
                  </Panel>
                </View>
                <View style={s.filters}>
                  {(
                    [
                      { key: "all", label: "ทั้งหมด" },
                      { key: "device", label: "อุปกรณ์จริง" },
                      { key: "demo", label: "ตัวอย่าง" },
                    ] as const
                  ).map((item) => (
                    <Pressable
                      key={item.key}
                      accessibilityRole="button"
                      accessibilityState={{ selected: filter === item.key }}
                      aria-pressed={filter === item.key}
                      onPress={() => {
                        setFilter(item.key);
                        setVisibleCount(15);
                      }}
                      style={({ pressed }) => [
                        s.filter,
                        filter === item.key && s.filterSelected,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Text
                        style={[
                          s.filterText,
                          filter === item.key && { color: colors.primary },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {events.length === 0 ? (
                  <Panel style={s.empty}>
                    <Image
                      source={require("./assets/mascot-history.png")}
                      style={s.emptyMascot}
                      resizeMode="contain"
                      accessible={false}
                    />
                    <Text style={s.cardTitle}>
                      ยังไม่มีเหตุการณ์{filter === "demo" ? "ตัวอย่าง" : ""}
                    </Text>
                    <Text style={s.emptyCopy}>
                      เมื่อแอปตรวจพบการขยับ{"\n"}
                      วันเวลาและค่าที่วัดได้จะปรากฏที่นี่
                    </Text>
                    <Button
                      small
                      label="ไปหน้าเฝ้าระวัง"
                      variant="ghost"
                      onPress={() => setTab("guard")}
                    />
                  </Panel>
                ) : (
                  <Panel style={{ padding: 0 }}>
                    {events.slice(0, visibleCount).map((event, index) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        last={
                          index === Math.min(events.length, visibleCount) - 1
                        }
                      />
                    ))}
                  </Panel>
                )}
                {events.length > visibleCount && (
                  <Button
                    small
                    variant="outline"
                    label={`ดูเพิ่ม (${events.length - visibleCount})`}
                    onPress={() => setVisibleCount(visibleCount + 15)}
                  />
                )}
                <View style={s.historyFooter}>
                  <Text style={s.bodySmall}>เก็บสูงสุด 100 เหตุการณ์</Text>
                  {guard.history.length > 0 && (
                    <Button
                      label="ล้างประวัติ"
                      small
                      tone="danger"
                      variant="ghost"
                      disabled={active}
                      onPress={() => openSheet("clear")}
                    />
                  )}
                </View>
              </>
            )}
            {tab === "settings" && (
              <>
                <View style={s.pageIntro}>
                  <Text style={s.eyebrow}>ปรับตามโต๊ะที่คุณใช้</Text>
                  <Text style={s.heading} accessibilityRole="header">
                    {"ปรับนิดเดียว.\nลงตัวกว่าเดิม."}
                  </Text>
                  <Text style={s.body}>
                    ปรับครั้งเดียว พร้อมใช้ในครั้งถัดไป
                  </Text>
                </View>
                {active && (
                  <Feedback message="หยุดเฝ้าระวังก่อนเปลี่ยนการตั้งค่า" />
                )}
                <Label>การตรวจจับ</Label>
                <Panel style={s.settingsPanel}>
                  <View style={s.row}>
                    <Icon name="pulse-outline" color={colors.primary} />
                    <View style={s.flex}>
                      <Text style={s.cardTitle}>ความไวต่อการขยับ</Text>
                      <Text style={s.bodySmall}>
                        ความไวสูงจะตอบสนองต่อการขยับที่เบาลง
                      </Text>
                    </View>
                  </View>
                  <View style={s.sensitivity}>
                    {(["low", "medium", "high"] as Sensitivity[]).map(
                      (value) => (
                        <Pressable
                          key={value}
                          disabled={active || busy}
                          accessibilityRole="button"
                          accessibilityLabel={`ความไว${SENSITIVITY[value].label}`}
                          accessibilityState={{
                            selected: value === guard.settings.sensitivity,
                            disabled: active || busy,
                          }}
                          aria-pressed={value === guard.settings.sensitivity}
                          onPress={() =>
                            void updateSettings({ sensitivity: value })
                          }
                          style={({ pressed }) => [
                            s.sensitivityButton,
                            value === guard.settings.sensitivity &&
                              s.sensitivitySelected,
                            (active || busy) && { opacity: 0.5 },
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Text
                            style={[
                              s.sensitivityText,
                              value === guard.settings.sensitivity && {
                                color: colors.surface,
                              },
                            ]}
                          >
                            {SENSITIVITY[value].label}
                          </Text>
                        </Pressable>
                      ),
                    )}
                  </View>
                  <Text style={s.bodySmall}>
                    กรองการสะกิดสั้น ๆ และเตือนเมื่อการขยับเกินเกณฑ์ต่อเนื่อง
                  </Text>
                </Panel>
                <Label>การแจ้งเตือน</Label>
                <Panel style={{ paddingVertical: 2 }}>
                  <SettingSwitch
                    icon="volume-medium-outline"
                    title="เสียงเตือน"
                    description="เล่นเสียงเมื่อพบการเคลื่อนไหว"
                    value={guard.settings.sound}
                    disabled={active || busy}
                    onChange={(sound) => void updateSettings({ sound })}
                  />
                  <View style={s.separator} />
                  <SettingSwitch
                    icon="radio-outline"
                    title="การสั่น"
                    description="สั่นพร้อมการแจ้งเตือนบนมือถือ"
                    value={guard.settings.haptics}
                    disabled={active || busy}
                    onChange={(haptics) => void updateSettings({ haptics })}
                  />
                </Panel>
                {!guard.settings.sound && !guard.settings.haptics && (
                  <Feedback message="ปิดทั้งเสียงและการสั่นอยู่ แอปจะแจ้งเตือนด้วยภาพบนหน้าจอเท่านั้น" />
                )}
                <Label>เสียงแจ้งเตือนของฉัน</Label>
                <AlarmSoundSettings
                  sound={guard.alarmSound.sound}
                  busy={guard.alarmSound.busy}
                  previewing={guard.alarmSound.previewing}
                  previewLoading={guard.alarmSound.previewLoading}
                  disabled={active || busy}
                  soundEnabled={guard.settings.sound}
                  usingDefault={guard.alarmSound.usingDefault}
                  error={guard.alarmSound.error}
                  notice={guard.alarmSound.notice}
                  onChoose={() => void guard.chooseAlarmSound()}
                  onPreview={() => void guard.alarmSound.togglePreview()}
                  onReset={() => void guard.alarmSound.reset()}
                />
                <Label>ยืนยันตัวตนเพื่อหยุดเฝ้า</Label>
                <Panel style={s.settingsPanel}>
                  <View style={s.row}>
                    <View style={s.smallIcon}>
                      <Icon name="scan-outline" color={colors.primary} />
                    </View>
                    <View style={s.flex}>
                      <Text style={s.cardTitle}>{guard.deviceAuth.label}</Text>
                      <Text style={s.bodySmall}>{guard.deviceAuth.detail}</Text>
                    </View>
                    <Icon
                      name={
                        guard.deviceAuth.available
                          ? "checkmark-circle"
                          : "information-circle-outline"
                      }
                      color={
                        guard.deviceAuth.available
                          ? colors.success
                          : colors.muted
                      }
                    />
                  </View>
                  <Text style={s.bodySmall}>
                    ระบบของโทรศัพท์เป็นผู้ตรวจสอบใบหน้า ลายนิ้วมือ
                    หรือรหัสเครื่อง แอปจะได้รับเพียงผลการยืนยันตัวตน
                  </Text>
                </Panel>
                <Label>PIN ของแอป</Label>
                <Panel style={s.settingsPanel}>
                  <View style={s.row}>
                    <View style={s.smallIcon}>
                      <Icon name="key-outline" color={colors.primary} />
                    </View>
                    <View style={s.flex}>
                      <Text style={s.cardTitle}>
                        {guard.hasPin
                          ? "ตั้ง PIN ของแอปแล้ว"
                          : "ยังไม่ได้ตั้ง PIN ของแอป"}
                      </Text>
                      <Text style={s.bodySmall}>
                        {guard.deviceAuth.available
                          ? "ตั้งเพิ่มได้เพื่อใช้เป็นอีกวิธีในการหยุดเฝ้า เป็นคนละรหัสกับรหัสเครื่อง"
                          : "รหัส 4 หลักสำหรับ DeskGuard ใช้เมื่อการยืนยันด้วยเครื่องไม่พร้อม เป็นคนละรหัสกับรหัสเครื่อง"}
                      </Text>
                    </View>
                    <Icon
                      name={
                        guard.hasPin ? "checkmark-circle" : "ellipse-outline"
                      }
                      color={guard.hasPin ? colors.success : colors.muted}
                    />
                  </View>
                  <Button
                    small
                    label={
                      guard.hasPin ? "เปลี่ยน PIN ของแอป" : "ตั้ง PIN ของแอป"
                    }
                    variant="outline"
                    disabled={active}
                    onPress={() => openSheet("pin")}
                  />
                </Panel>
                <Label>หน้าจอระหว่างเฝ้า</Label>
                <Panel style={s.settingsPanel}>
                  <Text style={s.cardTitle}>จอมืดได้ แต่ต้องเปิดแอปไว้</Text>
                  <Text style={s.bodySmall}>
                    iOS ไม่รองรับการตรวจจับการขยับต่อเนื่องหลังล็อกเครื่อง
                    ใช้ปุ่มเปิดหน้าจอมืดหลังเริ่มเฝ้าเพื่อให้แอปทำงานต่อ
                    โดยจอไม่ได้ดับจริง
                  </Text>
                </Panel>
                <Label>โหมดใช้งาน</Label>
                <Panel style={s.settingsPanel}>
                  <View style={s.row}>
                    <Icon
                      name={
                        guard.mode === "demo"
                          ? "flask-outline"
                          : "phone-portrait-outline"
                      }
                      color={colors.primary}
                    />
                    <View style={s.flex}>
                      <Text style={s.cardTitle}>
                        {guard.mode === "demo"
                          ? "โหมดตัวอย่าง"
                          : "เซนเซอร์อุปกรณ์จริง"}
                      </Text>
                      <Text style={s.bodySmall}>
                        {guard.mode === "demo"
                          ? "จำลองข้อมูลเพื่อทดลองขั้นตอนของแอป"
                          : "ใช้ Accelerometer และ Gyroscope"}
                      </Text>
                    </View>
                  </View>
                  <Button
                    small
                    variant="outline"
                    label={
                      guard.mode === "demo"
                        ? "เปลี่ยนเป็นเซนเซอร์จริง"
                        : "เปลี่ยนเป็นโหมดตัวอย่าง"
                    }
                    disabled={active}
                    onPress={() =>
                      guard.setMode(guard.mode === "demo" ? "device" : "demo")
                    }
                  />
                </Panel>
                <View style={s.about}>
                  <Icon name="shield-checkmark-outline" color={colors.muted} />
                  <Text style={s.aboutTitle}>DeskGuard 1.0</Text>
                  <Text style={s.aboutText}>
                    โปรเจคตรวจจับการเคลื่อนไหวด้วยเซนเซอร์{"\n"}ทำงานขณะเปิดแอป
                    ไม่รับประกันการป้องกันการโจรกรรม
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        )}
        {tab === "guard" && !guard.loading && (
          <View style={s.actionArea}>
            <View style={s.actionMeta}>
              <View style={s.sessionItem}>
                <Icon
                  name={
                    alarm
                      ? "alert-circle-outline"
                      : guard.phase === "armed"
                        ? "shield-checkmark-outline"
                        : "timer-outline"
                  }
                  size={17}
                  color={alarm ? colors.danger : colors.ink}
                />
                <Text
                  style={[s.actionStatus, alarm && { color: colors.danger }]}
                >
                  {alarm
                    ? "ตรวจพบการเคลื่อนไหว"
                    : guard.phase === "armed"
                      ? "กำลังเฝ้าระวัง"
                      : interrupted
                        ? "ไม่ได้เฝ้า · รอยืนยันจบรอบ"
                        : guard.phase === "countdown"
                          ? guard.countdown > 0
                            ? `เริ่มใน ${guard.countdown} วินาที`
                            : "กำลังปรับเซนเซอร์"
                          : "ยังไม่ได้เริ่มเฝ้า"}
                </Text>
              </View>
              <Text style={s.actionTime}>
                {active ? formatDuration(guard.elapsedSeconds) : "00:00"}
              </Text>
            </View>
            <Button
              label={primaryLabel}
              icon={
                alarm
                  ? "lock-open-outline"
                  : guard.phase === "countdown"
                    ? "close-outline"
                    : "arrow-forward-outline"
              }
              tone={alarm ? "danger" : "primary"}
              busy={controlsBusy}
              onPress={handlePrimary}
            />
            <Text style={s.foreground}>
              เปิดแอปไว้ระหว่างเฝ้า ·{" "}
              {guard.settings.sound ? "เปิดเสียงเตือน" : "ปิดเสียงเตือน"}
            </Text>
          </View>
        )}
        <SafeAreaView edges={["bottom"]} style={s.nav}>
          <View style={s.navRow}>
            {tabs.map((item) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: item.key === tab }}
                aria-pressed={item.key === tab}
                onPress={() => {
                  setTab(item.key);
                }}
                style={({ pressed }) => [
                  s.navItem,
                  pressed && { opacity: 0.6 },
                ]}
              >
                <View
                  style={[
                    s.navIcon,
                    item.key === tab && { backgroundColor: colors.primaryWash },
                  ]}
                >
                  <Icon
                    name={item.key === tab ? item.selectedIcon : item.icon}
                    color={item.key === tab ? colors.primary : colors.muted}
                    size={22}
                  />
                </View>
                <Text
                  style={[
                    s.navLabel,
                    item.key === tab && {
                      color: colors.primary,
                      fontFamily: fonts.display,
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </SafeAreaView>
      </SafeAreaView>
      <Modal
        transparent
        visible={sheet !== null || darkScreen}
        animationType="none"
        onRequestClose={() => {
          if (!modalBusy) {
            setDarkScreen(false);
            setSheet(null);
          }
        }}
      >
        {darkScreen ? (
          <DarkGuardScreen
            alarm={alarm}
            demo={guard.mode === "demo"}
            elapsedSeconds={guard.elapsedSeconds}
            onAuthenticate={() => openSheet("disarm")}
            onReturn={() => setDarkScreen(false)}
          />
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={s.overlay}
          >
            <View
              style={s.sheet}
              accessibilityViewIsModal
              accessibilityLabel={
                sheet === "clear"
                  ? "ล้างประวัติ"
                  : sheet === "pin"
                    ? "ตั้ง PIN ของแอป"
                    : "หยุดเฝ้าระวัง"
              }
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={s.sheetContent}
              >
                <View style={s.sheetHeading}>
                  <View
                    style={[
                      s.smallIcon,
                      sheet === "clear" && {
                        backgroundColor: colors.dangerWash,
                      },
                    ]}
                  >
                    <Icon
                      name={
                        sheet === "clear"
                          ? "trash-outline"
                          : "lock-closed-outline"
                      }
                      color={sheet === "clear" ? colors.danger : colors.primary}
                    />
                  </View>
                  <Button
                    label="ปิด"
                    small
                    variant="ghost"
                    tone="neutral"
                    disabled={modalBusy}
                    onPress={() => setSheet(null)}
                  />
                </View>
                <Text style={s.sheetTitle} accessibilityRole="header">
                  {sheet === "clear"
                    ? "ล้างประวัติทั้งหมด?"
                    : sheet === "pin"
                      ? guard.hasPin
                        ? "เปลี่ยน PIN ของแอป"
                        : "ตั้ง PIN ของแอป"
                      : alarm
                        ? "หยุดเสียงเตือน"
                        : interrupted
                          ? "ยืนยันเพื่อจบรอบ"
                          : "หยุดเฝ้าระวัง"}
                </Text>
                <Text style={s.body}>
                  {sheet === "clear"
                    ? `ลบ ${guard.history.length} เหตุการณ์ออกจากอุปกรณ์นี้ หลังลบแล้วกู้คืนไม่ได้`
                    : sheet === "pin"
                      ? "ตั้งรหัส 4 หลักสำหรับ DeskGuard โดยเฉพาะ ไม่ใช่รหัสปลดล็อกโทรศัพท์"
                      : guard.deviceAuth.available
                        ? "ใช้การยืนยันตัวตนของโทรศัพท์เพื่อจบรอบเฝ้าระวัง"
                        : guard.hasPin
                          ? "กรอก PIN ของแอป 4 หลักที่คุณตั้งไว้"
                          : "การยืนยันตัวตนของเครื่องยังไม่พร้อม ตรวจสอบการตั้งค่าของโทรศัพท์แล้วลองใหม่"}
                </Text>
                {sheet === "disarm" && guard.deviceAuth.available && (
                  <Button
                    label={`ใช้ ${guard.deviceAuth.label}`}
                    icon="scan-outline"
                    busy={modalBusy}
                    autoFocus
                    onPress={() => void submitDeviceAuth()}
                  />
                )}
                {sheet === "disarm" && !guard.deviceAuth.available && (
                  <Text style={s.bodySmall}>{guard.deviceAuth.detail}</Text>
                )}
                {sheet === "disarm" &&
                  guard.hasPin &&
                  guard.deviceAuth.available && (
                    <Text style={s.bodySmall}>
                      หรือใช้ PIN ของแอปที่ตั้งไว้
                    </Text>
                  )}
                {sheet === "pin" && guard.hasPin && (
                  <PinField
                    label="PIN ของแอปปัจจุบัน"
                    value={currentPin}
                    onChangeText={setCurrentPin}
                    autoFocus
                  />
                )}
                {(sheet === "pin" || (sheet === "disarm" && guard.hasPin)) && (
                  <PinField
                    label={
                      sheet === "pin" ? "PIN ใหม่ 4 หลัก" : "PIN ของแอป 4 หลัก"
                    }
                    value={pin}
                    onChangeText={setPin}
                    autoFocus={
                      !(sheet === "pin" && guard.hasPin) &&
                      !(sheet === "disarm" && guard.deviceAuth.available)
                    }
                    error={!!formError}
                    onSubmit={() => void submit()}
                  />
                )}
                {sheet === "pin" && (
                  <PinField
                    label="ยืนยัน PIN ใหม่"
                    value={confirmPin}
                    onChangeText={setConfirmPin}
                    error={!!formError}
                    onSubmit={() => void submit()}
                  />
                )}
                {!!(guard.error || formError) && (
                  <Feedback message={guard.error || formError} error />
                )}
                <View style={s.sheetActions}>
                  {sheet === "clear" && (
                    <Button
                      autoFocus
                      label="เก็บประวัติไว้"
                      variant="outline"
                      tone="neutral"
                      disabled={modalBusy}
                      onPress={() => setSheet(null)}
                    />
                  )}
                  {(sheet !== "disarm" || guard.hasPin) && (
                    <Button
                      label={
                        sheet === "clear"
                          ? "ล้างประวัติทั้งหมด"
                          : sheet === "pin"
                            ? "บันทึก PIN"
                            : "ยืนยัน PIN และจบรอบ"
                      }
                      tone={sheet === "clear" ? "danger" : "primary"}
                      busy={modalBusy}
                      variant={
                        sheet === "disarm" && guard.deviceAuth.available
                          ? "outline"
                          : "solid"
                      }
                      onPress={() => void submit()}
                    />
                  )}
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

function SettingSwitch({
  icon,
  title,
  description,
  value,
  onChange,
  disabled,
}: {
  icon: IconName;
  title: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <View style={s.switchRow}>
      <Icon name={icon} size={21} color={colors.primary} />
      <View style={s.flex}>
        <Text style={s.cardTitle}>{title}</Text>
        <Text style={s.bodySmall}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.line, true: colors.primary }}
        thumbColor={colors.surface}
        {...(Platform.OS === "web"
          ? { activeThumbColor: colors.background }
          : {})}
      />
    </View>
  );
}
function EventRow({ event, last }: { event: GuardEvent; last: boolean }) {
  const interrupted = event.kind === "interrupted";
  const date = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(event.at);
  return (
    <View
      style={[
        s.eventRow,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.line },
      ]}
    >
      <View
        style={[
          s.eventIcon,
          {
            backgroundColor: interrupted
              ? colors.warningWash
              : colors.dangerWash,
          },
        ]}
      >
        <Icon
          name={interrupted ? "pause-outline" : "move-outline"}
          color={interrupted ? colors.warning : colors.danger}
          size={20}
        />
      </View>
      <View style={s.flex}>
        <View style={s.eventTitleRow}>
          <Text style={s.eventTitle}>
            {interrupted ? "การเฝ้าระวังหยุดลง" : "ตรวจพบการขยับ"}
          </Text>
          {event.source === "demo" && <Text style={s.demoTag}>ตัวอย่าง</Text>}
        </View>
        <Text style={s.bodySmall}>{date}</Text>
        <Text style={s.eventData}>
          {event.acceleration.toFixed(2)} g · {event.rotation.toFixed(2)} rad/s
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, alignItems: "center" },
  app: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  brand: { flexDirection: "row", gap: 9, alignItems: "center" },
  brandIcon: {
    width: 32,
    height: 35,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: fonts.display,
    letterSpacing: -1,
    fontSize: 24,
    color: colors.ink,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  modeText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "600",
    fontFamily: fonts.body,
  },
  dot: { width: 5, height: 5, borderRadius: 4 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 26,
    gap: 14,
  },
  intro: { gap: 6, marginTop: 4, marginBottom: 2 },
  introDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
  },
  actionArea: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  actionMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  actionStatus: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 18,
    color: colors.ink,
  },
  actionTime: { fontFamily: fonts.data, fontSize: 12, color: colors.muted },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
    fontWeight: "500",
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 38,
    lineHeight: 44,
    color: colors.ink,
    letterSpacing: -1.2,
  },
  pageIntro: { gap: 6, paddingTop: 8, paddingBottom: 8 },
  demoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  demoNoteText: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 18,
    color: colors.muted,
    flex: 1,
  },
  monitor: { gap: 14, paddingTop: 6, alignItems: "center" },
  status: { alignItems: "center", gap: 5, minHeight: 55 },
  statusTitle: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  statusDescription: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 20,
    color: colors.muted,
    textAlign: "center",
  },
  sessionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingBottom: 5,
  },
  sessionItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  sessionText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  sessionDivider: { width: 1, height: 14, backgroundColor: colors.line },
  foreground: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.muted,
    lineHeight: 18,
    textAlign: "center",
    marginTop: -3,
  },
  connectPanel: { gap: 12, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1, gap: 4 },
  smallIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryWash,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 24,
    color: colors.muted,
  },
  bodySmall: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 19,
    color: colors.muted,
  },
  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 5,
  },
  tipText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 21,
    color: colors.muted,
  },
  nav: {
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  navRow: { flexDirection: "row", paddingTop: 6, paddingBottom: 4 },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    minHeight: 52,
    paddingVertical: 3,
  },
  navIcon: {
    width: 52,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 18,
    color: colors.muted,
  },
  statsRow: { flexDirection: "row", gap: 12 },
  stat: { flex: 1, gap: 7, padding: 18 },
  statNumber: { fontFamily: fonts.data, fontSize: 32, color: colors.ink },
  filters: { flexDirection: "row", gap: 6 },
  filter: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  filterSelected: { backgroundColor: colors.primaryWash },
  filterText: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  empty: { paddingVertical: 32, alignItems: "center", gap: 12 },
  emptyMascot: { width: 140, height: 140, marginBottom: 4 },
  emptyIcon: {
    height: 72,
    width: 72,
    borderRadius: 25,
    backgroundColor: colors.primaryWash,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyCopy: {
    fontFamily: fonts.body,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 23,
    textAlign: "center",
  },
  historyFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  eventRow: { flexDirection: "row", gap: 12, padding: 16 },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitleRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: fonts.body,
    color: colors.ink,
  },
  demoTag: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.warning,
    backgroundColor: colors.warningWash,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
  },
  eventData: {
    fontFamily: fonts.data,
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
  },
  settingsPanel: { gap: 16 },
  sensitivity: {
    flexDirection: "row",
    backgroundColor: colors.background,
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  sensitivityButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  sensitivitySelected: { backgroundColor: colors.primary },
  sensitivityText: {
    fontFamily: fonts.body,
    fontWeight: "600",
    fontSize: 13,
    color: colors.muted,
  },
  switchRow: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  separator: { height: 1, backgroundColor: colors.line },
  about: { paddingVertical: 20, alignItems: "center", gap: 8 },
  aboutTitle: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: "600",
  },
  aboutText: {
    fontFamily: fonts.body,
    fontSize: 10,
    lineHeight: 19,
    textAlign: "center",
    color: colors.muted,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(23,23,23,0.35)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  sheet: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "92%",
    backgroundColor: colors.background,
    borderRadius: radii.sheet,
  },
  sheetContent: { padding: 24, gap: 16 },
  sheetHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: {
    fontFamily: fonts.display,
    fontSize: 25,
    lineHeight: 35,
    color: colors.ink,
    fontWeight: "700",
  },
  sheetActions: { gap: 10, marginTop: 4 },
});
