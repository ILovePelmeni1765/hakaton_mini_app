import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Accessibility,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bus,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleEllipsis,
  Construction,
  Crosshair,
  Droplets,
  Footprints,
  ImagePlus,
  Lightbulb,
  LoaderCircle,
  MapPin,
  ShieldAlert,
  Signpost,
  Snowflake,
  Trash2,
  TreePine,
  UploadCloud,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@pulse/ui';
import {
  categoryLabels,
  CATEGORIES,
  createProblemSchema,
  personalAddressSchema,
  type PersonalAddress,
  type CreateProblemInput,
} from '@pulse/shared';
import { Link, useNavigate } from 'react-router-dom';
import { api, mediaUrl, uploadImage } from '../api';
import type { Problem, ProblemListItem, User } from '../types';
import { AddressPicker } from '../components/AddressPicker';
import { ProblemCard } from '../components/ProblemCard';
import { useAppStore } from '../store';
import { useAppBack } from '../navigation';
import { platform } from '../platform';

const steps = ['Место', 'Категория', 'Фото', 'Описание', 'Похожие', 'Публикация'];
const categoryIcons: Record<string, LucideIcon> = {
  LIGHTING: Lightbulb,
  OPEN_MANHOLE: CircleAlert,
  ROAD: Construction,
  SIDEWALK: Footprints,
  WASTE: Trash2,
  PLAYGROUND: CheckCircle2,
  ACCESSIBILITY: Accessibility,
  PUBLIC_TRANSPORT: Bus,
  SNOW: Snowflake,
  WATER_LEAK: Droplets,
  ROAD_SIGN: Signpost,
  FALLEN_TREE: TreePine,
  OTHER: CircleEllipsis,
};

const draftSchema = createProblemSchema.partial().extend({
  title: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  address: z.string().max(300).optional(),
});

function readDraft(draftKey: string): Partial<CreateProblemInput> {
  try {
    return draftSchema.parse(JSON.parse(localStorage.getItem(draftKey) ?? '{}'));
  } catch {
    return {};
  }
}

export function CreateProblemPage() {
  const userId = useAppStore((state) => state.user!.id);
  return <CreateProblemForm key={userId} userId={userId} />;
}

