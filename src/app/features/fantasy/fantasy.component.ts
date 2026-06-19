import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { F1Service } from '../../core/services/f1.service';
import { FantasyConstructor, FantasyDriver, SavedFantasyTeam } from '../../core/models/f1.models';

interface WikipediaSummary {
  thumbnail?: {
    source?: string;
  };
  originalimage?: {
    source?: string;
  };
}

interface WikipediaSearchResponse {
  query?: {
    pages?: Record<
      string,
      {
        thumbnail?: {
          source?: string;
        };
      }
    >;
  };
}

@Component({
  standalone: true,
  selector: 'app-fantasy',
  imports: [CommonModule],
  templateUrl: './fantasy.component.html',
  styles: [
    `
      :host { display: block; padding: 24px; color: #f8fafc; font-family: Inter, system-ui, sans-serif; }
      .header, .team-heading, .footer { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
      .header h1, .panel h2, .slot-body h3, .driver-info h3 { margin: 0; }
      .eyebrow, .team-heading p, .slot-body p, .driver-info p, .budget-card strong, .slot-meta small { color: #94a3b8; }
      .status-pill, .tab.active { background: rgba(59, 130, 246, 0.18); color: #bfdbfe; }
      .status-pill, .tab, .continue-button, .selection-actions button, .driver-price button { border-radius: 999px; padding: 10px 16px; font-weight: 700; }
      .layout { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(360px, 1.4fr); gap: 24px; }
      .panel { background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(148, 163, 184, 0.14); border-radius: 18px; padding: 22px; }
      .budget-overview { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
      .budget-card, .slot, .item-linha { background: #111827; border: 1px solid rgba(148, 163, 184, 0.14); border-radius: 14px; }
      .budget-card { display: grid; gap: 6px; padding: 14px; }
      .budget-card span { color: #fff; font-size: 1.1rem; font-weight: 900; }
      .slots, .slot-group, .selection-list { display: grid; gap: 12px; }
      .slot-label { margin: 0; color: #cbd5e1; font-size: .78rem; font-weight: 900; text-transform: uppercase; }
      .slot { display: grid; grid-template-columns: 24px 54px minmax(0, 1fr) auto 28px; gap: 12px; align-items: center; min-height: 76px; padding: 12px; }
      .slot-icon, .avatar-circle { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; background: #1f2937; color: #fff; font-weight: 900; }
      .slot-icon.empty { color: #64748b; border: 1px dashed rgba(148, 163, 184, .32); background: transparent; }
      .slot-body, .driver-info { min-width: 0; }
      .slot-body h3, .slot-body p, .driver-info h3, .driver-info p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .slot-meta span, .driver-price { color: #e2e8f0; font-weight: 700; }
      .remove-slot, .slot button { border: 0; background: transparent; color: #fef2f2; cursor: pointer; }
      .tab-list { display: flex; gap: 12px; margin-bottom: 18px; }
      .tab { border: 1px solid transparent; color: #cbd5e1; cursor: pointer; background: transparent; }
      .search-bar input { width: 100%; box-sizing: border-box; margin-bottom: 18px; padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(148, 163, 184, .16); background: #0f172a; color: #fff; }
      .item-linha { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
      .avatar-container { width: 45px; height: 45px; min-width: 45px; margin-right: 16px; display: flex; align-items: center; justify-content: center; }
      .team-logo, .constructor-logo { object-fit: contain; background: #fff; border-radius: 8px; padding: 6px; box-sizing: border-box; }
      .team-logo { width: 42px; height: 42px; }
      .driver-image { object-fit: cover; border-radius: 50%; padding: 0; background: #3a3a3a; }
      .driver-info { flex: 1; }
      .driver-price { display: flex; align-items: center; gap: 12px; color: #00e5ff; white-space: nowrap; }
      .continue-button, .selection-actions button, .driver-price button { border: 0; background: #2563eb; color: #fff; cursor: pointer; }
      button:disabled { background: rgba(148, 163, 184, .24); cursor: not-allowed; }
      @media (max-width: 760px) { :host { padding: 16px; } .header, .team-heading, .footer { align-items: stretch; flex-direction: column; } .layout, .budget-overview { grid-template-columns: 1fr; } }
    `,
  ],
})
export class FantasyComponent {
  private readonly service = inject(F1Service);
  private readonly http = inject(HttpClient);
  private readonly driverPhotoCache = new Map<string, Observable<string | undefined>>();
  private readonly constructorLogoCache = new Map<string, Observable<string | undefined>>();
  private readonly driverWikiTitles: Record<string, string> = {
    russell: 'George_Russell_(racing_driver)',
    antonelli: 'Andrea_Kimi_Antonelli',
    leclerc: 'Charles_Leclerc',
    hamilton: 'Lewis_Hamilton',
    norris: 'Lando_Norris',
    piastri: 'Oscar_Piastri',
    verstappen: 'Max_Verstappen',
    hadjar: 'Isack_Hadjar',
    alonso: 'Fernando_Alonso',
    stroll: 'Lance_Stroll',
    colapinto: 'Franco_Colapinto',
    gasly: 'Pierre_Gasly',
    lawson: 'Liam_Lawson',
    lindblad: 'Arvid_Lindblad',
    sainz: 'Carlos_Sainz_Jr.',
    albon: 'Alex_Albon',
    hulkenberg: 'Nico_Hülkenberg',
    bortoleto: 'Gabriel_Bortoleto',
    ocon: 'Esteban_Ocon',
    bearman: 'Oliver_Bearman',
    perez: 'Sergio_Pérez',
    bottas: 'Valtteri_Bottas',
  };
  private readonly constructorWikiTitles: Record<string, string> = {
    audi: 'Audi',
    cadillac: 'Cadillac',
  };

