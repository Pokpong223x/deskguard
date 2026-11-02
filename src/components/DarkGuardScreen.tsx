import { Text } from "../i18n";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";
import { Button, Icon } from "./ui";

/** A foreground display mode, never a claim that iOS can monitor while locked. */
export function DarkGuardScreen({
  alarm,
  demo,
  elapsedSeconds,
  onAuthenticate,
  onReturn,
}: {
  alarm: boolean;
  demo: boolean;
  elapsedSeconds: number;
  onAuthenticate: () => void;
  onReturn: () => void;
}) {
  const duration = `${Math.floor(elapsedSeconds / 60)
    .toString()
    .padStart(2, "0")}:${(elapsedSeconds % 60).toString().padStart(2, "0")}`;
  return (
    <SafeAreaView
      style={s.screen}
      accessibilityViewIsModal
      accessibilityLabel="หน้าจอมืดระหว่างเฝ้าระวัง"
    >
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.status}>
          <Icon
            name={alarm ? "alert-circle-outline" : "shield-checkmark-outline"}
            size={34}
            color={colors.line}
          />
          <Text style={s.eyebrow}>หน้าจอมืด · จอยังเปิดอยู่</Text>
          <Text
            style={s.heading}
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
          >
            {alarm ? "ตรวจพบการขยับ" : "กำลังเฝ้าระวัง"}
          </Text>
          <Text style={s.time}>{duration}</Text>
          {demo && <Text style={s.caption}>โหมดตัวอย่าง · ข้อมูลจำลอง</Text>}
        </View>
        <View style={s.actions}>
          <Button
            label={
              alarm ? "ยืนยันตัวตนเพื่อหยุดเตือน" : "ยืนยันตัวตนเพื่อหยุดเฝ้า"
            }
            icon="lock-open-outline"
            autoFocus
            style={s.button}
            onPress={onAuthenticate}
          />
          <Button
            label="กลับไปหน้าเฝ้าระวัง"
            style={s.button}
            onPress={onReturn}
          />
          <Text style={s.caption}>
            กลับหน้าหลักแล้วยังเฝ้าต่อ{"\n"}หากกดล็อกเครื่องหรือออกจากแอป
            การตรวจจับจะหยุด{"\n"}
            หน้าเฝ้าระวังจะกลับเป็นหน้าจอมืดใน 15 วินาที{"\n\n"}
            ป้องกันการปัดออก: เปิด Guided Access ในการตั้งค่า iPhone →
            การช่วยการเข้าถึง แล้วกลับมาแอป กดปุ่มด้านข้าง 3 ครั้งและเริ่มใช้งาน
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.darkScreen },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 56,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  status: { alignItems: "center", gap: 12 },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 20,
    color: colors.line,
    textAlign: "center",
  },
  heading: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 38,
    color: colors.line,
    textAlign: "center",
  },
  time: {
    fontFamily: fonts.data,
    fontSize: 18,
    lineHeight: 28,
    color: colors.line,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 22,
    color: colors.line,
    textAlign: "center",
  },
  actions: { gap: 12 },
  button: { borderColor: colors.muted, borderWidth: 1 },
});