function CreateProblemForm({ userId }: { userId: string }) {
  const draftKey = `pulse-problem-draft-v3:${userId}`;
  const [draft] = useState(() => readDraft(draftKey));
  const [step, setStep] = useState(0);
  const [source, setSource] = useState<'home' | 'current' | 'other'>('other');
  const [location, setLocation] = useState<PersonalAddress | null>(() => {
    const result = personalAddressSchema.safeParse({
      address: draft.address,
      latitude: draft.latitude,
      longitude: draft.longitude,
    });
    return result.success ? result.data : null;
  });
  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: ({ signal }) => api<User>('/profile', { signal }),
  });
  const homeAddress = profile.data?.homeAddress;
  const locationValid = personalAddressSchema.safeParse(location).success;
  const [uploads, setUploads] = useState<Array<{ id: string; url: string; name: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [publishError, setPublishError] = useState('');
  const navigate = useNavigate();
  const goBack = useAppBack();
  const {
    register,
    watch,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CreateProblemInput>({
    resolver: zodResolver(createProblemSchema) as never,
    defaultValues: {
      title: draft.title ?? '',
      description: draft.description ?? '',
      category: draft.category ?? 'LIGHTING',
      priority: draft.priority ?? 'NORMAL',
      latitude: location?.latitude ?? 0,
      longitude: location?.longitude ?? 0,
      address: location?.address ?? '',
      mediaIds: [],
    },
  });
  const values = watch();
  const hasDraft = useMemo(
    () => Boolean(draft.title || draft.description || draft.address),
    [draft],
  );

  const selectLocation = (next: PersonalAddress | null) => {
    setLocation(next);
    setValue('latitude', next?.latitude ?? 0, { shouldDirty: true });
    setValue('longitude', next?.longitude ?? 0, { shouldDirty: true });
    setValue('address', next?.address ?? '', { shouldDirty: true });
  };

  useEffect(() => {
    const subscription = watch((data) => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ ...data, mediaIds: [] }));
      } catch {
        /* Storage can be unavailable in a WebView. */
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, draftKey]);

  useEffect(() => {
    const confirmLeave = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', confirmLeave);
    return () => window.removeEventListener('beforeunload', confirmLeave);
  }, [isDirty]);

  const similar = useQuery({
    queryKey: ['similar', values.category, values.latitude, values.longitude],
    queryFn: () =>
      api<ProblemListItem[]>(
        `/problems/similar?category=${values.category}&lat=${values.latitude}&lng=${values.longitude}&radius=350`,
      ),
    enabled: step === 4 && locationValid,
  });
  const create = useMutation({
    mutationFn: (data: CreateProblemInput) =>
      api<Problem>('/problems', {
        method: 'POST',
        json: { ...data, mediaIds: uploads.map((upload) => upload.id) },
      }),
    onSuccess: (problem) => {
      try {
        localStorage.removeItem(draftKey);
        sessionStorage.setItem('pulse-created', problem.id);
      } catch {
        /* Publishing still succeeds when WebView storage is unavailable. */
      }
      navigate(`/problems/${problem.id}?created=1`);
    },
    onError: (error) => setPublishError(error.message),
  });
  const addFiles = async (files: FileList | null) => {
    if (!files || uploading) return;
    setUploading(true);
    setPublishError('');
    try {
      for (const file of Array.from(files).slice(0, 6 - uploads.length)) {
        const saved = await uploadImage(file);
        setUploads((current) => [...current, { ...saved, name: file.name }]);
      }
    } catch (error) {
      setPublishError(
        error instanceof Error ? error.message : 'Не удалось загрузить фото. Повторите попытку.',
      );
    } finally {
      setUploading(false);
    }
  };
  const requiredFields: Array<Array<keyof CreateProblemInput>> = [
    ['address'],
    ['category'],
    [],
    ['title', 'description', 'priority'],
    [],
    [],
  ];
  const next = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (step === 0 && !locationValid) return;
    if (await trigger(requiredFields[step])) setStep(Math.min(5, step + 1));
  };
  const back = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else if (!isDirty || window.confirm('Черновик сохранён. Выйти из формы?')) goBack();
  }, [step, isDirty, goBack]);
  useEffect(() => {
    platform.setBackButton(true, back);
    return () => platform.setBackButton(false);
  }, [back]);

  return (
    <div className="create-page">
      <header className="create-header page-pad">
        <button className="icon-button" type="button" onClick={back} aria-label="Назад">
          <ArrowLeft />
        </button>
        <strong>Новое обращение</strong>
        <span className="step-count">
          Шаг {step + 1} из {steps.length}
        </span>
      </header>
      <nav className="stepper page-pad" aria-label="Этапы обращения">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
            className={index === step ? 'active' : index < step ? 'complete' : ''}
            aria-current={index === step ? 'step' : undefined}
            onClick={() => index < step && setStep(index)}
            disabled={index > step}
          >
            <span>{index < step ? <Check size={15} /> : index + 1}</span>
            <small>{label}</small>
          </button>
        ))}
      </nav>
      <form
        className="create-body page-pad"
        onSubmit={(event) => {
          if (step !== 5 || !locationValid) {
            event.preventDefault();
            return;
          }
          void handleSubmit((data) => create.mutate(data))(event);
        }}
      >
        {hasDraft && step === 0 && (
          <p className="draft-note" role="status">
            <Check size={16} />
            Продолжаете сохранённый черновик
          </p>
        )}
        {step === 0 && (
          <section className="create-step">
            <div className="step-heading">
              <div>
                <h1>Где находится проблема?</h1>
                <p>Выберите домашний адрес, своё местоположение или другое место.</p>
              </div>
            </div>
            <fieldset className="address-sources">
              <legend>Откуда взять адрес</legend>
              {homeAddress && (
                <button
                  type="button"
                  aria-pressed={source === 'home'}
                  onClick={() => {
                    setSource('home');
                    selectLocation(homeAddress);
                  }}
                >
                  <MapPin size={18} />
                  Домашний адрес
                </button>
              )}
              <button
                type="button"
                aria-pressed={source === 'current'}
                onClick={() => {
                  setSource('current');
                  if (source !== 'current') selectLocation(null);
                }}
              >
                <Crosshair size={18} />
                Моё местоположение
              </button>
              <button
                type="button"
                aria-pressed={source === 'other'}
                onClick={() => {
                  setSource('other');
                  if (source !== 'other') selectLocation(null);
                }}
              >
                <MapPin size={18} />
                Другой адрес
              </button>
            </fieldset>
            {profile.isPending && <p role="status">Проверяем домашний адрес…</p>}
            {profile.isError && (
              <p>
                Не удалось загрузить домашний адрес.{' '}
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => void profile.refetch()}
                >
                  Повторить
                </button>
              </p>
            )}
            {source === 'home' && homeAddress ? (
              <div className="address-home">
                <p>
                  <strong>{location?.address}</strong>
                </p>
                <p>Адрес из личного кабинета будет указан в обращении.</p>
                <Link to="/profile">Изменить в личном кабинете</Link>
              </div>
            ) : (
              <AddressPicker
                key={source}
                value={location}
                onChange={selectLocation}
                locateOnMount={source === 'current'}
              />
            )}
            {errors.address && <span className="field-error">{errors.address.message}</span>}
          </section>
        )}
        {step === 1 && (
          <section className="create-step">
            <div className="step-heading">
              <div>
                <h1>Что случилось?</h1>
                <p>Выберите категорию проблемы.</p>
              </div>
            </div>
            <div className="category-grid">
              {CATEGORIES.map((category) => {
                const Icon = categoryIcons[category] ?? CircleEllipsis;
                return (
                  <button
                    type="button"
                    key={category}
                    className={values.category === category ? 'active' : ''}
                    onClick={() =>
                      setValue('category', category, { shouldValidate: true, shouldDirty: true })
                    }
                  >
                    <Icon size={20} />
                    <span>{categoryLabels[category]}</span>
                  </button>
                );
              })}
            </div>
            {['OPEN_MANHOLE', 'WATER_LEAK', 'FALLEN_TREE'].includes(values.category) && (
              <div className="danger-note">
                <ShieldAlert />
                <span>
                  <strong>Возможна опасность</strong>Такой сигнал оператор увидит в приоритетной
                  очереди.
                </span>
              </div>
            )}
          </section>
        )}
        {step === 2 && (
          <section className="create-step">
            <div className="step-heading">
              <div>
                <h1>Покажите место</h1>
                <p>
                  Общий план и одна деталь помогут быстрее проверить сигнал. Фото можно пропустить.
                </p>
              </div>
            </div>
            <label className="upload-drop">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = '';
                }}
                disabled={uploading || uploads.length >= 6}
              />
              <span>{uploading ? <LoaderCircle className="spin" /> : <UploadCloud />}</span>
              <strong>{uploading ? 'Загружаем фотографии…' : 'Выбрать фотографии'}</strong>
              <small>JPEG, PNG или WebP · до 8 МБ · максимум 6</small>
            </label>
            <div className="upload-grid">
              {uploads.map((item) => (
                <figure key={item.id}>
                  <img src={mediaUrl(item.url)} alt="Добавленная фотография" />
                  <button
                    type="button"
                    onClick={() => setUploads(uploads.filter((upload) => upload.id !== item.id))}
                    aria-label="Удалить фотографию"
                  >
                    <Trash2 size={17} />
                  </button>
                </figure>
              ))}
              {uploads.length < 6 && (
                <label className="upload-more">
                  <input
                    type="file"
                    disabled={uploading}
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      void addFiles(event.target.files);
                      event.target.value = '';
                    }}
                  />
                  <ImagePlus />
                  <span>Ещё фото</span>
                </label>
              )}
            </div>
          </section>
        )}
        {step === 3 && (
          <section className="create-step">
            <div className="step-heading">
              <div>
                <h1>Опишите ситуацию</h1>
                <p>Расскажите, что произошло и как давно. Не указывайте чужие личные данные.</p>
              </div>
            </div>
            <label>
              Короткий заголовок
              <input
                {...register('title')}
                placeholder="Например: не работает фонарь у перехода"
                maxLength={120}
              />
            </label>
            {errors.title && <span className="field-error">{errors.title.message}</span>}
            <label>
              Подробности
              <textarea
                {...register('description')}
                placeholder="Когда заметили, что повреждено, чем мешает или угрожает…"
                rows={6}
                maxLength={2000}
              />
            </label>
            {errors.description && (
              <span className="field-error">{errors.description.message}</span>
            )}
            <fieldset className="severity-list">
              <legend>Насколько срочно?</legend>
              {[
                {
                  value: 'LOW',
                  title: 'Низкая',
                  text: 'Не мешает пользоваться пространством',
                  color: 'green',
                },
                {
                  value: 'NORMAL',
                  title: 'Обычная',
                  text: 'Создаёт заметное неудобство',
                  color: 'blue',
                },
                {
                  value: 'HIGH',
                  title: 'Высокая',
                  text: 'Может привести к травме или ущербу',
                  color: 'orange',
                },
                {
                  value: 'CRITICAL',
                  title: 'Критическая',
                  text: 'Непосредственная опасность людям',
                  color: 'red',
                },
              ].map((item) => (
                <label key={item.value} className={values.priority === item.value ? 'active' : ''}>
                  <input type="radio" value={item.value} {...register('priority')} />
                  <i className={`dot dot--${item.color}`} />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.text}</small>
                  </span>
                  <Check size={18} />
                </label>
              ))}
            </fieldset>
          </section>
        )}
        {step === 4 && (
          <section className="create-step similar-step">
            <div className="step-heading">
              <div>
                <h1>Есть ли уже такое обращение?</h1>
                <p>
                  Если кто-то уже сообщил об этой проблеме, откройте обращение и подтвердите его.
                </p>
              </div>
            </div>
            {similar.isLoading ? (
              <div className="similar-loading">
                <LoaderCircle className="spin" />
                Ищем в радиусе 350 метров…
              </div>
            ) : similar.data?.length ? (
              <div className="similar-block">
                <strong>Нашли {similar.data.length} похожих</strong>
                <div className="similar-list">
                  {similar.data.slice(0, 3).map((problem) => (
                    <ProblemCard key={problem.id} problem={problem} compact />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate(`/problems/${similar.data![0]!.id}`)}
                >
                  Открыть ближайшее
                </Button>
                <p>Если это другое место или другой дефект, продолжайте публикацию.</p>
              </div>
            ) : (
              <div className="similar-clear">
                <CheckCircle2 />
                <div>
                  <strong>Похожих сигналов рядом нет</strong>
                  <span>Можно публиковать новое обращение.</span>
                </div>
              </div>
            )}
          </section>
        )}
        {step === 5 && (
          <section className="create-step preview-step">
            <div className="step-heading">
              <div>
                <h1>Проверьте перед публикацией</h1>
                <p>После публикации сигнал увидят жители рядом и городской оператор.</p>
              </div>
            </div>
            <article className="preview-card">
              <div className="preview-card__map">
                <MapPin />
                {values.address}
              </div>
              {uploads.length > 0 && (
                <div
                  className="preview-photos"
                  style={{
                    gridTemplateColumns:
                      'repeat(' + Math.min(uploads.length, 3) + ', minmax(0, 1fr))',
                  }}
                >
                  {uploads.slice(0, 3).map((upload) => (
                    <img key={upload.id} src={mediaUrl(upload.url)} alt="Предпросмотр" />
                  ))}
                </div>
              )}
              <div className="preview-card__body">
                <span>{categoryLabels[values.category]}</span>
                <h2>{values.title || 'Без заголовка'}</h2>
                <p>{values.description || 'Описание не заполнено'}</p>
                <div>
                  <span className={`priority priority--${values.priority.toLowerCase()}`}>
                    {
                      {
                        LOW: 'Низкая срочность',
                        NORMAL: 'Обычная срочность',
                        HIGH: 'Высокая срочность',
                        CRITICAL: 'Критическая срочность',
                      }[values.priority]
                    }
                  </span>
                  <span>{uploads.length} фото</span>
                </div>
              </div>
            </article>
            <div className="publish-note">
              <CheckCircle2 />
              <span>
                После публикации другие жители смогут подтвердить сигнал. Вы сможете добавлять фото
                и уточнения, а затем проверить результат работ.
              </span>
            </div>
          </section>
        )}
        {publishError && (
          <div className="form-error" role="alert">
            <AlertTriangle size={18} />
            {publishError}
          </div>
        )}
        <footer className="create-actions">
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={18} />
              Назад
            </Button>
          )}
          <Button
            type={step === 5 ? 'submit' : 'button'}
            onClick={step === 5 ? undefined : next}
            disabled={create.isPending || uploading || (step === 0 && !locationValid)}
          >
            {create.isPending ? (
              <>
                <LoaderCircle className="spin" />
                Публикуем
              </>
            ) : step === 5 ? (
              <>
                <CheckCircle2 />
                Опубликовать
              </>
            ) : (
              <>
                {step === 4 && Boolean(similar.data?.length)
                  ? 'Это другая проблема'
                  : `Далее: ${steps[step + 1]?.toLowerCase()}`}
                <ArrowRight size={18} />
              </>
            )}
          </Button>
        </footer>
      </form>
    </div>
  );
}
