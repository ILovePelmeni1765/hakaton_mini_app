import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import { AlertCircle, Bell, BellOff, CalendarClock, Camera, Check, CheckCircle2, CircleDot, Clock3, Flag, MapPin, MessageCircle, MoreHorizontal, RefreshCcw, Reply, Send, Share2, ShieldCheck, ThumbsDown, ThumbsUp, Trash2, Users, Wrench, XCircle } from 'lucide-react';
import { Button, Card } from '@pulse/ui';
import { categoryLabels, CATEGORIES, statusLabels } from '@pulse/shared';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { io } from 'socket.io-client';
import { api, SOCKET_URL, uploadImage } from '../api';
import type { Organization, Problem } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { platform } from '../platform';
import { useAppStore } from '../store';
import { ImageAttachments, ImagePicker, type ImageAttachment } from '../components/ImageAttachments';

const lifecycle = ['AWAITING_COMMUNITY_CONFIRMATION', 'OPERATOR_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'OPERATOR_VERIFICATION', 'COMMUNITY_VERIFICATION', 'RESOLVED'];

export function ProblemDetailPage() {
  const { id = '' } = useParams(); const [params] = useSearchParams(); const queryClient = useQueryClient(); const [tab, setTab] = useState<'overview' | 'discussion' | 'history'>('overview'); const [toast, setToast] = useState(params.get('created') ? 'Обращение опубликовано и появилось на карте' : '');
  const problem = useQuery({ queryKey: ['problem', id], queryFn: () => api<Problem>(`/problems/${id}`) });
  useEffect(() => { const socket = io(`${SOCKET_URL}/city`, { transports: ['websocket', 'polling'] }); socket.emit('problem:join', id); const refresh = () => void queryClient.invalidateQueries({ queryKey: ['problem', id] }); ['problem:status', 'problem:confirmation', 'problem:vote', 'problem:report', 'problem:evidence', 'problem:metadata', 'comment:new', 'comment:deleted'].forEach((event) => socket.on(event, refresh)); return () => { socket.disconnect(); }; }, [id]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4200); return () => clearTimeout(timer); }, [toast]);
  if (problem.isLoading) return <DetailSkeleton />;
  if (problem.error || !problem.data) return <div className="page page-pad"><Card className="error-card"><AlertCircle /><div><h2>Обращение не найдено</h2><p>{problem.error?.message}</p></div></Card></div>;
  const item = problem.data; const activeIndex = lifecycle.indexOf(item.status); const before = item.media.filter((m) => m.kind === 'BEFORE' || m.kind === 'EVIDENCE'); const after = [...item.media.filter((m) => m.kind === 'AFTER'), ...item.reports.flatMap((r) => r.media)];
  const share = () => void platform.shareProblem({ id: item.id, title: item.title, url: window.location.href });
  return <div className="detail-page page-pad">
    {toast && <div className="toast" role="status"><CheckCircle2 />{toast}</div>}
    <header className="detail-header"><div className="breadcrumbs"><span>Обращение № {item.number}</span><strong>{categoryLabels[item.category]}</strong></div><div className="detail-header__actions"><SubscribeButton item={item} onDone={() => queryClient.invalidateQueries({ queryKey: ['problem', id] })} /><button className="icon-button labelled-action" onClick={share} aria-label="Поделиться"><Share2 /><span>Поделиться</span></button><ProblemMoreActions onHistory={() => setTab('history')} onDiscussion={() => setTab('discussion')} /></div></header>
    <div className="detail-layout"><article className="detail-main">
      <section className="detail-title"><div className="detail-title__badges"><StatusBadge status={item.status} /><span className={`priority priority--${item.priority.toLowerCase()}`}>{item.priority === 'CRITICAL' ? 'Опасно' : item.priority === 'HIGH' ? 'Высокий приоритет' : 'Обычный приоритет'}</span></div><h1>{item.title}</h1><p><MapPin size={17} />{item.address}</p></section>
      <div className="detail-tabs" role="tablist"><button role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Обзор</button><button role="tab" aria-selected={tab === 'discussion'} className={tab === 'discussion' ? 'active' : ''} onClick={() => setTab('discussion')}>Обсуждение <span>{item.comments.length}</span></button><button role="tab" aria-selected={tab === 'history'} className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>История <span>{item.history.length}</span></button></div>
      {tab === 'overview' && <div className="detail-sections">
        <Card className="photo-section"><div className="section-heading"><div><span className="eyebrow">Фотофиксация</span><h2>{after.length ? 'До и после' : 'Состояние на месте'}</h2></div><span>{before.length + after.length} фото</span></div><div className={`comparison ${after.length ? '' : 'comparison--single'}`}><PhotoColumn label={after.length ? "До" : "Фото с места"} media={before} fallback="Фотография до работ пока не добавлена" />{after.length > 0 && <PhotoColumn label="После" media={after} fallback="" />}</div></Card>
        <Card className="description-section"><h2>Что произошло</h2><p>{item.description}</p><div className="author-line"><span className="avatar">{item.author.displayName.split(' ').map((p) => p[0]).join('').slice(0, 2)}</span><div><strong>{item.author.displayName}</strong><span>Автор обращения · доверие {item.author.trustLevel ?? 1}</span></div><time>{format(new Date(item.createdAt), 'd MMMM, HH:mm', { locale: ru })}</time></div></Card>
        {item.officialResponse && <Card className="official-response"><span className="official-icon"><ShieldCheck /></span><div><span className="eyebrow">Официальный ответ</span><h2>Городской оператор</h2><p>{item.officialResponse}</p></div></Card>}
        {item.reports[0] && <Card className="report-section"><div className="section-heading"><div><span className="eyebrow">Отчёт исполнителя</span><h2>{item.reports[0].organization.name}</h2></div><Wrench /></div><p>{item.reports[0].summary}</p><span className="meta">Отправил {item.reports[0].author.displayName} · {format(new Date(item.reports[0].createdAt), 'd MMM, HH:mm', { locale: ru })}</span></Card>}
        <DiscussionPreview problem={item} onOpen={() => setTab('discussion')} />
      </div>}
      {tab === 'discussion' && <Discussion problem={item} onChanged={() => queryClient.invalidateQueries({ queryKey: ['problem', id] })} />}
      {tab === 'history' && <History problem={item} />}
    </article>
    <aside className="detail-aside">
      <RoleActionPanel key={item.id} problem={item} onChanged={async (message) => { setToast(message); await Promise.all([queryClient.invalidateQueries({ queryKey: ['problem', id] }), queryClient.invalidateQueries({ queryKey: ['problems'] }), queryClient.invalidateQueries({ queryKey: ['profile'] })]); }} />
      <Card className="progress-card"><div className="section-heading"><div><span className="eyebrow">Ход обращения</span><h2>{statusLabels[item.status]}</h2></div><span>{activeIndex >= 0 ? Math.round((activeIndex / (lifecycle.length - 1)) * 100) : 60}%</span></div><div className="progress"><span style={{ width: `${activeIndex >= 0 ? Math.max(8, (activeIndex / (lifecycle.length - 1)) * 100) : 60}%` }} /></div><ol>{lifecycle.map((status, index) => <li key={status} className={index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''}><span>{index < activeIndex ? <Check size={14} /> : <CircleDot size={14} />}</span><div><strong>{statusLabels[status as keyof typeof statusLabels]}</strong>{index === activeIndex && <small>Текущий этап</small>}</div></li>)}</ol></Card>
      <Card className="facts-card"><h2>Сводка</h2><dl><div><dt><Users />Подтверждений</dt><dd>{item.confirmationCount}</dd></div><div><dt><Bell />Подписчиков</dt><dd>{item.subscriberCount}</dd></div><div><dt><Wrench />Исполнитель</dt><dd>{item.assignments[0]?.organization.name ?? 'Не назначен'}</dd></div><div><dt><CalendarClock />Срок</dt><dd>{item.dueAt ? format(new Date(item.dueAt), 'd MMMM yyyy', { locale: ru }) : 'Не установлен'}</dd></div></dl></Card>
    </aside></div>
  </div>;
}

