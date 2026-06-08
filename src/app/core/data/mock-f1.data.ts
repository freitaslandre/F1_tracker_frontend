import { JolpicaConstructor, JolpicaDriver, JolpicaRaceDetail } from '../models/f1.models';

const drivers = {
  verstappen: {
    driverId: 'verstappen',
    permanentNumber: '1',
    code: 'VER',
    url: 'https://en.wikipedia.org/wiki/Max_Verstappen',
    givenName: 'Max',
    familyName: 'Verstappen',
    dateOfBirth: '1997-09-30',
    nationality: 'Dutch',
  },
  norris: {
    driverId: 'norris',
    permanentNumber: '4',
    code: 'NOR',
    url: 'https://en.wikipedia.org/wiki/Lando_Norris',
    givenName: 'Lando',
    familyName: 'Norris',
    dateOfBirth: '1999-11-13',
    nationality: 'British',
  },
  leclerc: {
    driverId: 'leclerc',
    permanentNumber: '16',
    code: 'LEC',
    url: 'https://en.wikipedia.org/wiki/Charles_Leclerc',
    givenName: 'Charles',
    familyName: 'Leclerc',
    dateOfBirth: '1997-10-16',
    nationality: 'Monegasque',
  },
  hamilton: {
    driverId: 'hamilton',
    permanentNumber: '44',
    code: 'HAM',
    url: 'https://en.wikipedia.org/wiki/Lewis_Hamilton',
    givenName: 'Lewis',
    familyName: 'Hamilton',
    dateOfBirth: '1985-01-07',
    nationality: 'British',
  },
} satisfies Record<string, JolpicaDriver>;

const constructors = {
  redBull: {
    constructorId: 'red_bull',
    url: 'https://en.wikipedia.org/wiki/Red_Bull_Racing',
    name: 'Red Bull',
    nationality: 'Austrian',
  },
  mclaren: {
    constructorId: 'mclaren',
    url: 'https://en.wikipedia.org/wiki/McLaren',
    name: 'McLaren',
    nationality: 'British',
  },
  ferrari: {
    constructorId: 'ferrari',
    url: 'https://en.wikipedia.org/wiki/Scuderia_Ferrari',
    name: 'Ferrari',
    nationality: 'Italian',
  },
} satisfies Record<string, JolpicaConstructor>;

export const MOCK_RACES: JolpicaRaceDetail[] = [
  {
    season: '2026',
    round: '1',
    url: 'https://api.jolpi.ca/ergast/f1/2026/1/results/',
    raceName: 'Australian Grand Prix',
    Circuit: {
      circuitId: 'albert_park',
      url: 'https://en.wikipedia.org/wiki/Albert_Park_Circuit',
      circuitName: 'Albert Park Grand Prix Circuit',
      Location: {
        lat: '-37.8497',
        long: '144.968',
        locality: 'Melbourne',
        country: 'Australia',
      },
    },
    date: '2026-03-08',
    time: '04:00:00Z',
    Results: [
      result('1', drivers.norris, constructors.mclaren, '25', '1:32:40.178', '1:20.486'),
      result('2', drivers.verstappen, constructors.redBull, '18', '+2.912', '1:20.901'),
      result('3', drivers.leclerc, constructors.ferrari, '15', '+8.441', '1:21.112'),
      result('4', drivers.hamilton, constructors.ferrari, '12', '+15.201', '1:21.220'),
    ],
  },
  {
    season: '2026',
    round: '2',
    url: 'https://api.jolpi.ca/ergast/f1/2026/2/results/',
    raceName: 'Chinese Grand Prix',
    Circuit: {
      circuitId: 'shanghai',
      url: 'https://en.wikipedia.org/wiki/Shanghai_International_Circuit',
      circuitName: 'Shanghai International Circuit',
      Location: {
        lat: '31.3389',
        long: '121.22',
        locality: 'Shanghai',
        country: 'China',
      },
    },
    date: '2026-03-15',
    time: '07:00:00Z',
    Results: [
      result('1', drivers.verstappen, constructors.redBull, '25', '1:35:12.006', '1:34.098'),
      result('2', drivers.leclerc, constructors.ferrari, '18', '+6.540', '1:34.772'),
      result('3', drivers.norris, constructors.mclaren, '15', '+10.102', '1:34.615'),
      result('4', drivers.hamilton, constructors.ferrari, '12', '+22.334', '1:35.001'),
    ],
  },
  {
    season: '2026',
    round: '3',
    url: 'https://api.jolpi.ca/ergast/f1/2026/3/results/',
    raceName: 'Japanese Grand Prix',
    Circuit: {
      circuitId: 'suzuka',
      url: 'https://en.wikipedia.org/wiki/Suzuka_Circuit',
      circuitName: 'Suzuka Circuit',
      Location: {
        lat: '34.8431',
        long: '136.541',
        locality: 'Suzuka',
        country: 'Japan',
      },
    },
    date: '2026-03-29',
    time: '05:00:00Z',
    Results: [
      result('1', drivers.leclerc, constructors.ferrari, '25', '1:28:50.781', '1:31.810'),
      result('2', drivers.norris, constructors.mclaren, '18', '+4.102', '1:31.992'),
      result('3', drivers.verstappen, constructors.redBull, '15', '+7.436', '1:31.665'),
      result('4', drivers.hamilton, constructors.ferrari, '12', '+18.990', '1:32.400'),
    ],
  },
];

function result(
  position: string,
  Driver: JolpicaDriver,
  Constructor: JolpicaConstructor,
  points: string,
  raceTime: string,
  fastestLap: string,
) {
  return {
    number: Driver.permanentNumber,
    position,
    positionText: position,
    points,
    Driver,
    Constructor,
    grid: position,
    laps: '58',
    status: 'Finished',
    Time: {
      millis: '0',
      time: raceTime,
    },
    FastestLap: {
      rank: position,
      lap: '52',
      Time: {
        time: fastestLap,
      },
    },
  };
}
