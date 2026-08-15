/**
 * Anonymous identity generator for zero-account privacy chat
 */

const ADJECTIVES = [
  'Neon', 'Silent', 'Ghost', 'Solar', 'Jade', 'Shadow', 'Abyssal', 'Cosmic',
  'Velvet', 'Obsidian', 'Cipher', 'Vortex', 'Echo', 'Stealth', 'Mystic', 'Prism',
  'Astral', 'Cobalt', 'Crimson', 'Emerald', 'Static', 'Quantum', 'Glitch', 'Polar'
];

const NOUNS = [
  'Raven', 'Moon', 'Panther', 'Falcon', 'Wolf', 'Fox', 'Lynx', 'Viper',
  'Hawk', 'Specter', 'Drifter', 'Nova', 'Puma', 'Stalker', 'Phoenix', 'Oracle',
  'Wanderer', 'Onyx', 'Sentinel', 'Nomad', 'Hydra', 'Griffin', 'Cobra', 'Zephyr'
];

export const AVATAR_COLORS = [
  { name: 'Emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', hex: '#10B981' },
  { name: 'Cyan', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30', hex: '#06B6D4' },
  { name: 'Violet', bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30', hex: '#8B5CF6' },
  { name: 'Amber', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30', hex: '#F59E0B' },
  { name: 'Rose', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30', hex: '#F43F5E' },
  { name: 'Indigo', bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30', hex: '#6366F1' },
  { name: 'Teal', bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/30', hex: '#14B8A6' },
  { name: 'Sky', bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/30', hex: '#0EA5E9' },
];

export function generateAnonymousIdentity() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const id = 'mem_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

  return {
    id,
    displayName: `${adj} ${noun}`,
    avatarColor: color.hex,
  };
}

export function generateSecureRoomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  // Convert to URL-friendly lowercase string
  let result = '';
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  for (let i = 0; i < bytes.length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  // format as xxx-xxx-xxx for easy reading & sharing
  return `${result.slice(0, 3)}-${result.slice(3, 6)}-${result.slice(6, 9)}`;
}
