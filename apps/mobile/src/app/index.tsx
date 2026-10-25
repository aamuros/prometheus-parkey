import type { AppInfo } from '@parkey/shared-types'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const app: AppInfo = {
  name: 'Parkey',
  description: 'A little less circling. A little more living.',
}

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.brand}>
          {app.name}
        </Text>
        <Text style={styles.location}>POBLACION, MAKATI</Text>
      </View>
      <View style={styles.content}>
        <View accessible={false} style={styles.mark}>
          <Text style={styles.markText}>P</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Welcome to{'\n'}your next stop.
        </Text>
        <Text style={styles.description}>{app.description}</Text>
        <Text style={styles.note}>Your parking companion is on its way.</Text>
      </View>
      <Text style={styles.footer}>Made for the neighborhood.</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F6F5F0', paddingHorizontal: 28 },
  header: { paddingTop: 20, gap: 8 },
  brand: {
    color: '#173E31',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  location: {
    color: '#59665E',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
  },
  content: { flex: 1, justifyContent: 'center', paddingVertical: 40 },
  mark: {
    width: 76,
    height: 76,
    backgroundColor: '#173E31',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  markText: { color: '#F6F5F0', fontSize: 48, fontWeight: '800' },
  title: {
    color: '#182B22',
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: -1.5,
  },
  description: {
    color: '#4F6056',
    fontSize: 18,
    lineHeight: 28,
    marginTop: 20,
  },
  note: { color: '#59665E', fontSize: 14, lineHeight: 22, marginTop: 24 },
  footer: { color: '#59665E', fontSize: 13, paddingBottom: 24 },
})
