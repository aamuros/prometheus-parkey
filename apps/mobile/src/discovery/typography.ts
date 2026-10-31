import regular from '../../assets/fonts/Inter-Regular.ttf'
import semibold from '../../assets/fonts/Inter-SemiBold.ttf'
import bold from '../../assets/fonts/Inter-Bold.ttf'

// Wise's product UI uses Inter. Bundle static faces for consistent native/web
// rendering, without a font CDN or synthesized weights.
export const fonts = {
  regular: 'InterRegular',
  semibold: 'InterSemiBold',
  bold: 'InterBold',
}

export const fontSources = {
  [fonts.regular]: regular,
  [fonts.semibold]: semibold,
  [fonts.bold]: bold,
}
