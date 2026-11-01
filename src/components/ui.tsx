import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, fonts, radii } from "../theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 22,
  color = colors.ink,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    />
  );
}
export function Button({
  label,
  onPress,
  icon,
  tone = "primary",
  variant = "solid",
  disabled = false,
  busy = false,
  small = false,
  autoFocus = false,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  tone?: "primary" | "danger" | "neutral";
  variant?: "solid" | "outline" | "ghost";
  disabled?: boolean;
  busy?: boolean;
  small?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<View>(null);
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (autoFocus && Platform.OS === "web") ref.current?.focus();
  }, [autoFocus]);
  const color =
    tone === "danger"
      ? colors.danger
      : tone === "neutral"
        ? colors.ink
        : colors.primary;
  const foreground = variant === "solid" ? colors.onPrimary : color;
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        s.button,
        small && s.small,
        {
          backgroundColor:
            variant === "solid"
              ? tone === "primary" && (pressed || hovered)
                ? colors.primaryPressed
                : color
              : hovered
                ? colors.primaryWash
                : "transparent",
          borderColor: focused
            ? colors.ink
            : variant === "outline"
              ? colors.line
              : "transparent",
          opacity: disabled || busy ? 0.48 : pressed ? 0.76 : 1,
          ...(Platform.OS === "web"
            ? {
                cursor:
                  disabled || busy ? ("auto" as const) : ("pointer" as const),
              }
            : {}),
        },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : (
        icon && <Icon name={icon} color={foreground} size={small ? 18 : 21} />
      )}
      <Text
        style={[
          s.buttonLabel,
          { color: foreground },
          small && { fontSize: 14 },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[s.panel, style]}>{children}</View>;
}
export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}
export function Feedback({
  message,
  error = false,
  onDismiss,
}: {
  message: string;
  error?: boolean;
  onDismiss?: () => void;
}) {
  return (
    <View
      style={[
        s.feedback,
        { backgroundColor: error ? colors.dangerWash : colors.primaryWash },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole={error ? "alert" : undefined}
    >
      <Icon
        name={error ? "alert-circle-outline" : "information-circle-outline"}
        color={error ? colors.danger : colors.primary}
        size={20}
      />
      <Text
        style={[s.feedbackText, { color: error ? colors.danger : colors.ink }]}
      >
        {message}
      </Text>
      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="ปิดข้อความ"
          style={s.dismiss}
        >
          <Icon name="close" size={20} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}
export function PinField({
  label,
  value,
  onChangeText,
  autoFocus = false,
  onSubmit,
  error = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
  onSubmit?: () => void;
  error?: boolean;
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<TextInput>(null);
  return (
    <View style={s.field}>
      <Text onPress={() => ref.current?.focus()} style={s.fieldLabel}>
        {label}
      </Text>
      <View style={[s.fieldRow, error && { borderColor: colors.danger }]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          aria-invalid={error}
          value={value}
          onChangeText={(text) =>
            onChangeText(text.replace(/[^0-9]/g, "").slice(0, 4))
          }
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={4}
          secureTextEntry={!show}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect={false}
          onSubmitEditing={onSubmit}
          style={s.input}
          placeholder="• • • •"
          placeholderTextColor={colors.muted}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={show ? "ซ่อน PIN" : "แสดง PIN"}
          accessibilityState={{ selected: show }}
          onPress={() => setShow(!show)}
          style={s.reveal}
        >
          <Icon
            name={show ? "eye-off-outline" : "eye-outline"}
            color={colors.muted}
            size={21}
          />
        </Pressable>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: radii.control,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  small: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  buttonLabel: {
    fontFamily: fonts.display,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    flexShrink: 1,
  },
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radii.panel,
    padding: 20,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 22,
    color: colors.muted,
  },
  feedback: {
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
  },
  feedbackText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  dismiss: {
    minWidth: 40,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  field: { gap: 8 },
  fieldLabel: {
    color: colors.ink,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  fieldRow: {
    borderRadius: radii.control,
    borderColor: colors.line,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    minHeight: 56,
    fontFamily: fonts.data,
    paddingHorizontal: 16,
    fontSize: 24,
    color: colors.ink,
    letterSpacing: 7,
  },
  reveal: {
    width: 48,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
});
