import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Eye, EyeOff, MapPinned, ShieldCheck, UsersRound } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button, Card } from '@pulse/ui';
import { api } from '../api';
import { useAppStore } from '../store';
import type { User } from '../types';
import { platform } from '../platform';
import { PulseBrandMark } from '../components/PulseBrandMark';

export function OnboardingPage() {
  const complete = useAppStore((s) => s.completeOnboarding); const navigate = useNavigate(); const [step, setStep] = useState(0);
  const slides = [
    { icon: MapPinned, title: 'Проблема становится общей задачей', text: 'Отметьте место на карте, приложите фото — и жители рядом помогут подтвердить ситуацию.' },
    { icon: UsersRound, title: 'Каждый шаг виден городу', text: 'Оператор назначает службу и срок, исполнитель показывает ход работ и публикует результат.' },
    { icon: ShieldCheck, title: 'Результат проверяют жители', text: 'Исполнитель не может закрыть проблему сам. Финальное решение опирается на проверку с места.' },
  ]; const SlideIcon = slides[step]!.icon;
  const next = () => { if (step < slides.length - 1) setStep(step + 1); else { complete(); navigate('/login'); } };
  return <div className="auth-page onboarding">
    <header className="onboarding-brand"><div className="brand"><PulseBrandMark className="brand__mark" /><span><strong>Пульс города</strong><small>Город меняется с вашего сигнала</small></span></div></header>
    <main className="onboarding__content"><span className="onboarding-step">Шаг {step + 1} из {slides.length}</span><h1>{slides[step]!.title}</h1><p>{slides[step]!.text}</p><div className="onboarding__dots" aria-label={'Шаг ' + (step + 1) + ' из ' + slides.length}>{slides.map((_, index) => <button key={index} type="button" aria-label={'Шаг ' + (index + 1)} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}><span /></button>)}</div><Button onClick={next}>{step === slides.length - 1 ? 'Начать' : 'Продолжить'}<ArrowRight size={18} /></Button><button className="text-button" onClick={() => { complete(); navigate('/login'); }}>Пропустить знакомство</button></main>
    <section className="onboarding__visual" aria-label="Как работает обращение"><span className="onboarding-symbol"><SlideIcon size={28} /></span><h2>От сигнала до результата</h2><ol className="onboarding-flow"><li aria-current={step === 0 ? 'step' : undefined}><MapPinned /><div><strong>Сообщите о проблеме</strong><p>Точка на карте, описание и фото с места.</p></div></li><li aria-current={step === 1 ? 'step' : undefined}><UsersRound /><div><strong>Следите за работами</strong><p>Ответственная служба, срок и история действий.</p></div></li><li aria-current={step === 2 ? 'step' : undefined}><ShieldCheck /><div><strong>Проверьте результат</strong><p>Оценка жителей после отчёта исполнителя.</p></div></li></ol></section>
  </div>;
}

