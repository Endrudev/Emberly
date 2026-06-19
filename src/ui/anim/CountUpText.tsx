import { Text, type StyleProp, type TextStyle } from 'react-native';

import { useCountUp } from './useCountUp';

interface CountUpTextProps {
  /** Target value to count toward. */
  value: number;
  /** Appended after the (rounded) number, e.g. "%". */
  suffix?: string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Renders a number that count-ups to `value`. The rAF-driven setState lives
 * HERE, isolated in its own component, so the animation re-renders only this
 * tiny Text — not the parent screen (and its list). Keeps high-frequency
 * count-up off the expensive render path.
 */
export function CountUpText({ value, suffix = '', duration = 400, style }: CountUpTextProps) {
  const display = Math.round(useCountUp(value, duration));
  return <Text style={style}>{`${display}${suffix}`}</Text>;
}