function SubscribeButton({ item, onDone }: { item: Problem; onDone(): void }) {
  const mutation = useMutation({ mutationFn: () => api<{ subscribed: boolean }>(`/problems/${item.id}/subscription`, { method: 'POST' }), onSuccess: onDone });
  return <div className="subscription-action"><button className="icon-button labelled-action" disabled={mutation.isPending} aria-label={item.viewer.subscribed ? 'Отписаться' : 'Подписаться'} title="Получать уведомления об этом обращении" onClick={() => mutation.mutate()}>{item.viewer.subscribed ? <BellOff /> : <Bell />}<span>{item.viewer.subscribed ? 'Отписаться' : 'Подписаться'}</span></button>{mutation.isError && <span role="alert">{mutation.error.message}</span>}</div>;
}

function ProblemMoreActions({ onHistory, onDiscussion }: { onHistory(): void; onDiscussion(): void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); root.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="problem-more" ref={root}><button type="button" className="icon-button labelled-action" aria-label="Ещё" aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal /><span>Ещё</span></button>{open && <div className="problem-more__panel" aria-label="Действия с обращением"><button type="button" onClick={() => { setOpen(false); onDiscussion(); }}><MessageCircle />Открыть обсуждение</button><button type="button" onClick={() => { setOpen(false); onHistory(); }}><Clock3 />История обращения</button></div>}</div>;
}

