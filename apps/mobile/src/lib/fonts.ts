import { cloneElement } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';

/**
 * The app styles with `fontWeight` (no NativeWind / global font). RN has no
 * first-class "default font" API, so once the Inter faces are loaded we patch
 * `Text` / `TextInput` to inject the matching `Inter-*` family for whatever
 * `fontWeight` a style already carries. An explicit `fontFamily` always wins.
 */

const BY_WEIGHT: Record<string, string> = {
  '100': 'Inter-Thin',
  '200': 'Inter-ExtraLight',
  '300': 'Inter-Light',
  '400': 'Inter-Regular',
  normal: 'Inter-Regular',
  '500': 'Inter-Medium',
  '600': 'Inter-SemiBold',
  '700': 'Inter-Bold',
  bold: 'Inter-Bold',
  '800': 'Inter-ExtraBold',
  '900': 'Inter-Black',
};

export const INTER_FONTS = {
  'Inter-Thin': require('../../assets/fonts/Inter-Thin.ttf'),
  'Inter-ExtraLight': require('../../assets/fonts/Inter-ExtraLight.ttf'),
  'Inter-Light': require('../../assets/fonts/Inter-Light.ttf'),
  'Inter-Regular': require('../../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('../../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../../assets/fonts/Inter-SemiBold.ttf'),
  'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
  'Inter-ExtraBold': require('../../assets/fonts/Inter-ExtraBold.ttf'),
  'Inter-Black': require('../../assets/fonts/Inter-Black.ttf'),
} as const;

let patched = false;

export function applyInterFont(): void {
  if (patched) return;
  patched = true;

  for (const Comp of [Text, TextInput]) {
    // `render` is the inner function of RN's forwardRef components.
    const anyComp = Comp as unknown as { render?: (...args: unknown[]) => React.ReactElement };
    const original = anyComp.render;
    if (typeof original !== 'function') continue;

    anyComp.render = function patchedRender(...args: unknown[]) {
      const element = original.apply(this, args) as React.ReactElement<{
        style?: unknown;
      }>;
      const flat = (StyleSheet.flatten(element.props.style) ?? {}) as {
        fontFamily?: string;
        fontWeight?: string | number;
      };
      if (flat.fontFamily) return element;
      const family = BY_WEIGHT[String(flat.fontWeight ?? '400')] ?? 'Inter-Regular';
      return cloneElement(element, {
        style: [element.props.style, { fontFamily: family }],
      } as never);
    };
  }
}
