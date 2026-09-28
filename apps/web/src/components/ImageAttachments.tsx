import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Trash2, X } from 'lucide-react';
import { mediaUrl } from '../api';

export interface ImageAttachment { id: string; url: string; alt?: string }

export function ImagePicker({ onFiles, disabled = false, uploading = false, multiple = false, label = 'Добавить фото' }: {
  onFiles(files: File[]): void; disabled?: boolean; uploading?: boolean; multiple?: boolean; label?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="image-picker"><input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" multiple={multiple} disabled={disabled || uploading} onChange={(event) => { onFiles(Array.from(event.target.files ?? [])); event.target.value = ''; }} /><button type="button" className="evidence-upload" disabled={disabled || uploading} onClick={() => input.current?.click()}>{uploading ? <LoaderCircle className="spin" /> : <ImagePlus />}<span>{uploading ? 'Загружаем фото…' : label}</span></button></div>;
}

export function ImageAttachments({ media, onRemove, disabled = false, label = 'Фотографии' }: {
  media: ImageAttachment[]; onRemove?(id: string): void; disabled?: boolean; label?: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const isOpen = selected !== null;
  useEffect(() => {
    if (!isOpen) return;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element?.showModal();
    return () => { element?.close(); document.body.style.overflow = overflow; };
  }, [isOpen]);
  if (!media.length) return null;
  const current = selected === null ? undefined : media[selected];
  return <>
    <div className="image-attachments" aria-label={label}>{media.map((item, index) => <figure key={item.id}><button type="button" className="image-attachments__open" aria-label={`Открыть фото ${index + 1}: ${item.alt ?? label}`} onClick={() => setSelected(index)}><img src={mediaUrl(item.url)} alt={item.alt ?? label} loading="lazy" /></button>{onRemove && <button type="button" className="icon-button image-attachments__remove" disabled={disabled} aria-label={`Убрать фото ${index + 1}`} onClick={() => onRemove(item.id)}><Trash2 /></button>}</figure>)}</div>
    {current && <dialog ref={dialog} className="image-viewer" aria-label="Просмотр фотографии" onCancel={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }} onKeyDown={(event) => { if (event.key === 'ArrowRight') setSelected((selected! + 1) % media.length); if (event.key === 'ArrowLeft') setSelected((selected! + media.length - 1) % media.length); }}><header><span>{selected! + 1} / {media.length}</span><button className="icon-button" type="button" autoFocus aria-label="Закрыть фотографию" onClick={() => setSelected(null)}><X /></button></header><img src={mediaUrl(current.url)} alt={current.alt ?? label} />{media.length > 1 && <footer><button type="button" className="icon-button" aria-label="Предыдущее фото" onClick={() => setSelected((selected! + media.length - 1) % media.length)}><ChevronLeft /></button><button type="button" className="icon-button" aria-label="Следующее фото" onClick={() => setSelected((selected! + 1) % media.length)}><ChevronRight /></button></footer>}</dialog>}
  </>;
}
