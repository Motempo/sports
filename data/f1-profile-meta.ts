/**
 * Static bio fields for seed / offline fallback.
 * Live Jolpica standings usually supply the same fields; these fill gaps.
 */
export interface F1DriverMeta {
  permanentNumber?: number;
  dateOfBirth?: string;
  nationality?: string;
  givenName?: string;
  familyName?: string;
}

export interface F1ConstructorMeta {
  nationality?: string;
}

export const F1_DRIVER_META: Record<string, F1DriverMeta> = {
  antonelli: {
    permanentNumber: 12,
    dateOfBirth: "2006-08-25",
    nationality: "Italian",
    givenName: "Andrea Kimi",
    familyName: "Antonelli",
  },
  hamilton: {
    permanentNumber: 44,
    dateOfBirth: "1985-01-07",
    nationality: "British",
    givenName: "Lewis",
    familyName: "Hamilton",
  },
  russell: {
    permanentNumber: 63,
    dateOfBirth: "1998-02-15",
    nationality: "British",
    givenName: "George",
    familyName: "Russell",
  },
  leclerc: {
    permanentNumber: 16,
    dateOfBirth: "1997-10-16",
    nationality: "Monegasque",
    givenName: "Charles",
    familyName: "Leclerc",
  },
  norris: {
    permanentNumber: 1,
    dateOfBirth: "1999-11-13",
    nationality: "British",
    givenName: "Lando",
    familyName: "Norris",
  },
  max_verstappen: {
    permanentNumber: 3,
    dateOfBirth: "1997-09-30",
    nationality: "Dutch",
    givenName: "Max",
    familyName: "Verstappen",
  },
  piastri: {
    permanentNumber: 81,
    dateOfBirth: "2001-04-06",
    nationality: "Australian",
    givenName: "Oscar",
    familyName: "Piastri",
  },
  hadjar: {
    permanentNumber: 6,
    dateOfBirth: "2004-09-28",
    nationality: "French",
    givenName: "Isack",
    familyName: "Hadjar",
  },
  lawson: {
    permanentNumber: 30,
    dateOfBirth: "2002-02-11",
    nationality: "New Zealander",
    givenName: "Liam",
    familyName: "Lawson",
  },
  gasly: {
    permanentNumber: 10,
    dateOfBirth: "1996-02-07",
    nationality: "French",
    givenName: "Pierre",
    familyName: "Gasly",
  },
  arvid_lindblad: {
    permanentNumber: 41,
    dateOfBirth: "2007-08-08",
    nationality: "British",
    givenName: "Arvid",
    familyName: "Lindblad",
  },
  colapinto: {
    permanentNumber: 43,
    dateOfBirth: "2003-05-27",
    nationality: "Argentine",
    givenName: "Franco",
    familyName: "Colapinto",
  },
  bearman: {
    permanentNumber: 87,
    dateOfBirth: "2005-05-08",
    nationality: "British",
    givenName: "Oliver",
    familyName: "Bearman",
  },
  bortoleto: {
    permanentNumber: 5,
    dateOfBirth: "2004-10-14",
    nationality: "Brazilian",
    givenName: "Gabriel",
    familyName: "Bortoleto",
  },
  sainz: {
    permanentNumber: 55,
    dateOfBirth: "1994-09-01",
    nationality: "Spanish",
    givenName: "Carlos",
    familyName: "Sainz",
  },
  albon: {
    permanentNumber: 23,
    dateOfBirth: "1996-03-23",
    nationality: "Thai",
    givenName: "Alexander",
    familyName: "Albon",
  },
  ocon: {
    permanentNumber: 31,
    dateOfBirth: "1996-09-17",
    nationality: "French",
    givenName: "Esteban",
    familyName: "Ocon",
  },
  hulkenberg: {
    permanentNumber: 27,
    dateOfBirth: "1987-08-19",
    nationality: "German",
    givenName: "Nico",
    familyName: "Hülkenberg",
  },
  alonso: {
    permanentNumber: 14,
    dateOfBirth: "1981-07-29",
    nationality: "Spanish",
    givenName: "Fernando",
    familyName: "Alonso",
  },
  stroll: {
    permanentNumber: 18,
    dateOfBirth: "1998-10-29",
    nationality: "Canadian",
    givenName: "Lance",
    familyName: "Stroll",
  },
  bottas: {
    permanentNumber: 77,
    dateOfBirth: "1989-08-28",
    nationality: "Finnish",
    givenName: "Valtteri",
    familyName: "Bottas",
  },
  perez: {
    permanentNumber: 11,
    dateOfBirth: "1990-01-26",
    nationality: "Mexican",
    givenName: "Sergio",
    familyName: "Pérez",
  },
};

export const F1_CONSTRUCTOR_META: Record<string, F1ConstructorMeta> = {
  mercedes: { nationality: "German" },
  ferrari: { nationality: "Italian" },
  mclaren: { nationality: "British" },
  red_bull: { nationality: "Austrian" },
  rb: { nationality: "Italian" },
  alpine: { nationality: "French" },
  haas: { nationality: "American" },
  audi: { nationality: "German" },
  williams: { nationality: "British" },
  aston_martin: { nationality: "British" },
  cadillac: { nationality: "American" },
};