function PhotoColumn({ label, media, fallback }: { label: string; media: Problem['media']; fallback: string }) {
  return <div className="photo-column"><h3>{label}</h3>{media.length ? <ImageAttachments media={media} label={label} /> : <div className="photo-fallback"><Camera />{fallback}</div>}</div>;
}

type ActionProps = { problem: Problem; onChanged(message: string): void | Promise<void> };
function RoleActionPanel({ problem, onChanged }: ActionProps) {
  const role = useAppStore((s) => s.user!.role);
  return role === 'RESIDENT' ? <ResidentActions problem={problem} onChanged={onChanged} /> : role === 'OPERATOR' || role === 'ADMIN' ? <OperatorActions problem={problem} onChanged={onChanged} /> : <ContractorActions problem={problem} onChanged={onChanged} />;
}

function ResidentActions({ problem, onChanged }: ActionProps) {
  const userId = useAppStore((s) => s.user!.id);
  const [error, setError] = useState('');
  const [changeOpen, setChangeOpen] = useState(false);
  const [changeText, setChangeText] = useState('');
  const isAuthor = problem.author.id === userId;
  const confirm = useMutation({ mutationFn: (type: string) => api('/problems/' + problem.id + '/confirmations', { method: 'POST', json: { type } }), onMutate: () => setError(''), onSuccess: () => { platform.haptic('success'); return onChanged('Спасибо — ваша оценка ситуации учтена'); }, onError: (e) => setError(e.message) });
  const vote = useMutation({ mutationFn: (value: string) => api('/problems/' + problem.id + '/resolution-votes', { method: 'POST', json: { vote: value } }), onMutate: () => setError(''), onSuccess: () => { platform.haptic('success'); return onChanged('Проверка результата отправлена оператору'); }, onError: (e) => setError(e.message) });
  const reopen = useMutation({ mutationFn: () => api('/problems/' + problem.id + '/transition', { method: 'POST', json: { to: 'REOPENED', reason: 'Житель сообщает, что проблема появилась снова' } }), onMutate: () => setError(''), onSuccess: () => onChanged('Обращение открыто повторно'), onError: (e) => setError(e.message) });
  const change = useMutation({ mutationFn: () => api('/problems/' + problem.id + '/comments', { method: 'POST', json: { body: 'Ситуация изменилась: ' + changeText.trim(), type: 'CLARIFICATION' } }), onMutate: () => setError(''), onSuccess: async () => { setChangeOpen(false); setChangeText(''); await onChanged('Уточнение опубликовано в обсуждении'); }, onError: (e) => setError(e.message) });
  const busy = confirm.isPending || vote.isPending || reopen.isPending || change.isPending;
  const checking = ['AWAITING_COMMUNITY_CONFIRMATION', 'COMMUNITY_CONFIRMED', 'OPERATOR_REVIEW'].includes(problem.status);
  const verifying = problem.status === 'COMMUNITY_VERIFICATION';
  return <Card className="action-card">
    <span className="action-icon">{verifying ? <ShieldCheck /> : isAuthor ? <MessageCircle /> : <Users />}</span>
    <h2>{verifying ? 'Проверьте результат' : problem.status === 'RESOLVED' ? 'Проблема устранена' : isAuthor ? 'Ваше обращение' : checking ? 'Вы видели проблему?' : statusLabels[problem.status]}</h2>
    <p>{verifying ? 'Посетите место и оцените видимый результат работ.' : isAuthor ? 'Вы можете уточнить ситуацию и добавить фото. Независимую проверку проведут другие жители.' : checking ? 'Оцените ситуацию на месте — это поможет оператору проверить сигнал.' : 'Следите за ходом работ и дополняйте обращение фотографиями с места.'}</p>
    {checking && !isAuthor && (problem.viewer.confirmed ? <div className="action-success"><CheckCircle2 />Вы уже оценили ситуацию</div> : <fieldset className="resident-checks" disabled={busy} aria-busy={confirm.isPending}><Button onClick={() => confirm.mutate('EXISTS')}><CheckCircle2 />{confirm.isPending && confirm.variables === 'EXISTS' ? 'Отправляем…' : 'Проблема существует'}</Button><Button variant="secondary" onClick={() => confirm.mutate('NOT_FOUND')}><XCircle />{confirm.isPending && confirm.variables === 'NOT_FOUND' ? 'Отправляем…' : 'Не обнаружена'}</Button><button className="text-button" onClick={() => confirm.mutate('CHANGED')}>{confirm.isPending && confirm.variables === 'CHANGED' ? 'Отправляем…' : 'Ситуация изменилась'}</button></fieldset>)}
    {isAuthor && <button type="button" className="text-button" disabled={busy} aria-expanded={changeOpen} onClick={() => setChangeOpen(!changeOpen)}>Ситуация изменилась</button>}
    {changeOpen && <div className="situation-change"><label>Что изменилось?<textarea value={changeText} onChange={(event) => setChangeText(event.target.value)} maxLength={2800} rows={3} /></label><Button disabled={changeText.trim().length < 2 || busy} onClick={() => change.mutate()}>{change.isPending ? 'Отправляем…' : 'Отправить уточнение'}</Button></div>}
    {verifying && (problem.viewer.voted ? <div className="action-success"><CheckCircle2 />Ваш голос уже учтён</div> : <fieldset className="resident-checks" disabled={busy}><div className="vote-grid">{[{ value: 'FULLY_RESOLVED', label: 'Устранено полностью', icon: ThumbsUp }, { value: 'PARTIALLY_RESOLVED', label: 'Частично', icon: CircleDot }, { value: 'STILL_PRESENT', label: 'Осталось', icon: XCircle }, { value: 'WORSE', label: 'Стало хуже', icon: ThumbsDown }].map(({ value, label, icon: Icon }) => <button key={value} onClick={() => vote.mutate(value)}><Icon />{vote.isPending && vote.variables === value ? 'Отправляем…' : label}</button>)}</div><button className="text-button" onClick={() => vote.mutate('CANNOT_VERIFY')}>Не могу проверить</button></fieldset>)}
    {problem.status === 'RESOLVED' && <Button variant="secondary" disabled={busy} onClick={() => reopen.mutate()}><RefreshCcw />Открыть повторно</Button>}
    <EvidenceComposer problem={problem} onChanged={onChanged} disabled={busy} />
    {error && <div className="form-error" role="alert">{error}</div>}
  </Card>;
}

