export async function sendTelegramMessage(chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ description: res.statusText }));
    throw new Error(`Telegram send failed: ${(err as any).description || res.statusText}`);
  }
}
