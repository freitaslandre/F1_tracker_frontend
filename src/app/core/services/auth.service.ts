import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  createdAt?: string;
}

const BACKEND_URL = 'http://localhost:3000/api';
const HTTP_OPTIONS = { withCredentials: true };

interface AuthResponse {
  user: AuthUser;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly user = signal<AuthUser | null>(null);
  private readonly sessionChecked = signal(false);

  readonly currentUser = this.user.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.user()));
  readonly hasCheckedSession = this.sessionChecked.asReadonly();

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${BACKEND_URL}/auth/login`, { email, password }, HTTP_OPTIONS)
      .pipe(tap((session) => this.setSession(session.user)));
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${BACKEND_URL}/auth/register`, { name, email, password }, HTTP_OPTIONS)
      .pipe(tap((session) => this.setSession(session.user)));
  }

  checkSession(): Observable<boolean> {
    return this.http.get<AuthResponse>(`${BACKEND_URL}/auth/me`, HTTP_OPTIONS).pipe(
      tap((session) => this.setSession(session.user)),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${BACKEND_URL}/auth/logout`, {}, HTTP_OPTIONS).pipe(
      catchError(() => of(undefined)),
      tap(() => this.clearSession()),
    );
  }

  private setSession(user: AuthUser): void {
    this.user.set(user);
    this.sessionChecked.set(true);
  }

  private clearSession(): void {
    this.user.set(null);
    this.sessionChecked.set(true);
  }
}
