import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ThemeStyle } from '../models/api.models';

/** Theme applied when the user has not picked one; renders the original UI styling. */
export const DEFAULT_THEME = 'default';

const THEME_STORAGE_KEY = 'fw_theme';
/** `data-theme` attribute written on <html>, read by themes.css. */
const THEME_ATTRIBUTE = 'data-theme';

/**
 * Built-in catalog mirroring the backend seed (UITheme). Used to label and offer the themes
 * when the catalog request has not returned yet or is unavailable, so the picker is never empty.
 */
const FALLBACK_THEMES: readonly ThemeStyle[] = [
  { id: 0, code: 'default', displayName: 'Default' },
  { id: 1, code: 'skeuomorphism', displayName: 'Realistic Design' },
  { id: 2, code: 'neomorphism', displayName: 'Soft UI' },
  { id: 3, code: 'glassmorphism', displayName: 'Frosted Glass' },
  { id: 4, code: 'claymorphism', displayName: 'Soft 3D Design' },
  { id: 5, code: 'minimalism', displayName: 'Clean & Simple' },
  { id: 6, code: 'maximalism', displayName: 'Bold & Vibrant' },
  { id: 7, code: 'brutalism', displayName: 'Bold & Raw' },
  { id: 8, code: 'liquid-glass', displayName: 'Liquid Glass' },
  { id: 9, code: 'bento-grid', displayName: 'Modular Grid' },
  { id: 10, code: 'spatial-ui', displayName: '3D Spatial Design' }
];

const FALLBACK_LABELS: Record<string, string> = FALLBACK_THEMES.reduce(
  (labels, theme) => ({ ...labels, [theme.code]: theme.displayName }),
  {} as Record<string, string>
);

/**
 * Owns the theme catalog and the signed-in user's selection. The active theme is written to the
 * `data-theme` attribute on <html>, which themes.css turns into the matching look and feel.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly api = inject(ApiService);

  private readonly catalogState = signal<ThemeStyle[]>([...FALLBACK_THEMES]);
  private readonly activeCodeState = signal<string>(this.readCachedTheme());
  private readonly savingState = signal<string | null>(null);
  private loaded = false;

  readonly catalog = computed(() => this.catalogState());
  readonly activeCode = computed(() => this.activeCodeState());
  readonly savingCode = computed(() => this.savingState());
  readonly activeLabel = computed(() => this.labelFor(this.activeCodeState()));

  constructor() {
    this.applyToDocument(this.activeCodeState());
  }

  /** Loads the catalog and, when signed in, the saved preference. Safe to call repeatedly. */
  load(force = false): void {
    if (this.loaded && !force) {
      return;
    }
    this.loaded = true;

    // Fall back to the built-in catalog so the picker still lists every theme if the API fails.
    this.api.listThemes()
      .pipe(catchError(() => of([...FALLBACK_THEMES])))
      .subscribe((themes) => this.catalogState.set(this.mergeCatalog(themes)));

    this.api.getMyTheme()
      .pipe(catchError(() => of(null)))
      .subscribe((preference) => {
        if (preference?.theme) {
          this.activate(preference.theme, true);
        }
      });
  }

  /** Saves the choice for the signed-in user and applies it right away. */
  select(code: string): Observable<string> {
    this.savingState.set(code);
    return this.api.saveMyTheme(code).pipe(
      map((preference) => preference?.theme || code),
      tap((saved) => {
        this.activate(saved, true);
        this.savingState.set(null);
      }),
      catchError((error) => {
        this.savingState.set(null);
        // Keep the chosen theme locally so the UI still reflects the selection if the save fails.
        this.activate(code, true);
        throw error;
      })
    );
  }

  /** Applies a theme locally without touching the server (used for the saved preference). */
  activate(code: string, cache: boolean): void {
    const next = code || DEFAULT_THEME;
    this.activeCodeState.set(next);
    this.applyToDocument(next);
    if (cache) {
      this.writeCachedTheme(next);
    }
  }

  /** Drops the cached theme and falls back to the default styling (used on sign-out). */
  reset(): void {
    this.loaded = false;
    this.catalogState.set([...FALLBACK_THEMES]);
    this.activeCodeState.set(DEFAULT_THEME);
    this.applyToDocument(DEFAULT_THEME);
    this.writeCachedTheme(DEFAULT_THEME);
  }

  labelFor(code: string): string {
    const match = this.catalogState().find((theme) => theme.code === code);
    const label = match?.displayName || FALLBACK_LABELS[code];
    // The backend seeds the default theme with a lowercase "default" label; prefer a proper name.
    return label && label !== DEFAULT_THEME ? label : FALLBACK_LABELS[DEFAULT_THEME];
  }

  private applyToDocument(code: string): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.documentElement.setAttribute(THEME_ATTRIBUTE, code);
  }

  private readCachedTheme(): string {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_THEME;
    }
    return localStorage.getItem(THEME_STORAGE_KEY) || DEFAULT_THEME;
  }

  private writeCachedTheme(code: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(THEME_STORAGE_KEY, code);
  }

  /**
   * Uses the server list (its order and display names) when available, and always keeps the
   * built-in catalog as the baseline so no theme — including `default` — ever disappears.
   */
  private mergeCatalog(themes: ThemeStyle[]): ThemeStyle[] {
    const byCode = new Map<string, ThemeStyle>();
    for (const theme of themes ?? []) {
      if (theme?.code) {
        byCode.set(theme.code, theme);
      }
    }

    const merged = FALLBACK_THEMES.map(
      (fallback) => byCode.get(fallback.code) ?? fallback
    );
    for (const theme of byCode.values()) {
      if (!merged.some((entry) => entry.code === theme.code)) {
        merged.push(theme);
      }
    }
    return merged;
  }
}
