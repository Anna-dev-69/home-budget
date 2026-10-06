import { Redirect } from 'expo-router';

/** Placeholder route that reserves the centre slot in the tab bar; the "+" button opens the /transaction modal instead. */
export default function AddPlaceholder() {
  return <Redirect href="/transaction" />;
}
