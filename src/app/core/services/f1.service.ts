import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';
import { FavoriteCircuit, JolpicaRaceDetail, JolpicaRaceSummary } from '../models/f1.models';

const FAVORITES_KEY = 'f1rm_favorite_circuits';
const VOTES_KEY = 'f1rm_driver_votes';
const API_URL = 'http://localhost:3000/api';

@Injectable({
  providedIn: 'root',
})
export class F1Service {
  private readonly http = inject(HttpClient);
  private readonly races$ = this.http
    .get<JolpicaRaceDetail[]>(`${API_URL}/f1/races`, {
      params: { season: String(new Date().getUTCFullYear()) },
    })
    .pipe(shareReplay({ bufferSize: 1, refCount: true }));
  private readonly favoriteCircuits = signal<FavoriteCircuit[]>(this.readJson(FAVORITES_KEY, []));
  private readonly driverVotes = signal<Record<string, string>>(this.readJson(VOTES_KEY, {}));

  readonly favorites = this.favoriteCircuits.asReadonly();
  readonly votes = this.driverVotes.asReadonly();
  readonly favoriteCount = computed(() => this.favoriteCircuits().length);

  getCurrentSeasonRaces(): Observable<JolpicaRaceSummary[]> {
    return this.races$.pipe(
      map((races) =>
        races.map((race) => ({
        season: race.season,
        round: race.round,
        url: race.url,
        raceName: race.raceName,
        Circuit: race.Circuit,
        date: race.date,
        time: race.time,
        })),
      ),
    );
  }

  getRaceDetail(round: string): Observable<JolpicaRaceDetail | undefined> {
    return this.races$.pipe(
      map((races) => races.find((race) => race.round === round)),
    );
  }

  toggleFavoriteCircuit(race: JolpicaRaceDetail): void {
    const favorite: FavoriteCircuit = {
      circuitId: race.Circuit.circuitId,
      circuitName: race.Circuit.circuitName,
      country: race.Circuit.Location.country,
      raceName: race.raceName,
    };

    const exists = this.favoriteCircuits().some((item) => item.circuitId === favorite.circuitId);
    const next = exists
      ? this.favoriteCircuits().filter((item) => item.circuitId !== favorite.circuitId)
      : [...this.favoriteCircuits(), favorite];

    this.favoriteCircuits.set(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  isFavorite(circuitId: string): boolean {
    return this.favoriteCircuits().some((item) => item.circuitId === circuitId);
  }

  voteDriver(round: string, driverId: string): void {
    const next = { ...this.driverVotes(), [round]: driverId };
    this.driverVotes.set(next);
    localStorage.setItem(VOTES_KEY, JSON.stringify(next));
  }

  selectedDriverForRound(round: string): string | undefined {
    return this.driverVotes()[round];
  }

  private readJson<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      localStorage.removeItem(key);
      return fallback;
    }
  }
}