  readonly activeTab = signal<'drivers' | 'constructors'>('drivers');
  readonly searchTerm = signal('');
  readonly isLoading = signal(true);
  readonly error = signal<string | undefined>(undefined);

  readonly drivers = signal<FantasyDriver[]>([]);
  readonly constructors = signal<FantasyConstructor[]>([]);
  readonly selectedDrivers = signal<(FantasyDriver | null)[]>(Array.from({ length: 5 }, () => null));
  readonly selectedConstructors = signal<(FantasyConstructor | null)[]>(Array.from({ length: 2 }, () => null));
  readonly brokenConstructorLogos = signal<Record<string, boolean>>({});

  readonly selectedDriverCount = computed(() => this.selectedDrivers().filter(Boolean).length);
  readonly selectedConstructorCount = computed(() => this.selectedConstructors().filter(Boolean).length);
  readonly usedBudget = computed(() => {
    const driverTotal = this.selectedDrivers()
      .filter((item): item is FantasyDriver => item !== null)
      .reduce((sum, item) => sum + item.price, 0);

    const constructorTotal = this.selectedConstructors()
      .filter((item): item is FantasyConstructor => item !== null)
      .reduce((sum, item) => sum + item.price, 0);

    return Number((driverTotal + constructorTotal).toFixed(1));
  });
  readonly remainingBudget = computed(() => Math.max(0, 100 - this.usedBudget()));
  readonly isTeamValid = computed(
    () => this.selectedDriverCount() === 5 && this.selectedConstructorCount() === 2 && this.usedBudget() <= 100,
  );

