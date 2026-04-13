import PlayClient from './PlayClient'

// Server component — reads CESIUM_ION_TOKEN from the server environment.
// The token is passed as a prop and is NEVER included in the client JS bundle,
// making it invisible to anyone inspecting the page source or network requests.
export default function PlayPage() {
  const ionToken = process.env.CESIUM_ION_TOKEN ?? ''
  return <PlayClient ionToken={ionToken} />
}
