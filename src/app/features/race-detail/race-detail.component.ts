import { AsyncPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);
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

  protected readonly selectedDriverName = computed(() => {
    const race = this.race();
    const selectedDriverId = this.selectedDriverId();
    if (!race || !selectedDriverId) {
      return 'Ainda sem voto';
    }

    const result = race.Results?.find((item) => item.Driver.driverId === selectedDriverId);
    return result ? `${result.Driver.givenName} ${result.Driver.familyName}` : selectedDriverId;
  });

  protected vote(race: JolpicaRaceDetail, result: JolpicaRaceResult): void {
    this.f1Service.voteDriver(race, result);
  }

  protected removeVote(race: JolpicaRaceDetail): void {
    this.f1Service.removeVote(race).subscribe();
  }

  protected toggleFavorite(race: JolpicaRaceDetail): void {
    this.f1Service.toggleFavoriteCircuit(race);
  }

  protected goBack(): void {
    const race = this.race();
    const returnSeason = this.route.snapshot.queryParamMap.get('returnSeason') ?? race?.season ?? String(new Date().getUTCFullYear());
    const returnView = this.route.snapshot.queryParamMap.get('returnView') ?? 'races';

    void this.router.navigate(['/dashboard'], {
      queryParams: {
        season: returnSeason,
        view: returnView,
      },
    });
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
