import { setTimeout as delay } from 'node:timers/promises';

console.log('Ожидаем готовность API и соединения с базой…');
const deadline = Date.now() + 120_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(3000) });
    if (response.ok && (await response.json()).database === 'ok') { ready = true; break; }
  } catch { /* Compilation and initial connection may still be in progress. */ }
  await delay(1000);
}
if (ready) console.log('API готов. Открывайте адрес сайта после сообщения Vite.');
else {
  console.error('API не запустился за две минуты. Проверьте сообщения server выше.');
  process.exitCode = 1;
}