function EvidenceComposer({ problem, onChanged, disabled }: ActionProps & { disabled: boolean }) {
  const [photo, setPhoto] = useState<ImageAttachment>();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [published, setPublished] = useState(false);
  const uploadLock = useRef(false);
  const publish = useMutation({ mutationFn: () => api('/problems/' + problem.id + '/evidence', { method: 'POST', json: { mediaId: photo!.id } }), onMutate: () => setError(''), onSuccess: async () => { setPhoto(undefined); setPublished(true); await onChanged('Фото опубликовано в обращении'); }, onError: (e) => setError(e.message) });
  const upload = async (files: File[]) => {
    if (!files[0] || uploadLock.current) return;
    uploadLock.current = true; setUploading(true); setError(''); setPublished(false);
    try { setPhoto(await uploadImage(files[0])); } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить фото'); }
    finally { uploadLock.current = false; setUploading(false); }
  };
  return <div className="evidence-composer">{photo ? <><ImageAttachments media={[photo]} onRemove={() => setPhoto(undefined)} disabled={publish.isPending} label="Фото для публикации" /><p>Фото готово. Опубликуйте его, чтобы оно появилось в обращении.</p><Button disabled={disabled || publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? 'Публикуем фото…' : 'Опубликовать фото'}</Button></> : published ? <div role="status" className="evidence-published"><CheckCircle2 />Фото опубликовано<button type="button" className="text-button" onClick={() => setPublished(false)}>Добавить ещё фото</button></div> : <ImagePicker label="Добавить доказательство" uploading={uploading} disabled={disabled} onFiles={(files) => void upload(files)} />}{error && <div className="form-error" role="alert">{error}</div>}</div>;
}