  readonly filteredDrivers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.drivers().filter((driver) =>
      !term ||
      driver.name.toLowerCase().includes(term) ||
      driver.team.toLowerCase().includes(term) ||
      driver.initials.toLowerCase().includes(term),
    );
  });

  readonly filteredConstructors = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    return this.constructors().filter((constructor) =>
      !term ||
      constructor.name.toLowerCase().includes(term) ||
      constructor.nationality.toLowerCase().includes(term) ||
      constructor.initials.toLowerCase().includes(term),
    );
  });

  readonly saveMessage = signal<string | null>(null);

  constructor() {
    this.loadFantasyData();
  }

  selectTab(value: 'drivers' | 'constructors'): void {
    this.activeTab.set(value);
    this.searchTerm.set('');
  }

  addDriver(driver: FantasyDriver): void {
    if (!this.canAddDriver(driver)) {
      return;
    }

    this.selectedDrivers.update((current) => {
      const next = [...current];
      const firstEmpty = next.findIndex((item) => item === null);
      if (firstEmpty === -1) {
        return current;
      }

      next[firstEmpty] = driver;
      return next;
    });
  }

  removeDriver(index: number): void {
    this.selectedDrivers.update((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
  }

  addConstructor(constructor: FantasyConstructor): void {
    if (!this.canAddConstructor(constructor)) {
      return;
    }

    this.selectedConstructors.update((current) => {
      const next = [...current];
      const firstEmpty = next.findIndex((item) => item === null);
      if (firstEmpty === -1) {
        return current;
      }

      next[firstEmpty] = constructor;
      return next;
    });
  }

  removeConstructor(index: number): void {
    this.selectedConstructors.update((current) => {
      const next = [...current];
      next[index] = null;
      return next;
    });
  }

  canAddDriver(driver: FantasyDriver): boolean {
    return (
      this.selectedDriverCount() < 5 &&
      !this.selectedDrivers().some((item) => item?.id === driver.id) &&
      this.usedBudget() + driver.price <= 100
    );
  }

  canAddConstructor(constructor: FantasyConstructor): boolean {
    return (
      this.selectedConstructorCount() < 2 &&
      !this.selectedConstructors().some((item) => item?.id === constructor.id) &&
      this.usedBudget() + constructor.price <= 100
    );
  }

  constructorLogoUrl(constructor: FantasyConstructor | null): Observable<string | undefined> {
    if (!constructor) {
      return of(undefined);
    }

    if (constructor.logo && !this.brokenConstructorLogos()[constructor.id]) {
      return of(constructor.logo);
    }

    const cached = this.constructorLogoCache.get(constructor.id);
    if (cached) {
      return cached;
    }

    const title = this.constructorWikiTitles[constructor.id];
    if (!title) {
      return of(undefined);
    }

    const logoUrl = this.http
      .get<WikipediaSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .pipe(
        map((summary) => summary.thumbnail?.source ?? summary.originalimage?.source),
        catchError(() => of(undefined)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    this.constructorLogoCache.set(constructor.id, logoUrl);
    return logoUrl;
  }

  markConstructorLogoBroken(constructorId: string): void {
    this.brokenConstructorLogos.update((current) => ({ ...current, [constructorId]: true }));
  }

  continue(): void {
    if (!this.isTeamValid()) {
      return;
    }

    const drivers = this.selectedDrivers().filter((item): item is FantasyDriver => item !== null);
    const constructors = this.selectedConstructors().filter((item): item is FantasyConstructor => item !== null);

    this.service.saveFantasyTeam(drivers, constructors, this.usedBudget()).subscribe({
      next: () => {
        this.saveMessage.set('Equipa guardada com sucesso.');
      },
      error: () => {
        this.saveMessage.set(null);
        this.error.set('Não foi possível guardar a equipa.');
      },
    });
  }

  formatPrice(value: number): string {
    return `$${value.toFixed(1)}M`;
  }

  driverPhotoUrl(driver: FantasyDriver): Observable<string | undefined> {
    const cached = this.driverPhotoCache.get(driver.id);
    if (cached) {
      return cached;
    }

    const title = encodeURIComponent(this.driverWikiTitles[driver.id] ?? driver.name.replaceAll(' ', '_'));
    const photoUrl = this.http
      .get<WikipediaSummary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${title}`)
      .pipe(
        map((summary) => summary.thumbnail?.source ?? summary.originalimage?.source),
        switchMap((summaryPhoto) => summaryPhoto ? of(summaryPhoto) : this.searchDriverPhoto(driver.name)),
        catchError(() => of(undefined)),
        shareReplay({ bufferSize: 1, refCount: true }),
      );

    this.driverPhotoCache.set(driver.id, photoUrl);
    return photoUrl;
  }

  private searchDriverPhoto(driverName: string): Observable<string | undefined> {
    const query = encodeURIComponent(`${driverName} racing driver`);
    return this.http
      .get<WikipediaSearchResponse>(
        `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=160&format=json&origin=*`,
      )
      .pipe(
        map((response) => {
          const pages = Object.values(response.query?.pages ?? {});
          return pages[0]?.thumbnail?.source;
        }),
        catchError(() => of(undefined)),
      );
  }

  private loadFantasyData(): void {
    this.isLoading.set(true);
    this.error.set(undefined);

    forkJoin({
      drivers: this.service.getFantasyDriversData(),
      constructors: this.service.getFantasyConstructorsData(),
      savedTeam: this.service.loadFantasyTeam().pipe(catchError(() => of({ team: null }))),
    })
      .pipe(take(1))
      .subscribe({
        next: ({ drivers, constructors, savedTeam }) => {
          this.drivers.set(drivers);
          this.constructors.set(constructors);
          this.restoreSavedTeam(drivers, constructors, savedTeam.team);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar os dados de fantasy.');
          this.isLoading.set(false);
        },
      });
  }

  private restoreSavedTeam(
    drivers: FantasyDriver[],
    constructors: FantasyConstructor[],
    saved: SavedFantasyTeam | null,
  ): void {
    if (!saved) {
      return;
    }

    const savedDriverIds = saved.drivers
      .sort((a, b) => a.positionIndex - b.positionIndex)
      .map((driver) => driver.externalId);
    const savedConstructorIds = saved.constructors
      .sort((a, b) => a.positionIndex - b.positionIndex)
      .map((constructor) => constructor.externalId);

    const resolvedDrivers = Array.from({ length: 5 }, (_, idx) => {
      const driverId = savedDriverIds[idx];
      return drivers.find((driver) => driver.id === driverId) ?? null;
    });

    const resolvedConstructors = Array.from({ length: 2 }, (_, idx) => {
      const constructorId = savedConstructorIds[idx];
      return constructors.find((constructor) => constructor.id === constructorId) ?? null;
    });

    this.selectedDrivers.set(resolvedDrivers);
    this.selectedConstructors.set(resolvedConstructors);
  }
}
