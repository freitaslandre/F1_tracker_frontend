import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () =>
      import('./features/auth/auth-page.component').then((m) => m.AuthPageComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'fantasy',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/fantasy/fantasy.component').then((m) => m.FantasyComponent),
  },
  {
    path: 'races/:season/:round',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/race-detail/race-detail.component').then((m) => m.RaceDetailComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
