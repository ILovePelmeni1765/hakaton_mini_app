import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
function listening(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const finish = (value) => { socket.destroy(); resolve(value); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(1000, () => finish(false));
  });
}
async function healthy(origin) {
  try {
    const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(4000) });
    const body = await response.json();
    return response.ok && body.database === 'ok' && body.service === 'Пульс города';
  } catch { return false; }
}

const [api, web] = await Promise.all([listening(3000), listening(5173)]);
if (api && web && (await healthy('http://127.0.0.1:3000')) && (await healthy('http://127.0.0.1:5173'))) {
  console.log('Пульс уже запущен. Второй экземпляр не нужен.');
  console.log('Откройте http://localhost:5173 или прежний адрес компьютера на телефоне.');
} else if (api || web) {
  console.error(`Порты уже заняты: ${[api && '3000 (API)', web && '5173 (сайт)'].filter(Boolean).join(', ')}.`);
  console.error('Закройте старое окно запуска Пульса через Ctrl+C и повторите запуск. Если Docker остановлен, сначала запустите его.');
  process.exitCode = 1;
} else {
  const command = 'node scripts/ensure-dev-services.mjs && pnpm build:packages && concurrently --kill-others -n server,web -c cyan,blue "pnpm --filter @pulse/server dev" "node scripts/wait-for-api.mjs && pnpm --filter @pulse/web dev"';
  const child = spawn(command, { cwd, shell: true, stdio: 'inherit', windowsHide: true });
  child.on('error', (error) => { console.error(`Не удалось запустить приложение: ${error.message}`); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
}
