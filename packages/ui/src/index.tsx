import type { ButtonHTMLAttributes, HTMLAttributes, PropsWithChildren, ReactNode } from 'react';

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`button button--${variant} ${className}`} {...props} />;
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${className}`} {...props} />;
}

export function Badge({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' }>) {
  return <span className={`badge badge--${tone}`}>{children}</span>;
}

export function EmptyState({ icon, title, children }: PropsWithChildren<{ icon: ReactNode; title: string }>) {
  return <div className="empty-state"><span aria-hidden="true">{icon}</span><h3>{title}</h3><p>{children}</p></div>;
}
