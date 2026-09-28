import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../', import.meta.url));
const run = (args) => spawnSync('docker', args, { cwd, encoding: 'utf8', windowsHide: true, timeout: 15_000 });
const ready = () => run(['info', '--format', '{{.ServerVersion}}']).status === 0;

try {
  console.log('Проверяем Docker и базу данных…');
  if (!ready()) {
    if (process.platform !== 'win32') throw new Error('Запустите Docker и повторите pnpm dev.');
    const docker = spawn(`${process.env.ProgramFiles || 'C:\\Program Files'}\\Docker\\Docker\\Docker Desktop.exe`, [], { detached: true, stdio: 'ignore', windowsHide: true });
    docker.on('error', () => { /* The bounded readiness check below reports startup failure. */ });
    docker.unref();
    console.log('Запускаем Docker Desktop. Ожидаем готовность, до двух минут…');
    const deadline = Date.now() + 120_000;
    while (!ready() && Date.now() < deadline) await delay(2000);
    if (!ready()) throw new Error('Docker не запустился. Откройте Docker Desktop, устраните показанную ошибку и повторите pnpm dev.');
  }
  const up = run(['compose', 'up', '-d', 'postgres']);
  if (up.status !== 0) throw new Error(up.stderr.trim() || 'Не удалось запустить PostgreSQL.');
  const deadline = Date.now() + 60_000;
  let healthy = false;
  while (Date.now() < deadline) {
    const probe = run(['compose', 'exec', '-T', 'postgres', 'pg_isready', '-U', 'pulse', '-d', 'city_pulse']);
    if (probe.status === 0) { healthy = true; break; }
    await delay(1000);
  }
  if (!healthy) throw new Error('База не готова. Проверьте docker compose logs postgres. Данные не сбрасывались.');
  console.log('База готова. Запускаем API и сайт. Оставьте это окно терминала открытым.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Не удалось подготовить запуск.');
  process.exitCode = 1;
}