function EvidenceUpload({ uploading, ready, onFile }: { uploading: boolean; ready: boolean; onFile(file?: File): void }) {
  return <ImagePicker uploading={uploading} label={ready ? 'Добавить ещё фото' : 'Добавить фото результата'} onFiles={(files) => onFile(files[0])} />;
}

function OperatorActions({ problem, onChanged }: { problem: Problem; onChanged(message: string): void }) {
  const [organizationId, setOrganizationId] = useState(''); const [dueAt, setDueAt] = useState(new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)); const [reason, setReason] = useState(''); const [response, setResponse] = useState(''); const [duplicateOfId, setDuplicateOfId] = useState(''); const [category, setCategory] = useState(problem.category); const [priority, setPriority] = useState(problem.priority); const [error, setError] = useState('');
  const organizations = useQuery({ queryKey: ['organizations'], queryFn: () => api<Organization[]>('/organizations') });
  const transition = useMutation({ mutationFn: (payload: Record<string, unknown>) => api(`/problems/${problem.id}/transition`, { method: 'POST', json: payload }), onSuccess: (_, input) => { onChanged(`Статус изменён: ${statusLabels[input.to as keyof typeof statusLabels]}`); setReason(''); }, onError: (e) => setError(e.message) });
  const official = useMutation({ mutationFn: () => api(`/problems/${problem.id}/official-response`, { method: 'POST', json: { body: response } }), onSuccess: () => { setResponse(''); onChanged('Официальный ответ опубликован'); }, onError: (e) => setError(e.message) });
  const metadata = useMutation({ mutationFn: () => api(`/problems/${problem.id}`, { method: 'PATCH', json: { category, priority } }), onSuccess: () => onChanged('Категория и приоритет обновлены'), onError: (e) => setError(e.message) });
  return <Card className="action-card operator-actions"><span className="action-icon"><ShieldCheck /></span><span className="eyebrow">Рабочее место оператора</span><h2>{statusLabels[problem.status]}</h2>
    <details><summary>Категория и приоритет</summary><label>Категория<select value={category} disabled={metadata.isPending} onChange={(e) => setCategory(e.target.value as typeof category)}>{CATEGORIES.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label><label>Приоритет<select value={priority} disabled={metadata.isPending} onChange={(e) => setPriority(e.target.value as typeof priority)}><option value="LOW">Низкий</option><option value="NORMAL">Обычный</option><option value="HIGH">Высокий</option><option value="CRITICAL">Критический</option></select></label><Button variant="secondary" disabled={metadata.isPending} onClick={() => metadata.mutate()}>{metadata.isPending ? 'Сохраняем…' : 'Сохранить категорию и приоритет'}</Button></details>
    {['OPERATOR_REVIEW', 'REOPENED'].includes(problem.status) && <><label>Исполнитель<select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}><option value="">Выберите организацию</option>{organizations.data?.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label><label>Срок<input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} /></label><Button onClick={() => transition.mutate({ to: 'ASSIGNED', organizationId, dueAt: new Date(`${dueAt}T18:00:00`).toISOString(), reason: 'Назначено городским оператором' })}><Wrench />Назначить</Button><details><summary>Другое решение</summary><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Обязательное объяснение" rows={3} /><div className="action-row"><Button variant="secondary" onClick={() => transition.mutate({ to: 'NEEDS_MORE_INFO', reason })}>Запросить данные</Button><Button variant="danger" onClick={() => transition.mutate({ to: 'REJECTED', reason })}>Отклонить</Button></div><label>ID основного обращения<input value={duplicateOfId} onChange={(e) => setDuplicateOfId(e.target.value)} placeholder="cuid обращения" /></label><Button variant="secondary" disabled={!duplicateOfId || reason.length < 3} onClick={() => transition.mutate({ to: 'DUPLICATE', reason, duplicateOfId })}>Объединить дубль</Button></details></>}
    {problem.status === 'OPERATOR_VERIFICATION' && <><p>Проверьте отчёт и фотографии исполнителя. После принятия результат должны оценить жители.</p><Button onClick={() => transition.mutate({ to: 'COMMUNITY_VERIFICATION', reason: 'Отчёт соответствует заявке, начинается общественная проверка' })}><Users />Запустить проверку жителей</Button><Button variant="secondary" onClick={() => transition.mutate({ to: 'IN_PROGRESS', reason: reason || 'Отчёт возвращён на доработку' })}><RefreshCcw />Вернуть исполнителю</Button></>}
    {problem.status === 'COMMUNITY_VERIFICATION' && <><div className="vote-summary"><strong>{problem.votes.filter((v) => v.vote === 'FULLY_RESOLVED').length}</strong><span>голосов «устранено»</span></div><Button onClick={() => transition.mutate({ to: 'RESOLVED', reason: 'Результат подтверждён независимыми жителями' })}><CheckCircle2 />Закрыть обращение</Button><Button variant="secondary" onClick={() => transition.mutate({ to: 'DISPUTED', reason: 'Результат общественной проверки неоднозначен' })}><Flag />Перевести в спор</Button></>}
    {problem.status === 'DISPUTED' && <><Button onClick={() => transition.mutate({ to: 'REOPENED', reason: 'Спор разрешён: требуется повторное выполнение работ' })}><RefreshCcw />Открыть повторно</Button><Button variant="secondary" onClick={() => transition.mutate({ to: 'PARTIALLY_RESOLVED', reason: 'Подтверждён частичный результат' })}>Признать частичным</Button></>}
    <details><summary>Официальный ответ</summary><textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Публичный комментарий жителям" rows={4} /><Button variant="secondary" disabled={response.length < 5} onClick={() => official.mutate()}><Send />Опубликовать</Button></details>{error && <div className="form-error">{error}</div>}
  </Card>;
}

