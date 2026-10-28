import { memo, useEffect, useState } from 'react'
import { Image, Platform, View } from 'react-native'
import { SvgXml } from 'react-native-svg'

import { designAssets } from './assets'
import type { DesignAssetName } from './assets'

const svgText = new Map<string, string>()
const requests = new Map<string, Promise<string>>()

function loadSvg(uri: string): Promise<string> {
  const cached = svgText.get(uri)
  if (cached !== undefined) return Promise.resolve(cached)
  const pending = requests.get(uri)
  if (pending) return pending
  const request = fetch(uri)
    .then(async (response) => {
      if (!response.ok && !(response.status === 0 && uri.startsWith('file://')))
        throw new Error('Unable to load local artwork')
      const xml = await response.text()
      svgText.set(uri, xml)
      return xml
    })
    .finally(() => requests.delete(uri))
  requests.set(uri, request)
  return request
}

export async function preloadArtwork() {
  if (Platform.OS === 'web') return
  await Promise.all(
    Object.values(designAssets).map((asset) => {
      const uri = Image.resolveAssetSource(asset.source)?.uri
      return uri ? loadSvg(uri) : Promise.resolve()
    }),
  )
}

function NativeArtwork({ uri }: { uri: string }) {
  const [xml, setXml] = useState(() => svgText.get(uri) ?? null)
  useEffect(() => {
    let mounted = true
    void loadSvg(uri)
      .then((value) => {
        if (mounted) setXml(value)
      })
      .catch(() => console.warn('Unable to display Parkey artwork'))
    return () => {
      mounted = false
    }
  }, [uri])
  return <SvgXml xml={xml} />
}

// Keep the downloaded SVG root bounds, including shadow overflow, unchanged.
// Cached XML prevents icons and maps from flashing blank when a route mounts.
export const Artwork = memo(function Artwork({
  name,
}: {
  name: DesignAssetName
}) {
  const asset = designAssets[name]
  const uri =
    Platform.OS === 'web' ? null : Image.resolveAssetSource(asset.source)?.uri
  return (
    <View
      accessible={false}
      pointerEvents="none"
      style={{ width: asset.width, height: asset.height }}
    >
      {Platform.OS === 'web' ? (
        <Image
          accessible={false}
          source={asset.source}
          style={{ width: asset.width, height: asset.height }}
        />
      ) : uri ? (
        <NativeArtwork key={uri} uri={uri} />
      ) : null}
    </View>
  )
})