export function LoginPage() {
  const sessionMessage = useAppStore((s) => s.sessionMessage);
  const [platformError, setPlatformError] = useState('');
  const { register, handleSubmit, formState: { errors } } = useForm<{ email: string; password: string }>({ defaultValues: { email: 'resident@pulse.local', password: 'pulse2026' } });
  const setSession = useAppStore((s) => s.setSession); const user = useAppStore((s) => s.user); const navigate = useNavigate(); const [passwordVisible, setPasswordVisible] = useState(false);
  const login = useMutation({ mutationFn: (values: { email: string; password: string }) => api<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', json: values }), onSuccess: ({ accessToken, user }) => { setSession(accessToken, user); navigate(user.role === 'RESIDENT' ? '/map' : user.role === 'OPERATOR' ? '/operator' : user.role === 'CONTRACTOR' ? '/contractor' : '/admin'); } });
  const demo = useMutation({ mutationFn: ({ role, email }: { role: string; email?: string }) => api<{ accessToken: string; user: User }>('/auth/demo', { method: 'POST', json: { role, email } }), onSuccess: ({ accessToken, user }) => { setSession(accessToken, user); navigate(user.role === 'RESIDENT' ? '/map' : user.role === 'OPERATOR' ? '/operator' : user.role === 'CONTRACTOR' ? '/contractor' : '/admin'); } });
  useEffect(() => { const initData = platform.getAuthPayload(); if (initData) api<{ accessToken: string; user: User }>('/auth/telegram', { method: 'POST', json: { initData } }).then(({ accessToken, user }) => { setSession(accessToken, user); navigate('/map'); }).catch((error: unknown) => setPlatformError(error instanceof Error ? error.message : 'Не удалось войти через Telegram. Повторите попытку.')); }, []);
  if (user) return <Navigate to={user.role === 'RESIDENT' ? '/map' : user.role === 'OPERATOR' ? '/operator' : user.role === 'CONTRACTOR' ? '/contractor' : '/admin'} replace />;
  return <div className="auth-page login-page">
    <section className="login-showcase" aria-label="Как работает Пульс города">
      <header className="login-brandbar">
        <div className="brand brand--auth"><PulseBrandMark className="brand__mark" /><span><strong>Пульс города</strong></span></div>
        <div className="login-trust" aria-label="Принципы сервиса">
          <span><i className="login-trust__icon login-trust__icon--status"><Eye /></i>Прозрачный статус</span>
          <span><i className="login-trust__icon login-trust__icon--owner"><UsersRound /></i>Ответственный виден</span>
          <span><i className="login-trust__icon login-trust__icon--check"><CheckCircle2 /></i>Проверка жителями</span>
        </div>
      </header>

      <div className="login-mosaic">
        <article className="login-tile login-tile--signal">
          <h1>Ваш сигнал запускает изменения</h1>
          <p>Отметьте проблему на карте — мы покажем, кто отвечает и как меняется её статус.</p>
          <button className="login-signal__action" type="button" onClick={() => document.getElementById('login-card')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })}>От сигнала к результату <ArrowRight size={20} /></button>
        </article>

        <article className="login-tile login-tile--flow">
          <div><span className="flow-icon flow-icon--signal"><MapPinned /></span><span><small>Шаг 1</small><strong>Сигнал принят</strong></span></div>
          <div><span className="flow-icon flow-icon--work"><ShieldCheck /></span><span><small>Шаг 2</small><strong>Служба назначена</strong></span></div>
          <div><span className="flow-icon flow-icon--done"><CheckCircle2 /></span><span><small>Шаг 3</small><strong>Результат проверен</strong></span></div>
        </article>
      </div>
    </section>

    <section className="login-panel">
      <Card className="login-card" id="login-card">
        <div className="login-card__heading"><span className="login-card__mark"><MapPinned /></span><div><h2>Войти в Пульс</h2><p>Продолжите следить за городскими сигналами.</p></div></div>
        <form onSubmit={handleSubmit((values) => login.mutate(values))}>
          <label>Электронная почта<input {...register('email', { required: 'Укажите почту' })} type="email" autoComplete="username" aria-invalid={Boolean(errors.email)} /></label>
          <label>Пароль<div className="input-icon"><input {...register('password', { required: 'Укажите пароль' })} type={passwordVisible ? 'text' : 'password'} autoComplete="current-password" /><button type="button" onClick={() => setPasswordVisible(!passwordVisible)} aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}>{passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          {(login.error || demo.error || sessionMessage || platformError) && <div className="form-error" role="alert">{(login.error || demo.error)?.message ?? (platformError || sessionMessage)}</div>}
          <Button type="submit" disabled={login.isPending}>{login.isPending ? 'Входим…' : 'Войти'}<ArrowRight size={18} /></Button>
        </form>
        <div className="divider"><span>быстрый демо-вход</span></div>
        <div className="demo-grid">
          <button type="button" onClick={() => demo.mutate({ role: 'RESIDENT' })}><UsersRound />Житель<ArrowRight /></button>
          <button type="button" onClick={() => demo.mutate({ role: 'OPERATOR' })}><ShieldCheck />Оператор<ArrowRight /></button>
          <button type="button" onClick={() => demo.mutate({ role: 'CONTRACTOR' })}><CheckCircle2 />Исполнитель<ArrowRight /></button>
          <button type="button" onClick={() => demo.mutate({ role: 'ADMIN' })}><MapPinned />Администратор<ArrowRight /></button>
        </div>
        <details><summary>Другие жители для проверки сценария</summary><div className="resident-switch"><button type="button" onClick={() => demo.mutate({ role: 'RESIDENT', email: 'resident2@pulse.local' })}>Михаил Левин</button><button type="button" onClick={() => demo.mutate({ role: 'RESIDENT', email: 'resident3@pulse.local' })}>Елена Ким</button></div></details>
      </Card>
    </section>
  </div>;
}
