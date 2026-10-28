import { StyleSheet, Text as NativeText } from 'react-native'
import type { TextProps } from 'react-native'

export function Text({
  style,
  typeface = 'jakarta',
  ...props
}: TextProps & { typeface?: 'jakarta' | 'inter' }) {
  const weight = StyleSheet.flatten(style)?.fontWeight
  const family =
    typeface === 'inter'
      ? weight === '700' ||
        weight === '800' ||
        weight === '900' ||
        weight === 'bold'
        ? 'InterBold'
        : weight === '600'
          ? 'InterSemiBold'
          : weight === '500'
            ? 'InterMedium'
            : 'InterRegular'
      : weight === '800' || weight === '900'
        ? 'JakartaExtraBold'
        : weight === '700' || weight === 'bold'
          ? 'JakartaBold'
          : weight === '600'
            ? 'JakartaSemiBold'
            : 'JakartaMedium'
  return (
    <NativeText
      {...props}
      style={[style, { fontFamily: family, fontWeight: 'normal' }]}
    />
  )
}
