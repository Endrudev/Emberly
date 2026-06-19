import * as Haptics from 'expo-haptics';

// Haptika může na emulátoru / nepodporovaném hardwaru selhat (vyhodit) — vždy try/catch.

export function tapLight(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // no-op — haptics unavailable
  }
}

export function tapMedium(): void {
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch {
    // no-op — haptics unavailable
  }
}

export function success(): void {
  try {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // no-op — haptics unavailable
  }
}
