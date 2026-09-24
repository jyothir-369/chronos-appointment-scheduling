import { resolveTimeZone } from '../lib/timezone';
export default async function HomePage() {
  const tz = resolveTimeZone();
  return <main aria-label="Home"><h1>Chronos</h1><p>Zone: {tz}</p></main>;
}
