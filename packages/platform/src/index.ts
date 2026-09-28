export interface PlatformUser {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export interface MiniAppPlatform {
  readonly name: 'browser' | 'telegram' | 'max';
  init(): void;
  getUser(): PlatformUser | null;
  getAuthPayload(): string | null;
  getStartParam(): string | null;
  setBackButton(visible: boolean, onClick?: () => void): void;
  haptic(type?: 'light' | 'medium' | 'success' | 'warning' | 'error'): void;
  openExternalLink(url: string): void;
  shareProblem(problem: { id: string; title: string; url: string }): Promise<void>;
  sendEvent(name: string, payload?: Record<string, unknown>): void;
  ready(): void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        initDataUnsafe?: { start_param?: string; user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string } };
        ready(): void;
        expand(): void;
        openLink(url: string): void;
        sendData(data: string): void;
        BackButton: { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void };
        HapticFeedback?: { impactOccurred(type: 'light' | 'medium' | 'heavy'): void; notificationOccurred(type: 'success' | 'warning' | 'error'): void };
      };
    };
  }
}

export class BrowserPlatformAdapter implements MiniAppPlatform {
  readonly name = 'browser' as const;
  init() {}
  getUser() { return null; }
  getAuthPayload() { return null; }
  getStartParam() { return new URLSearchParams(window.location.search).get('startapp'); }
  setBackButton(_visible: boolean, _onClick?: () => void) {}
  haptic() { if ('vibrate' in navigator) navigator.vibrate(10); }
  openExternalLink(url: string) { window.open(url, '_blank', 'noopener,noreferrer'); }
  async shareProblem(problem: { title: string; url: string }) {
    if (navigator.share) await navigator.share({ title: problem.title, url: problem.url });
    else await navigator.clipboard.writeText(problem.url);
  }
  sendEvent(name: string, payload: Record<string, unknown> = {}) { window.dispatchEvent(new CustomEvent(`pulse:${name}`, { detail: payload })); }
  ready() {}
}

export class TelegramPlatformAdapter implements MiniAppPlatform {
  readonly name = 'telegram' as const;
  private backHandler?: () => void;
  private get api() { return window.Telegram!.WebApp; }
  init() {
    this.api.ready();
    this.api.expand();
    document.documentElement.dataset.platform = 'telegram';
  }
  getUser(): PlatformUser | null {
    // initDataUnsafe is display-only. Server authentication always uses the signed initData string.
    const user = this.api.initDataUnsafe?.user;
    return user ? { id: String(user.id), firstName: user.first_name, lastName: user.last_name, username: user.username, languageCode: user.language_code } : null;
  }
  getAuthPayload() { return this.api.initData || null; }
  getStartParam() { return this.api.initDataUnsafe?.start_param ?? null; }
  setBackButton(visible: boolean, onClick?: () => void) {
    if (this.backHandler) this.api.BackButton.offClick(this.backHandler);
    this.backHandler = onClick;
    if (visible) { this.api.BackButton.show(); if (onClick) this.api.BackButton.onClick(onClick); }
    else this.api.BackButton.hide();
  }
  haptic(type: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') {
    if (['success', 'warning', 'error'].includes(type)) this.api.HapticFeedback?.notificationOccurred(type as 'success' | 'warning' | 'error');
    else this.api.HapticFeedback?.impactOccurred(type as 'light' | 'medium');
  }
  openExternalLink(url: string) { this.api.openLink(url); }
  async shareProblem(problem: { title: string; url: string }) { this.api.openLink(`https://t.me/share/url?url=${encodeURIComponent(problem.url)}&text=${encodeURIComponent(problem.title)}`); }
  sendEvent(name: string, payload: Record<string, unknown> = {}) { this.api.sendData(JSON.stringify({ name, payload })); }
  ready() { this.api.ready(); }
}

export class MaxPlatformAdapter implements MiniAppPlatform {
  readonly name = 'max' as const;
  // Integration points intentionally remain inert until the official MAX Bridge contract is available.
  init() {}
  getUser() { return null; }
  getAuthPayload() { return null; }
  getStartParam() { return null; }
  setBackButton(_visible: boolean, _onClick?: () => void) {}
  haptic() {}
  openExternalLink(url: string) { window.open(url, '_blank', 'noopener,noreferrer'); }
  async shareProblem(problem: { url: string }) { await navigator.clipboard.writeText(problem.url); }
  sendEvent(_name: string, _payload?: Record<string, unknown>) {}
  ready() {}
}

export function createPlatform(): MiniAppPlatform {
  return window.Telegram?.WebApp ? new TelegramPlatformAdapter() : new BrowserPlatformAdapter();
}
