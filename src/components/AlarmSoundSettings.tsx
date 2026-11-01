import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "../theme";
import { Button, Feedback, Icon, Panel } from "./ui";

export interface AlarmSoundSettingsProps {
  sound: { name: string; size: number; sourceName?: string } | null;
  busy: boolean;
  previewing: boolean;
  previewLoading: boolean;
  disabled: boolean;
  soundEnabled: boolean;
  usingDefault?: boolean;
  error: string | null;
  notice: string | null;
  onChoose: () => void;
  onPreview: () => void;
  onReset: () => void;
}

function fileSizeLabel(size: number): string {
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.ceil(size / 1024))} KB`;
}

export function AlarmSoundSettings({
  sound,
  busy,
  previewing,
  previewLoading,
  disabled,
  soundEnabled,
  usingDefault = false,
  error,
  notice,
  onChoose,
  onPreview,
  onReset,
}: AlarmSoundSettingsProps) {
  const locked = disabled || busy;

  return (
    <Panel style={s.panel}>
      <View style={s.selectedSound}>
        <View style={s.icon}>
          <Icon name="musical-notes-outline" size={24} />
        </View>
        <View style={s.copy}>
          <Text style={s.label}>เสียงที่ใช้แจ้งเตือน</Text>
          <Text style={s.name}>{sound?.name ?? "เสียง DeskGuard"}</Text>
          <Text style={s.caption}>
            {usingDefault
              ? "ไฟล์นี้เล่นไม่ได้ · กำลังใช้เสียง DeskGuard"
              : sound
                ? `${fileSizeLabel(sound.size)} · ${sound.sourceName ? "เสียงจากวิดีโอ" : "ไฟล์ของคุณ"}`
                : "เสียงเริ่มต้นของแอป"}
          </Text>
          {!!sound?.sourceName && (
            <Text style={s.caption}>จาก {sound.sourceName}</Text>
          )}
        </View>
      </View>

      <View style={s.actions}>
        <Button
          small
          label={
            busy
              ? "กำลังเตรียมเสียง…"
              : sound
                ? "เปลี่ยนไฟล์"
                : "เลือกเสียงหรือวิดีโอ"
          }
          icon="folder-open-outline"
          disabled={disabled}
          busy={busy}
          onPress={onChoose}
        />
        <Button
          small
          label={
            previewing
              ? "หยุดฟัง"
              : previewLoading
                ? "กำลังโหลดเสียง…"
                : "ฟังตัวอย่าง"
          }
          icon={previewing ? "stop-outline" : "play-outline"}
          variant="outline"
          disabled={locked && !previewing}
          busy={previewLoading && !previewing}
          onPress={onPreview}
        />
        {sound && (
          <Button
            small
            label="ใช้เสียงเริ่มต้น"
            icon="refresh-outline"
            variant="ghost"
            disabled={locked || previewLoading}
            onPress={onReset}
          />
        )}
      </View>

      <Text style={s.caption}>
        MP3, M4A, WAV, AAC และวิดีโอ MP4 · ไม่เกิน 10 MB{"\n"}
        ใช้เฉพาะเสียงจากวิดีโอ · แยกเสียงและเก็บไว้บนอุปกรณ์นี้{"\n"}
        ฟังตัวอย่างได้สูงสุด 10 วินาที
      </Text>
      {!soundEnabled && (
        <Text style={s.caption}>
          ปิดเสียงเตือนอยู่ ไฟล์นี้จะใช้เมื่อเปิดเสียง แต่ยังกดฟังตัวอย่างได้
        </Text>
      )}
      {disabled && (
        <Text style={s.caption}>หยุดเฝ้าระวังก่อนเปลี่ยนหรือทดลองเสียง</Text>
      )}
      {!!error && <Feedback message={error} error />}
      {!error && !!notice && <Feedback message={notice} />}
    </Panel>
  );
}

const s = StyleSheet.create({
  panel: { gap: 14 },
  selectedSound: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.lavender,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  label: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 18,
    color: colors.muted,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 23,
    color: colors.ink,
    flexShrink: 1,
  },
  caption: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 19,
    color: colors.muted,
  },
  actions: { gap: 8 },
});
