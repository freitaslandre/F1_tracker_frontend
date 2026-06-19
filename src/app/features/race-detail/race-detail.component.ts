import { AsyncPipe, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { JolpicaRaceDetail, JolpicaRaceResult } from '../../core/models/f1.models';
import { F1Service } from '../../core/services/f1.service';

interface WikipediaSummary {
  thumbnail?: {
    source?: string;
  };
}

@Component({
  standalone: true,
  selector: 'app-race-detail',
  imports: [AsyncPipe, RouterLink],
  templateUrl: './race-detail.component.html',
})
export class RaceDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly http = inject(HttpClient);
  private readonly driverPhotoCache = new Map<string, Observable<string | undefined>>();
  protected readonly f1Service = inject(F1Service);

  protected readonly race = toSignal<JolpicaRaceDetail | undefined>(
    this.route.paramMap.pipe(
      map((params) => ({
        season: Number(params.get('season') ?? String(new Date().getUTCFullYear())),
        round: params.get('round') ?? '1',
      })),
      switchMap(({ season, round }) => this.f1Service.getRaceDetail(season, round)),
    ),
  );

  protected readonly selectedDriverId = computed(() => {
    const race = this.race();
    return race ? this.f1Service.selectedDriverForRace(race) : undefined;
  });

  protected vote(race: JolpicaRaceDetail, result: JolpicaRaceResult): void {
    this.f1Service.voteDriver(race, result);
  }

  protected toggleFavorite(race: JolpicaRaceDetail): void {
    this.f1Service.toggleFavoriteCircuit(race);
  }

  protected goBack(): void {
    this.location.back();
  }

  protected driverPhotoUrl(driverUrl: string): Observable<string | undefined> {
    if (!driverUrl) {
      return of(undefined);
    }

    const cached = this.driverPhotoCache.get(driverUrl);
    if (cached) {
      return cached;
    }

    const title = this.wikipediaTitleFromUrl(driverUrl);
    if (!title) {
      return of(undefined);
    }

    const photoUrl = this.http
      .get<WikipediaSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      .pipe(
        map((summary) => summary.thumbnail?.source),
        catchError(() => of(undefined)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    this.driverPhotoCache.set(driverUrl, photoUrl);
    return photoUrl;
  }

  protected driverInitials(givenName: string, familyName: string): string {
    return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
  }

  private wikipediaTitleFromUrl(driverUrl: string): string | undefined {
    try {
      const url = new URL(driverUrl);
      const title = url.pathname.split('/wiki/')[1];
      return title ? encodeURIComponent(decodeURIComponent(title)) : undefined;
    } catch {
      return undefined;
    }
  }
}
