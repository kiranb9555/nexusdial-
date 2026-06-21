/**
 * Simulated STT. We intentionally do NOT call a real speech-to-text API.
 * A transcript is chosen at random from a small set of realistic
 * Hindi/English (Hinglish) voicemail scripts.
 */
const VOICEMAIL_SCRIPTS: readonly string[] = [
  'Hello bhaiya, main Rohit bol raha hoon. Aapke product ke baare mein jaankari chahiye thi. Please call me back.',
  'Hi, this is Priya from Sharma Textiles. We want to place a bulk order for next month. Kindly call back urgently.',
  'Namaste, main Anil hoon. Pichli payment ka invoice nahi mila. Thoda dekh lijiye please.',
  'Hey, I had a really bad experience with the last delivery. Items were damaged. I want a refund.',
  'Sir ji, plumbing ka kaam karwana hai ghar pe. Kal subah aa sakte ho kya? Call back kar dena.',
  'Hello, just wanted to say thank you, the service was excellent! Will definitely recommend to friends.',
  'Hi, main Meena bol rahi hoon. Aapke clinic mein appointment book karni thi for Saturday.',
  'Boss, the shipment still not arrived. Bahut der ho gayi hai. Please update karo status.',
  'Good evening, this is Karan. Interested in your premium plan pricing. Callback requested.',
  'Aadaab, main Imran. Catering order ke liye quotation chahiye 50 logon ka. Reply kar dijiye.',
];

export function generateTranscript(): string {
  const idx = Math.floor(Math.random() * VOICEMAIL_SCRIPTS.length);
  // noUncheckedIndexedAccess: guard the lookup.
  return VOICEMAIL_SCRIPTS[idx] ?? VOICEMAIL_SCRIPTS[0]!;
}
