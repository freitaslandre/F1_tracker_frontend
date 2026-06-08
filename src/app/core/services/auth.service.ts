import { Injectable, computed, signal } from '@angular/core';

export interface AuthUser {
  name: string;
  email: string;
}

const TOKEN_KEY = 'f1rm_token';
const USER_KEY = 'f1rm_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly user = signal<AuthUser | null>(this.readUser());

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.token()));

  login(email: string, _password: string): void {
    void _password;
    const name = email.split('@')[0] || 'F1 Fan';
    this.setSession({ name, email });
  }

  register(name: string, email: string, _password: string): void {
    void _password;
    this.setSession({ name, email });
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
  }

  private setSession(user: AuthUser): void {
    const token = `mock-token-${crypto.randomUUID()}`;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.token.set(token);
    this.user.set(user);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }
}
