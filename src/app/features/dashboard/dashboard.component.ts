import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { F1Service } from '../../core/services/f1.service';
import { JolpicaRaceSummary } from '../../core/models/f1.models';

@Component({
  standalone: true,
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
  private readonly f1Service = inject(F1Service);

  protected readonly seasons = Array.from({ length: new Date().getUTCFullYear() - 1950 + 1 }, (_, i) => new Date().getUTCFullYear() - i).reverse().reverse();
  protected readonly season = signal<number>(new Date().getUTCFullYear());
  protected readonly races = signal<JolpicaRaceSummary[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly error = signal<string | null>(null);
  protected readonly historyMode = signal<boolean>(false);

  constructor() {
    effect((onCleanup) => {
      const seasonValue = this.season();
      this.isLoading.set(true);
      this.error.set(null);

      const sub = this.f1Service.getSeasonRaces(seasonValue).subscribe({
        next: (races) => {
          this.races.set(races);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar as corridas desta temporada.');
          this.races.set([]);
          this.isLoading.set(false);
        },
      });

      onCleanup(() => sub.unsubscribe());
    });
  }

  protected showHistory(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.f1Service.getAllRacesHistory().subscribe({
      next: (races) => {
        this.races.set(races);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o histórico de corridas.');
        this.races.set([]);
        this.isLoading.set(false);
      },
    });
  }

  protected selectSeason(event: Event): void {
    // switching season exits history mode
    this.historyMode.set(false);
    const target = event.target as HTMLSelectElement;
    this.season.set(Number(target.value));
  }

  protected hideHistory(): void {
    this.historyMode.set(false);
    this.season.set(new Date().getUTCFullYear());
  }

  protected isRaceCompleted(race: JolpicaRaceSummary): boolean {
    try {
      const date = race.date ?? '';
      const time = race.time ?? '';
      const dateTime = time ? new Date(`${date}T${time}`) : new Date(date);
      return dateTime.getTime() <= Date.now();
    } catch {
      return false;
    }
  }
}
