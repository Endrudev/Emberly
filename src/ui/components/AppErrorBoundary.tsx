import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getTranslation } from '@/i18n';
import { COLORS } from '@/ui/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fallback nesmí záviset na PaperProvider/theme kontextu ani na useTranslation() hooku —
// obojí může být zrovna to, co je rozbité (boundary obaluje appku i nad těmito providery).
// Proto natvrdo COLORS z theme.ts (jen konstanty, ne hook) a text přes getTranslation() —
// to je obyčejná funkce čtoucí zustand store přímo (get State()), ne React hook, takže
// nezávisí na tom, jestli se strom komponent/providerů vůbec podařilo vykreslit.
export class AppErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (!this.state.hasError) return this.props.children;
    const t = getTranslation();

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t.errorBoundary.title}</Text>
        <Text style={styles.body}>{t.errorBoundary.body}</Text>
        <Pressable
          style={styles.button}
          onPress={this.handleRetry}
          accessibilityRole="button"
          accessibilityLabel={t.errorBoundary.retry}
        >
          <Text style={styles.buttonText}>{t.errorBoundary.retry}</Text>
        </Pressable>
        {this.state.error?.message ? (
          <ScrollView style={styles.errorBox}>
            <Text style={styles.errorText} selectable>
              {this.state.error.message}
            </Text>
          </ScrollView>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  errorBox: {
    marginTop: 24,
    maxHeight: 160,
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  errorText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: COLORS.textTertiary,
  },
});
