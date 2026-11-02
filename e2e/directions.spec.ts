import {
  test,
  expect,
  drivingRoute,
  openSpot,
  spot,
  spotPath,
} from './fixtures'

test('directions require consent, start navigation, and return to the map', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/route/v1/driving/'))
      requests.push(request.url())
  })
  await openSpot(page)
  await page.getByTestId('parking-get-directions').click()
  const consent = page.getByRole('alertdialog', { name: 'Directions privacy' })
  await expect(consent).toBeVisible()
  await expect(page.getByTestId('route-panel')).toHaveCount(0)
  expect(requests).toHaveLength(0)
  await consent.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(consent).toHaveCount(0)
  expect(requests).toHaveLength(0)
  await page.getByTestId('parking-get-directions').click()
  await consent.getByRole('button', { name: 'Continue', exact: true }).click()
  const panel = page.getByTestId('route-panel')
  await expect(page.getByTestId('navigation-banner')).toBeVisible()
  expect(requests).toHaveLength(1)
  await expect(page.getByTestId('navigation-banner')).toContainText(
    'Turn left onto Test Street',
  )
  await expect(panel).toContainText('3 min')
  await expect(panel).toContainText('650 m')
  await panel.getByRole('button', { name: 'End', exact: true }).click()
  await expect(panel).toHaveCount(0)
  await expect(
    page.getByRole('tab', { name: 'Map', exact: true }),
  ).toBeVisible()
  await page.goto(spotPath)
  await page.getByTestId('parking-get-directions').click()
  await expect(page.getByTestId('navigation-banner')).toBeVisible()
  await expect(consent).toHaveCount(0)
  await page.reload()
  await expect(panel).toHaveCount(0)
  await expect(page.getByTestId('parking-detail-title')).toHaveText(spot.name)
})

test('routing failure offers external maps and retry recovers', async ({
  page,
}) => {
  await page.route('https://e2e.parkey.test/route/v1/driving/**', (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  )
  await openSpot(page)
  await page.getByTestId('parking-get-directions').click()
  await page
    .getByRole('alertdialog', { name: 'Directions privacy' })
    .getByRole('button', { name: 'Continue', exact: true })
    .click()
  const panel = page.getByTestId('route-panel')
  await expect(panel.getByRole('alert')).toBeVisible()
  for (const provider of ['Google Maps', 'Apple Maps', 'Waze']) {
    await expect(
      panel.getByRole('button', { name: `Open in ${provider}`, exact: true }),
    ).toBeEnabled()
  }
  await page.route('https://e2e.parkey.test/route/v1/driving/**', (route) =>
    route.fulfill({ json: drivingRoute }),
  )
  await panel.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByTestId('navigation-banner')).toBeVisible()
  await expect(panel.getByRole('alert')).toHaveCount(0)
})

test('arriving allows parking confirmation and saves the car location', async ({
  page,
  context,
}) => {
  await openSpot(page)
  await page.getByTestId('parking-get-directions').click()
  await page
    .getByRole('alertdialog', { name: 'Directions privacy' })
    .getByRole('button', { name: 'Continue', exact: true })
    .click()
  await expect(page.getByTestId('navigation-banner')).toBeVisible()
  await context.setGeolocation({
    longitude: spot.longitude,
    latitude: spot.latitude,
    accuracy: 5,
  })
  const panel = page.getByTestId('route-panel')
  await expect(
    panel.getByRole('heading', { name: 'You made it!', exact: true }),
  ).toBeVisible()
  await panel
    .getByRole('button', { name: 'I parked here', exact: true })
    .click()
  await expect(
    panel.getByRole('button', { name: 'Parked here', exact: true }),
  ).toBeVisible()
  await page.goto('/?panel=saved')
  await expect(
    page.getByText('Parking location saved', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Show on map', exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`lng=${spot.longitude}&lat=${spot.latitude}`),
  )
})