function ContractorActions({ problem, onChanged }: ActionProps) {
  const [summary, setSummary] = useState(''); const [photos, setPhotos] = useState<ImageAttachment[]>([]); const mediaIds = photos.map((photo) => photo.id); const [uploading, setUploading] = useState(false); const [error, setError] = useState('');
  const transition = useMutation({ mutationFn: () => api(`/problems/${problem.id}/transition`, { method: 'POST', json: { to: 'IN_PROGRESS', reason: 'Исполнитель принял задачу в работу' } }), onSuccess: () => onChanged('Задача принята в работу'), onError: (e) => setError(e.message) });
  const report = useMutation({ mutationFn: () => api(`/problems/${problem.id}/resolution-report`, { method: 'POST', json: { summary, mediaIds } }), onSuccess: () => onChanged('Отчёт отправлен городскому оператору'), onError: (e) => setError(e.message) });
  const upload = async (file?: File) => { if (!file || uploading) return; setUploading(true); try { const media = await uploadImage(file); setPhotos((current) => [...current, media]); } catch (e) { setError(e instanceof Error ? e.message : 'Ошибка загрузки'); } finally { setUploading(false); } };
  return <Card className="action-card contractor-actions"><span className="action-icon"><Wrench /></span><span className="eyebrow">Задача исполнителя</span><h2>{statusLabels[problem.status]}</h2>{problem.status === 'ASSIGNED' && <><p>Подтвердите принятие. С этого момента жители увидят, что работы начались.</p><Button onClick={() => transition.mutate()}><Check />Принять в работу</Button></>}{problem.status === 'IN_PROGRESS' && <><label>Отчёт о выполнении<textarea rows={5} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Что сделано, какие материалы использованы…" /></label><ImageAttachments media={photos} onRemove={(id) => setPhotos((current) => current.filter((photo) => photo.id !== id))} disabled={uploading || report.isPending} label="Фото результата" /><EvidenceUpload uploading={uploading || report.isPending} ready={mediaIds.length > 0} onFile={upload} /><small>{mediaIds.length} фото результата</small><Button disabled={summary.length < 10 || !mediaIds.length || report.isPending || uploading} onClick={() => report.mutate()}><Send />Отправить отчёт</Button></>}{['OPERATOR_VERIFICATION', 'COMMUNITY_VERIFICATION'].includes(problem.status) && <div className="action-success"><Clock3 />Отчёт ожидает независимой проверки</div>}{error && <div className="form-error">{error}</div>}</Card>;
}

function DiscussionPreview({ problem, onOpen }: { problem: Problem; onOpen(): void }) {
  return <Card className="discussion-preview"><div className="section-heading"><div><span className="eyebrow">Обсуждение</span><h2>{problem.comments.length} сообщений</h2></div><MessageCircle /></div>{problem.comments.slice(-2).map((comment) => <div className="comment-mini" key={comment.id}><span className="avatar">{comment.author.displayName[0]}</span><div><strong>{comment.author.displayName}</strong><p>{comment.body}</p></div></div>)}<Button variant="secondary" onClick={onOpen}>Открыть обсуждение</Button></Card>;
}

function Discussion({ problem, onChanged }: { problem: Problem; onChanged(): void | Promise<unknown> }) {
  const user = useAppStore((s) => s.user)!;
  const queryClient = useQueryClient();
  const [body, setBody] = useState(''); const [replyTo, setReplyTo] = useState<string>(); const [type, setType] = useState('RESIDENT'); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [uploading, setUploading] = useState(false); const uploadLock = useRef(false);
  const send = useMutation({ mutationFn: () => api('/problems/' + problem.id + '/comments', { method: 'POST', json: { body: body.trim(), parentId: replyTo, type, mediaIds: attachments.map((item) => item.id) } }), onMutate: () => setError(''), onSuccess: async () => { setBody(''); setReplyTo(undefined); setAttachments([]); await onChanged(); }, onError: (e) => setError(e.message) });
  const remove = useMutation({ mutationFn: (id: string) => api('/problems/' + problem.id + '/comments/' + id, { method: 'DELETE' }), onMutate: () => setError(''), onSuccess: async (_, id) => { await queryClient.cancelQueries({ queryKey: ['problem', problem.id] }); queryClient.setQueryData<Problem>(['problem', problem.id], (current) => current ? { ...current, comments: current.comments.filter((comment) => comment.id !== id) } : current); if (replyTo === id) setReplyTo(undefined); await onChanged(); }, onError: (e) => setError(e.message) });
  const report = useMutation({ mutationFn: (id: string) => api('/problems/' + problem.id + '/comments/' + id + '/report', { method: 'POST' }), onSuccess: () => setNotice('Жалоба отправлена модератору'), onError: (e) => setError(e.message) });
  const comments = useMemo(() => problem.comments.filter((c) => !c.isDeleted).map((c) => ({ ...c, reply: c.parentId ? problem.comments.find((p) => p.id === c.parentId && !p.isDeleted) : undefined })), [problem.comments]);
  const upload = async (files: File[]) => {
    if (uploadLock.current || !files.length) return;
    uploadLock.current = true; setUploading(true); setError('');
    try { for (const file of files.slice(0, 4 - attachments.length)) { const saved = await uploadImage(file); setAttachments((current) => [...current, saved]); } }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось загрузить фото'); }
    finally { uploadLock.current = false; setUploading(false); }
  };
  return <Card className="discussion"><div className="section-heading"><h2>Обсуждение</h2><MessageCircle /></div><div className="comments">{!comments.length && <p>Пока нет сообщений. Добавьте уточнение или фото с места.</p>}{comments.map((comment) => <article className={'comment comment--' + comment.type.toLowerCase()} key={comment.id}>{comment.isPinned && <span className="pinned"><ShieldCheck />Закреплённый официальный ответ</span>}<div className="comment__head"><span className="avatar">{comment.author.displayName[0]}</span><div><strong>{comment.author.displayName}{['OFFICIAL', 'CONTRACTOR'].includes(comment.type) && <ShieldCheck size={14} />}</strong><span>{comment.author.organization?.name ?? (comment.type === 'OFFICIAL' ? 'Городской оператор' : 'Житель')} · {format(new Date(comment.createdAt), 'd MMM, HH:mm', { locale: ru })}</span></div></div>{comment.reply && <blockquote>{comment.reply.author.displayName}: {comment.reply.body.slice(0, 90)}</blockquote>}<p>{comment.body}</p><ImageAttachments media={comment.media} label="Фото к сообщению" /><div className="comment__actions"><button onClick={() => setReplyTo(comment.id)}><Reply />Ответить</button>{comment.author.id === user.id || user.role === 'ADMIN' ? <button disabled={remove.isPending} onClick={() => remove.mutate(comment.id)}><Trash2 />{remove.isPending && remove.variables === comment.id ? 'Удаляем…' : 'Удалить'}</button> : <button disabled={report.isPending} onClick={() => report.mutate(comment.id)}><Flag />Пожаловаться</button>}</div></article>)}</div><div className="comment-form">{replyTo && <div className="reply-chip">Ответ на сообщение <button aria-label="Отменить ответ" onClick={() => setReplyTo(undefined)}><XCircle /></button></div>}{(user.role === 'OPERATOR' || user.role === 'ADMIN') && <select aria-label="Тип сообщения" value={type} onChange={(e) => setType(e.target.value)}><option value="RESIDENT">Обычный комментарий</option><option value="OFFICIAL">Официальный ответ</option><option value="INFO_REQUEST">Запрос уточнения</option></select>}<textarea aria-label="Текст сообщения" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Напишите уточнение по проблеме…" rows={3} maxLength={3000} /><ImageAttachments media={attachments} onRemove={(id) => setAttachments((current) => current.filter((item) => item.id !== id))} disabled={send.isPending || uploading} label="Выбранные фото" /><small>До 4 фото · JPEG, PNG или WebP · до 8 МБ каждое</small><div className="comment-form__actions"><ImagePicker label="Прикрепить фото" multiple uploading={uploading} disabled={send.isPending || attachments.length >= 4} onFiles={(files) => void upload(files)} /><Button disabled={body.trim().length < 2 || send.isPending || uploading} onClick={() => send.mutate()}><Send />{send.isPending ? 'Отправляем…' : 'Отправить'}</Button></div></div>{error && <div className="form-error" role="alert">{error}</div>}{notice && <p role="status">{notice}</p>}</Card>;
}

function History({ problem }: { problem: Problem }) {
  return <Card className="history-card"><div className="section-heading"><div><span className="eyebrow">Нельзя изменить задним числом</span><h2>История обращения</h2></div><Clock3 /></div><ol className="timeline">{problem.history.map((event) => <li key={event.id}><span className="timeline__dot"><CircleDot /></span><div><strong>{statusLabels[event.toStatus]}</strong><p>{event.reason || 'Статус изменён по регламенту'}</p><small>{event.actor.displayName} · {format(new Date(event.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}</small></div></li>)}</ol></Card>;
}

function DetailSkeleton() { return <div className="page page-pad"><div className="detail-skeleton"><div /><div /><div /></div></div>; }
