import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@pulse/ui';
import { personalAddressSchema, type PersonalAddress } from '@pulse/shared';
import { api } from '../api';
import { useAppStore } from '../store';
import type { User } from '../types';
import { AddressPicker } from './AddressPicker';

export function HomeAddress({ profile }: { profile: User }) {
  const saved = profile.homeAddress ?? null;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<PersonalAddress | null>(saved);
  const queryClient = useQueryClient();
  const validation = personalAddressSchema.safeParse(value);
  const mutation = useMutation({
    mutationFn: (homeAddress: PersonalAddress | null) =>
      api<Pick<User, 'id' | 'homeAddress'>>('/profile', {
        method: 'PATCH',
        json: { homeAddress },
      }),
    onSuccess: (result) => {
      if (useAppStore.getState().user?.id !== profile.id) return;
      queryClient.setQueryData<User>(['profile', profile.id], (current) =>
        current ? { ...current, homeAddress: result.homeAddress } : current,
      );
      void queryClient.invalidateQueries({ queryKey: ['account', profile.id] });
      setValue(result.homeAddress ?? null);
      setEditing(false);
    },
  });
  return (
    <section className="account-panel account-home-address" aria-labelledby="home-address-title">
      <h2 id="home-address-title">Домашний адрес</h2>
      <p>Сохраните адрес, чтобы выбирать его при создании обращения. Номер квартиры не нужен.</p>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (validation.success && !mutation.isPending) mutation.mutate(validation.data);
          }}
        >
          <fieldset disabled={mutation.isPending} className="home-address-fields">
            <AddressPicker
              value={value}
              onChange={(next) => {
                if (mutation.isPending) return;
                setValue(next);
                mutation.reset();
              }}
            />
          </fieldset>
          {value && !validation.success && (
            <p className="field-error">{validation.error.issues[0]?.message}</p>
          )}
          <div className="account-form-actions">
            <Button type="submit" disabled={!validation.success || mutation.isPending}>
              {mutation.isPending ? 'Сохраняем…' : 'Сохранить адрес'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={mutation.isPending}
              onClick={() => {
                setEditing(false);
                setValue(saved);
                mutation.reset();
              }}
            >
              Отменить адрес
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p>
            <strong>{saved?.address ?? 'Домашний адрес пока не указан'}</strong>
          </p>
          <div className="account-form-actions">
            <Button
              variant="secondary"
              disabled={mutation.isPending}
              onClick={() => {
                setValue(saved);
                setEditing(true);
                mutation.reset();
              }}
            >
              {saved ? 'Изменить адрес' : 'Добавить адрес'}
            </Button>
            {saved && (
              <Button
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(null)}
              >
                {mutation.isPending ? 'Удаляем…' : 'Удалить адрес'}
              </Button>
            )}
          </div>
        </>
      )}
      {mutation.isSuccess && (
        <p role="status">{saved ? 'Домашний адрес сохранён' : 'Домашний адрес удалён'}</p>
      )}
      {mutation.isError && (
        <p className="form-error" role="alert">
          {mutation.error.message}
        </p>
      )}
    </section>
  );
}
