import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, shareReplay, switchMap, take } from 'rxjs/operators';
import { F1Service } from '../../core/services/f1.service';
import { FantasyConstructor, FantasyDriver } from '../../core/models/f1.models';

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
      :host {
        display: block;
        padding: 24px;
        color: #f8fafc;
        font-family: Inter, system-ui, sans-serif;
      }

      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 24px;
      }

      .header h1 {
        margin: 0;
        font-size: 2rem;
      }

      .eyebrow {
        margin: 0 0 8px;
        color: #94a3b8;
        font-size: 0.95rem;
      }

      .status-pill {
        padding: 10px 16px;
        border-radius: 999px;
        background: rgba(59, 130, 246, 0.16);
        color: #bfdbfe;
        font-weight: 700;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(360px, 1.4fr);
        gap: 24px;
      }

      .panel {
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.1);
        border-radius: 24px;
        padding: 22px;
      }

      .panel h2 {
        margin: 0;
        font-size: 1.2rem;
      }

      .team-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin: 20px 0 16px;
      }

      .team-heading p {
        margin: 6px 0 0;
        color: #94a3b8;
        font-size: 0.88rem;
      }

      .team-heading > span {
        flex: 0 0 auto;
        color: #86efac;
        font-weight: 800;
      }

      .budget-overview {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }

      .budget-card {
        display: grid;
        gap: 6px;
        padding: 14px;
        border-radius: 12px;
        background: #111827;
        border: 1px solid rgba(148, 163, 184, 0.14);
      }

      .budget-card strong {
        color: #94a3b8;
        font-size: 0.78rem;
      }

      .budget-card span {
        color: #ffffff;
        font-size: 1.1rem;
        font-weight: 900;
      }

      .slots {
        display: grid;
        gap: 18px;
      }

      .slot-group {
        display: grid;
        gap: 10px;
      }

      .slot-label {
        margin: 0;
        color: #cbd5e1;
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .slot {
        display: grid;
        grid-template-columns: 24px 54px minmax(0, 1fr) auto 28px;
        gap: 12px;
        align-items: center;
        min-height: 76px;
        padding: 12px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        border-radius: 14px;
        background: rgba(2, 6, 23, 0.34);
      }

      .slot.occupied {
        background: #111827;
        border-color: rgba(96, 165, 250, 0.28);
      }

      .slot-number {
        display: grid;
        place-items: center;
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 900;
      }

      .slot-icon {
        display: grid;
        width: 54px;
        height: 54px;
        min-width: 54px;
        place-items: center;
        border-radius: 50%;
        background: #1f2937;
        color: #ffffff;
        font-weight: 900;
      }

      .slot-icon.empty {
        color: #64748b;
        border: 1px dashed rgba(148, 163, 184, 0.32);
        background: transparent;
      }

      .slot-body {
        min-width: 0;
      }

      .slot-body h3 {
        margin: 0;
        overflow: hidden;
        color: #ffffff;
        font-size: 0.98rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .slot-body p {
        margin: 5px 0 0;
        overflow: hidden;
        color: #94a3b8;
        font-size: 0.82rem;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .selection-list {
        display: grid;
        gap: 12px;
      }

      /* Garante que cada linha da lista é uma barra horizontal */
      .item-linha {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background-color: #1e1e1e;
        border-bottom: 1px solid #2d2d2d;
        width: 100%;
        box-sizing: border-box;
        border-radius: 12px;
      }

      /* Contentor do Logótipo / Círculo */
      .avatar-container,
      .avatar-circle {
        width: 45px;
        height: 45px;
        min-width: 45px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 16px;
      }

      /* O Segredo para os Logótipos da Net ficarem perfeitos */
      .team-logo {
        width: 100%;
        height: 100%;
        object-fit: contain;
        background-color: #ffffff;
        border-radius: 8px;
        padding: 6px;
        box-sizing: border-box;
      }

      /* Para manter o círculo dos pilotos com o mesmo tamanho */
      .avatar-circle {
        background-color: #3a3a3a;
        color: #ffffff;
        border-radius: 50%;
        font-weight: bold;
        font-size: 14px;
      }

      .driver-image {
        object-fit: cover;
        border-radius: 50%;
        padding: 0;
        background: #3a3a3a;
      }

      .slot-icon.driver-image {
        width: 54px;
        height: 54px;
        min-width: 54px;
      }

      .constructor-logo {
        object-fit: contain;
        border-radius: 12px;
        background: #ffffff;
        padding: 8px;
        box-sizing: border-box;
      }

      .constructor-fallback {
        border-radius: 12px;
        background: #111827;
        border: 1px solid rgba(148, 163, 184, 0.22);
        color: #bfdbfe;
      }

      /* Agrupamento do texto (Nome e Equipa) */
      .driver-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .driver-info h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        color: #ffffff;
      }

      .driver-info p {
        margin: 0;
        font-size: 13px;
        color: #aaaaaa;
      }

      /* Preço na ponta direita */
      .driver-price {
        font-weight: bold;
        font-size: 16px;
        color: #00e5ff;
        margin-left: 16px;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .driver-price button {
        border: 0;
        border-radius: 999px;
        padding: 8px 12px;
        cursor: pointer;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
      }

      .driver-price button:disabled {
        background: rgba(148, 163, 184, 0.24);
        cursor: not-allowed;
      }

      .slot-meta span {
        display: block;
        color: #e2e8f0;
        font-weight: 700;
      }

      .slot-meta small {
        color: #94a3b8;
        font-size: 0.8rem;
      }

      .slot button {
        border: 0;
        background: transparent;
        color: #fef2f2;
        font-size: 1.1rem;
        cursor: pointer;
      }

      .remove-slot {
        display: grid;
        width: 28px;
        height: 28px;
        place-items: center;
        border-radius: 50%;
      }

      .remove-slot:hover {
        background: rgba(248, 113, 113, 0.16);
      }

      .tab-list {
        display: flex;
        gap: 12px;
        margin-bottom: 18px;
      }

      .tab {
        padding: 10px 18px;
        border-radius: 999px;
        cursor: pointer;
        border: 1px solid transparent;
        color: #cbd5e1;
      }

      .tab.active {
        background: #0f172a;
        border-color: rgba(59, 130, 246, 0.36);
        color: #fff;
      }

      .search-bar {
        width: 100%;
        margin-bottom: 18px;
      }

      .search-bar input {
        width: 100%;
        padding: 14px 16px;
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.16);
        background: #0f172a;
        color: #fff;
      }

      .selection-list {
        display: grid;
        gap: 12px;
      }

      .selection-item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 14px;
        align-items: center;
        padding: 16px;
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.92);
        border: 1px solid rgba(148, 163, 184, 0.1);
      }

      .selection-avatar {
        width: 52px;
        height: 52px;
        border-radius: 16px;
        background: #1e293b;
        display: grid;
        place-items: center;
        color: #f8fafc;
        font-size: 1rem;
        font-weight: 800;
      }

      .team-logo {
        width: 42px;
        height: 42px;
        object-fit: contain;
        background-color: #ffffff;
        border-radius: 8px;
        padding: 4px;
      }

      .selection-info {
        min-width: 0;
      }

      .selection-info h3 {
        margin: 0;
        font-size: 1rem;
      }

      .selection-info p {
        margin: 6px 0 0;
        color: #94a3b8;
        font-size: 0.88rem;
      }

      .selection-actions {
        display: grid;
        gap: 8px;
        justify-items: end;
      }

      .selection-actions span {
        color: #cbd5e1;
        font-weight: 700;
      }

      .selection-actions button {
        min-width: 100px;
        border: 0;
        border-radius: 999px;
        padding: 10px 16px;
        cursor: pointer;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
        transition: background 180ms ease;
      }

      .selection-actions button:disabled {
        background: rgba(148, 163, 184, 0.24);
        cursor: not-allowed;
      }

      .footer {
        margin-top: 22px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .footer strong {
        display: block;
        font-size: 0.98rem;
        margin-top: 8px;
      }

      .continue-button {
        border: 0;
        border-radius: 999px;
        padding: 14px 26px;
        background: #2563eb;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .continue-button:disabled {
        background: rgba(148, 163, 184, 0.24);
        cursor: not-allowed;
      }

      @media (max-width: 760px) {
        :host {
          padding: 16px;
        }

        .header,
        .team-heading,
        .footer {
          align-items: stretch;
          flex-direction: column;
        }

        .layout,
        .budget-overview {
          grid-template-columns: 1fr;
        }

        .slot {
          grid-template-columns: 20px 50px minmax(0, 1fr) 28px;
        }

        .slot-meta {
          grid-column: 3 / 5;
          display: flex;
          gap: 8px;
        }
      }
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

    const driverIds = this.selectedDrivers()
      .filter((item): item is FantasyDriver => item !== null)
      .map((driver) => driver.id);

    const constructorIds = this.selectedConstructors()
      .filter((item): item is FantasyConstructor => item !== null)
      .map((constructor) => constructor.id);

    this.service.saveFantasyTeam(driverIds, constructorIds);
    this.saveMessage.set('Equipa guardada com sucesso.');
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
    })
      .pipe(take(1))
      .subscribe({
        next: ({ drivers, constructors }) => {
          this.drivers.set(drivers);
          this.constructors.set(constructors);
          this.restoreSavedTeam(drivers, constructors);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar os dados de fantasy.');
          this.isLoading.set(false);
        },
      });
  }

  private restoreSavedTeam(drivers: FantasyDriver[], constructors: FantasyConstructor[]): void {
    const saved = this.service.loadFantasyTeam();
    const resolvedDrivers = Array.from({ length: 5 }, (_, idx) => {
      const driverId = saved.drivers[idx];
      return drivers.find((driver) => driver.id === driverId) ?? null;
    });

    const resolvedConstructors = Array.from({ length: 2 }, (_, idx) => {
      const constructorId = saved.constructors[idx];
      return constructors.find((constructor) => constructor.id === constructorId) ?? null;
    });

    this.selectedDrivers.set(resolvedDrivers);
    this.selectedConstructors.set(resolvedConstructors);
  }
}
