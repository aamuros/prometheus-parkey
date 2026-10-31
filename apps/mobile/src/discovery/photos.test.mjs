import assert from 'node:assert/strict'
import test from 'node:test'

import { isParkingPhoto, parkingPhotos, photoPage } from './photos.ts'
import { sampleParking } from './sample-data.ts'

const photo = {
  id: 'entrance',
  thumbnailUrl: 'https://images.example.test/entrance-small.jpg',
  imageUrl: 'https://images.example.test/entrance.jpg',
  caption: 'Entrance from the street',
  credit: 'Location photographer',
  sourceUrl: 'https://example.test/photos/entrance',
  license: 'Used with permission',
}

test('curated photos match the same source identity across local and server IDs', () => {
  const local = {
    ...sampleParking[0],
    id: 'osm:way/123',
    sourceUrl: 'https://www.openstreetmap.org/way/123',
  }
  const remote = { ...local, id: 'server-uuid' }
  const catalog = {
    [local.sourceUrl]: [photo],
    [remote.id]: [{ ...photo, id: 'fallback' }],
  }
  assert.deepEqual(parkingPhotos(local, catalog), [photo])
  assert.deepEqual(parkingPhotos(remote, catalog), [photo])
  assert.deepEqual(parkingPhotos(remote, { [remote.id]: [photo] }), [photo])
})

test('missing photos and unknown sources yield an empty gallery, never local contribution evidence', () => {
  assert.deepEqual(parkingPhotos(sampleParking[0]), [])
  assert.deepEqual(
    parkingPhotos({ ...sampleParking[0], sourceUrl: null }, {}),
    [],
  )
  assert.deepEqual(
    parkingPhotos(
      { ...sampleParking[0], id: 'constructor', sourceUrl: null },
      {},
    ),
    [],
  )
  assert.equal(
    isParkingPhoto({ photoUri: 'file:///private/signage.jpg' }),
    false,
  )
})

test('invalid URLs and incomplete photo attribution are rejected without hiding valid photos', () => {
  assert.equal(isParkingPhoto(photo), true)
  for (const patch of [
    { imageUrl: 'http://example.test/photo.jpg' },
    { thumbnailUrl: 'file:///photo.jpg' },
    { imageUrl: 'javascript:alert(1)' },
    { sourceUrl: 'not a URL' },
    { imageUrl: 'https://user:secret@example.test/photo.jpg' },
    { caption: ' ' },
    { credit: '' },
    { license: '' },
    { id: '' },
  ])
    assert.equal(isParkingPhoto({ ...photo, ...patch }), false)
  assert.equal(isParkingPhoto(null), false)
  assert.equal(isParkingPhoto({}), false)
  assert.deepEqual(
    parkingPhotos(sampleParking[0], {
      [sampleParking[0].id]: [{ ...photo, credit: '' }, photo],
    }),
    [photo],
  )
})

test('gallery paging handles swipe offsets, overscroll, single images, and empty galleries', () => {
  assert.equal(photoPage(0, 320, 3), 0)
  assert.equal(photoPage(320, 320, 3), 1)
  assert.equal(photoPage(640, 320, 3), 2)
  assert.equal(photoPage(-200, 320, 3), 0)
  assert.equal(photoPage(2000, 320, 3), 2)
  assert.equal(photoPage(320, 320, 1), 0)
  assert.equal(photoPage(320, 0, 3), 0)
  assert.equal(photoPage(0, 320, 0), 0)
  assert.equal(photoPage(NaN, 320, 3), 0)
})
