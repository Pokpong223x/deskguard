import { Platform } from "react-native";

export const colors = {
  background: "#FFFFFF",
  surface: "#F5F5F5",
  ink: "#171717",
  muted: "#636363",
  primary: "#171717",
  primaryPressed: "#333333",
  primaryWash: "#ECECEC",
  line: "#E3E3E3",
  success: "#306B46",
  successWash: "#E5F2D4",
  warning: "#785A11",
  warningWash: "#F6F1C8",
  danger: "#A72F3D",
  dangerWash: "#F9D9DE",
  lavender: "#C9CEF4",
  yellow: "#F0ED91",
  mint: "#CAE999",
  pink: "#EF8E9B",
  lilac: "#D6A5F5",
  orange: "#FF8D4A",
  chart: "#7757B8",
  onPrimary: "#FFFFFF",
  darkScreen: "#000000",
};
export const fonts = {
  body: "AnuphanRegular",
  medium: "AnuphanMedium",
  display: "AnuphanBold",
  data: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  }),
};
export const radii = { control: 12, panel: 28, sheet: 28 };
