import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, of, tap, throwError } from 'rxjs';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
}

const TOKEN_KEY = 'f1rm_token';
const USER_KEY = 'f1rm_user';
const LOCAL_USERS_KEY = 'f1rm_local_users';
const BACKEND_URL = 'http://localhost:3000/api';

interface AuthResponse {
  user: AuthUser;
  token: string;
}

interface LocalUser extends AuthUser {
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly token = signal<string | null>(localStorage.getItem(TOKEN_KEY));
  private readonly user = signal<AuthUser | null>(this.readUser());

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.token()));

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${BACKEND_URL}/auth/login`, { email, password })
      .pipe(
        catchError(() => this.localLogin(email, password)),
        tap((session) => this.setSession(session)),
      );
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${BACKEND_URL}/auth/register`, { name, email, password })
      .pipe(
        catchError(() => this.localRegister(name, email, password)),
        tap((session) => this.setSession(session)),
      );
  }

  getToken(): string | null {
    return this.token();
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
  }

  private setSession(session: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
    this.token.set(session.token);
    this.user.set(session.user);
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

  private localLogin(email: string, password: string): Observable<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const users = this.readLocalUsers();
    const demoUser = {
      id: 1,
      name: 'Demo Manager',
      email: 'demo@f1manager.test',
      password: 'password',
    };
    const user = [...users, demoUser].find((item) => item.email === normalizedEmail);

    if (!user || user.password !== password) {
      return throwError(() => new Error('Credenciais inválidas.'));
    }

    return of(this.createLocalSession(user));
  }

  private localRegister(name: string, email: string, password: string): Observable<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const users = this.readLocalUsers();

    if (users.some((user) => user.email === normalizedEmail)) {
      return throwError(() => new Error('Este email já existe no modo local.'));
    }

    const user: LocalUser = {
      id: Date.now(),
      name: name.trim() || 'F1 Fan',
      email: normalizedEmail,
      password,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify([...users, user]));

    return of(this.createLocalSession(user));
  }

  private readLocalUsers(): LocalUser[] {
    try {
      const raw = localStorage.getItem(LOCAL_USERS_KEY);
      return raw ? JSON.parse(raw) as LocalUser[] : [];
    } catch {
      localStorage.removeItem(LOCAL_USERS_KEY);
      return [];
    }
  }

  private createLocalSession(user: LocalUser): AuthResponse {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token: `local-${user.id}-${Date.now()}`,
    };
  }
}
