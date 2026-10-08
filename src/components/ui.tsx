/**
 * SameSalt UI kit — iOS-style primitives on Android and iOS alike.
 *
 * Type follows the iOS text styles (Large Title 34, Title 2 22, Headline 17,
 * Body 17, Subhead 15, Footnote 13, Caption 12) set in Inter, the closest
 * open face to SF Pro. Lists are inset-grouped: white rounded sections on the
 * grouped gray background, hairline separators inset past the leading icon.
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  heavy: 'Inter_800ExtraBold',
} as const;

type Variant =
  | 'largeTitle'
  | 'title1'
  | 'title2'
  | 'title3'
  | 'headline'
  | 'body'
  | 'callout'
  | 'subhead'
  | 'footnote'
  | 'caption';

const VARIANTS: Record<Variant, TextStyle> = {
  largeTitle: { fontFamily: Fonts.bold, fontSize: 34, lineHeight: 41, letterSpacing: -0.8 },
  title1: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  title2: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  title3: { fontFamily: Fonts.semibold, fontSize: 20, lineHeight: 25, letterSpacing: -0.3 },
  headline: { fontFamily: Fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  body: { fontFamily: Fonts.regular, fontSize: 17, lineHeight: 22, letterSpacing: -0.3 },
  callout: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 21, letterSpacing: -0.2 },
  subhead: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  footnote: { fontFamily: Fonts.regular, fontSize: 13, lineHeight: 18, letterSpacing: -0.05 },
  caption: { fontFamily: Fonts.regular, fontSize: 12, lineHeight: 16 },
};

type Weight = keyof typeof Fonts;

interface TProps extends TextProps {
  v?: Variant;
  color?: string;
  weight?: Weight;
  align?: TextStyle['textAlign'];
  tabular?: boolean;
}

/** Text with an iOS text style. `weight` swaps the Inter cut, never fontWeight. */
export function T({ v = 'body', color = Colors.label, weight, align, tabular, style, ...rest }: TProps) {
  return (
    <Text
      {...rest}
      style={[
        VARIANTS[v],
        { color },
        weight && { fontFamily: Fonts[weight] },
        align && { textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        style,
      ]}
    />
  );
}

/** Large-title page header, as on top-level iOS screens. */
export function LargeTitle({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.largeTitle}>
      <View style={{ flex: 1 }}>
        <T v="largeTitle">{title}</T>
        {subtitle ? (
          <T v="subhead" color={Colors.secondaryLabel} style={{ marginTop: 2 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

/** Inset-grouped section: optional header, white rounded body, optional footer. */
export function Section({
  header,
  footer,
  children,
  style,
  headerRight,
}: {
  header?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  headerRight?: React.ReactNode;
}) {
  return (
    <View style={[styles.section, style]}>
      {header ? (
        <View style={styles.sectionHeader}>
          <T v="footnote" color={Colors.secondaryLabel} style={styles.sectionHeaderText}>
            {header.toUpperCase()}
          </T>
          {headerRight}
        </View>
      ) : null}
      <View style={styles.sectionBody}>{children}</View>
      {footer ? (
        typeof footer === 'string' ? (
          <T v="footnote" color={Colors.secondaryLabel} style={styles.sectionFooter}>
            {footer}
          </T>
        ) : (
          <View style={styles.sectionFooter}>{footer}</View>
        )
      ) : null}
    </View>
  );
}

/** A tinted rounded-square glyph, used sparingly as a row's leading icon. */
export function Glyph({
  name,
  color = Colors.tint,
  size = 30,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color?: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={name} size={size * 0.6} color={Colors.white} />
    </View>
  );
}

/** A list row: leading view, title/subtitle, trailing value, chevron. */
export function Row({
  leading,
  title,
  subtitle,
  value,
  valueColor,
  trailing,
  chevron,
  onPress,
  last,
  titleColor,
  numberOfLines = 1,
}: {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  valueColor?: string;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  last?: boolean;
  titleColor?: string;
  numberOfLines?: number;
}) {
  const content = (
    <View style={styles.row}>
      {leading ? <View style={styles.rowLeading}>{leading}</View> : null}
      <View style={[styles.rowMain, !last && styles.rowSeparator]}>
        <View style={{ flex: 1, paddingVertical: subtitle ? 10 : 12 }}>
          {typeof title === 'string' ? (
            <T v="body" color={titleColor ?? Colors.label} numberOfLines={numberOfLines}>
              {title}
            </T>
          ) : (
            title
          )}
          {subtitle ? (
            typeof subtitle === 'string' ? (
              <T v="footnote" color={Colors.secondaryLabel} numberOfLines={2} style={{ marginTop: 2 }}>
                {subtitle}
              </T>
            ) : (
              subtitle
            )
          ) : null}
        </View>
        {value != null ? (
          typeof value === 'string' ? (
            <T v="body" color={valueColor ?? Colors.secondaryLabel} tabular style={{ marginLeft: 12 }}>
              {value}
            </T>
          ) : (
            <View style={{ marginLeft: 12 }}>{value}</View>
          )
        ) : null}
        {trailing}
        {chevron ? (
          <Ionicons name="chevron-forward" size={17} color={Colors.tertiaryLabel} style={{ marginLeft: 6 }} />
        ) : null}
      </View>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: Colors.fill }}>
      {({ pressed }) => (
        <View style={pressed ? { backgroundColor: Colors.fill } : undefined}>{content}</View>
      )}
    </Pressable>
  );
}

/** Filled / tinted / plain buttons, 50pt tall like iOS large controls. */
export function Button({
  title,
  onPress,
  kind = 'filled',
  icon,
  disabled,
  style,
  color = Colors.tint,
}: {
  title: string;
  onPress?: () => void;
  kind?: 'filled' | 'tinted' | 'plain';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  color?: string;
}) {
  const bg = kind === 'filled' ? color : kind === 'tinted' ? tintedBg(color) : 'transparent';
  const fg = kind === 'filled' ? Colors.white : color;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        kind === 'plain' && { height: 44 },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={19} color={fg} style={{ marginRight: 8 }} /> : null}
      <T v="headline" color={fg}>
        {title}
      </T>
    </Pressable>
  );
}

function tintedBg(color: string) {
  if (color === Colors.tint) return Colors.tintSoft;
  if (color === Colors.green || color === Colors.greenDeep) return Colors.greenSoft;
  if (color === Colors.red || color === Colors.redDeep) return Colors.redSoft;
  return Colors.fill;
}

/** Small capsule label. */
export function Pill({
  label,
  color = Colors.tint,
  bg,
  icon,
}: {
  label: string;
  color?: string;
  bg?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: bg ?? tintedBg(color) }]}>
      {icon ? <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} /> : null}
      <T v="caption" weight="semibold" color={color}>
        {label}
      </T>
    </View>
  );
}

/** A white rounded card on the grouped background. */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const HAIRLINE = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  largeTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  section: { marginHorizontal: 16, marginBottom: 28 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 7,
  },
  sectionHeaderText: { letterSpacing: 0.2 },
  sectionBody: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionFooter: { paddingHorizontal: 16, paddingTop: 7 },
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, minHeight: 44 },
  rowLeading: { marginRight: 14 },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  rowSeparator: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separator },
  button: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16 },
});
