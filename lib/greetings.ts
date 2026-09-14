// Verbatim port of the PWA's src/lib/greetings.ts — shared between the
// offline/error fallback greeting and the post-clear-history greeting.
export function pickGreeting(nickname: string): string {
  const options = [
    `Halo ${nickname}, mau diingetin apa nih? Atau kita diskusi checklist yang perlu disiapin dulu juga boleh 😊`,
    `Hai ${nickname}! Ada yang mau diingetin, atau mau ngobrolin persiapan sesuatu dulu?`,
    `${nickname}, gimana? Mau langsung set reminder, atau diskusi dulu checklist-nya?`,
  ];
  return options[Math.floor(Math.random() * options.length)];
}
