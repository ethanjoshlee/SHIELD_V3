export const DELIVERED_KILOTONS_BENCHMARKS = [
  {
    id: "hiroshima",
    label: "Hiroshima (Little Boy, U.S., 1945)",
    valueKt: 15,
    category: "nuclear",
    scope: "Yield of the first atomic bomb used in combat; energy equivalent to 15,000 tons of TNT.",
    sourceMeasure: "15 kilotons (yield)",
    sourceNote: "Los Alamos / technical histories",
    sourceUrl: "https://large.stanford.edu/courses/2018/ph241/furrer2/docs/la-8819.pdf"
  },
  {
    id: "nagasaki",
    label: "Nagasaki (Fat Man, U.S., 1945)",
    valueKt: 21,
    category: "nuclear",
    scope: "Yield of the second atomic bomb used in combat; energy equivalent to 21,000 tons of TNT.",
    sourceMeasure: "21 kilotons (yield)",
    sourceNote: "OSTI / Manhattan Project history",
    sourceUrl: "https://www.osti.gov/opennet/manhattan-project-history/Events/1945/nagasaki.htm"
  },
  {
    id: "tokyo_meetinghouse",
    label: "Tokyo firebombing (Operation Meetinghouse, U.S., Mar. 9–10 1945)",
    valueKt: 1.665,
    category: "conventional_raid",
    scope: "Single U.S. incendiary raid on Tokyo; bomb mass dropped.",
    sourceMeasure: "1,665 tons of bombs (mass)",
    sourceNote: "USSBS Pacific Summary Report",
    sourceUrl: "https://www.airuniversity.af.edu/Portals/10/AUPress/Books/B_0020_SPANGRUD_STRATEGIC_BOMBING_SURVEYS.pdf"
  },
  {
    id: "london_blitz_he",
    label: "London Blitz (High-Explosive, 1940–41)",
    valueKt: 23.949,
    category: "conventional_campaign",
    scope: "Mass of High-Explosive bombs dropped on London during 85 major raids; excludes weight of incendiary canisters.",
    sourceMeasure: "23,949 tons (mass)",
    sourceNote: "Imperial War Museums Blitz Factsheet",
    sourceUrl: "https://www.iwm.org.uk/sites/default/files/press-release/Battle_of_Britain_and_Blitz_Factsheet.pdf"
  },
  {
    id: "desert_storm",
    label: "Desert Storm air campaign (Coalition, 1991)",
    valueKt: 88.5,
    category: "conventional_campaign",
    scope: "Total mass of bombs dropped by U.S. and coalition forces over the six-week air campaign before the ground offensive.",
    sourceMeasure: "88,500 tons of bombs (mass)",
    sourceNote: "U.S. Air Force",
    sourceUrl: "https://www.af.mil/News/Article-Display/Article/2512938/30-years-later-desert-storm-remains-a-powerful-influence-on-air-space-forces/"
  },
  {
    id: "japan_home_islands",
    label: "Japan home islands bombing (Allied, WWII Pacific)",
    valueKt: 160.8,
    category: "conventional_campaign",
    scope: "Total mass of Allied bombs dropped on the Japanese home islands.",
    sourceMeasure: "160,800 tons of bombs (mass)",
    sourceNote: "USSBS Pacific Summary Report",
    sourceUrl: "https://www.airuniversity.af.edu/Portals/10/AUPress/Books/B_0020_SPANGRUD_STRATEGIC_BOMBING_SURVEYS.pdf"
  },
  {
    id: "korea_un_bombs",
    label: "Korean War bombing (UN bombs + napalm, 1950–53)",
    valueKt: 418.4,
    category: "conventional_campaign",
    scope: "Combined mass of bombs and napalm dropped by UN air forces; excludes broader non-bomb ordnance totals.",
    sourceMeasure: "418,394 tons (mass)",
    sourceNote: "Asia-Pacific Journal synthesis cited by Gemini",
    sourceUrl: "https://apjjf.org/mark-selden/2414/article"
  },
  {
    id: "pacific_total",
    label: "Pacific theater bombing (Allied, WWII Pacific)",
    valueKt: 656.4,
    category: "conventional_campaign",
    scope: "Total mass of Allied bombs dropped in the Pacific war.",
    sourceMeasure: "656,400 tons of bombs (mass)",
    sourceNote: "USSBS Pacific Summary Report",
    sourceUrl: "https://www.airuniversity.af.edu/Portals/10/AUPress/Books/B_0020_SPANGRUD_STRATEGIC_BOMBING_SURVEYS.pdf"
  },
  {
    id: "rolling_thunder",
    label: "Rolling Thunder (U.S. strikes on North Vietnam, 1965–68)",
    valueKt: 864,
    category: "conventional_campaign",
    scope: "Total mass of U.S. bombs and missiles dropped on North Vietnam during Rolling Thunder.",
    sourceMeasure: "864,000 tons (mass)",
    sourceNote: "Naval History and Heritage Command",
    sourceUrl: "https://www.history.navy.mil/about-us/leadership/director/directors-corner/h-grams/h-gram-017/h-017-2.html"
  },
  {
    id: "germany_borders",
    label: "Germany bombing (Allied, WWII Europe; within Germany's borders)",
    valueKt: 1360,
    category: "conventional_campaign",
    scope: "Total mass of Allied bombs dropped within Germany's own borders.",
    sourceMeasure: "1,360,000 tons of bombs (mass)",
    sourceNote: "USSBS European Summary Report",
    sourceUrl: "https://www.airuniversity.af.edu/Portals/10/AUPress/Books/B_0020_SPANGRUD_STRATEGIC_BOMBING_SURVEYS.pdf"
  },
  {
    id: "laos_us_total",
    label: "Laos bombing (U.S., 1964–73)",
    valueKt: 2093,
    category: "conventional_campaign",
    scope: "Total mass of U.S. air-delivered ordnance on Laos; widely cited as the most heavily bombed country per capita in history.",
    sourceMeasure: "2,093,100 tons (mass)",
    sourceNote: "The Guardian / Landmine & Cluster Munition Monitor",
    sourceUrl: "https://www.theguardian.com/global-development/2023/apr/27/i-dont-want-more-children-to-suffer-what-i-did-the-50-year-fight-to-clear-us-bombs-from-laos"
  },
  {
    id: "europe_total",
    label: "European theater bombing (Allied, WWII Europe)",
    valueKt: 2700,
    category: "conventional_campaign",
    scope: "Total mass of Allied bombs dropped in the European theater.",
    sourceMeasure: "2,700,000 tons of bombs (mass)",
    sourceNote: "USSBS European Summary Report",
    sourceUrl: "https://www.airuniversity.af.edu/Portals/10/AUPress/Books/B_0020_SPANGRUD_STRATEGIC_BOMBING_SURVEYS.pdf"
  },
  {
    id: "ww2_total_bombing",
    label: "World War II total bombing (All Sides, 1939–45)",
    valueKt: 4000,
    category: "conventional_aggregate",
    scope: "Estimated total bomb mass dropped by all combatants (Allied and Axis). This is a mass-to-yield comparison where 1,000 tons of conventional ordnance is charted as 1 kt.",
    sourceMeasure: "≈4,000,000 tons of ordnance (mass)",
    sourceNote: "Aggregated from USSBS European and Pacific summaries plus estimates for Soviet and Axis tactical expenditures.",
    sourceUrl: "https://www.airuniversity.af.edu/Portals/10/AUPress/Books/B_0020_SPANGRUD_STRATEGIC_BOMBING_SURVEYS.pdf"
  },
  {
    id: "indochina_us_total",
    label: "U.S. Indochina air-delivered ordnance (Vietnam, Laos, Cambodia; 1964–73)",
    valueKt: 7662,
    category: "conventional_campaign",
    scope: "Total U.S. air-delivered ordnance across Vietnam, Laos, and Cambodia.",
    sourceMeasure: "7,662,000 tons of ordnance (mass)",
    sourceNote: "Clodfelter / standard secondary compilation",
    sourceUrl: "https://www.researchgate.net/publication/373644576_Armed_Conflict_and_Environment_From_World_War_II_to_Contemporary_Asymmetric_Warfare_Nomos"
  },
  {
    id: "nuclear_testing_total",
    label: "Cumulative nuclear detonations (tests + wartime use, 1945–present)",
    valueKt: 540000,
    category: "nuclear_aggregate",
    scope: "Cumulative explosive yield of all nuclear detonations including nuclear tests and the Hiroshima/Nagasaki wartime detonations.",
    sourceMeasure: "≈540 megatons TNT equivalent",
    sourceNote: "UNSCEAR 2000 report and CTBTO nuclear testing records.",
    sourceUrl: "https://www.unscear.org/unscear/en/publications/2000_1.html"
  },
  {
  id: "twentieth_century_conflict_aggregate",
  label: "20th-century conflict bombing benchmark (WWII + Korea + Vietnam + Desert Storm)",
  valueKt: 12168.9,
  category: "conventional_aggregate",
  scope: "Derived aggregate of selected broad non-overlapping conflict bombing/ordnance benchmarks already in this dataset: World War II total bombing, Korean War bombing, U.S. Indochina air-delivered ordnance, and Desert Storm. This is a mass-conversion benchmark where 1,000 tons of conventional bombs/ordnance is charted as 1 kt.",
  sourceMeasure: "Derived sum: 4,000 + 418.4 + 7,662 + 88.5 = 12,168.9 kt",
  sourceNote: "Derived aggregate from existing benchmark entries in deliveredKilotonsBenchmarks.js; included to provide a high-scale conventional conflict comparison without double-counting nested campaign totals.",
  sourceUrl: ""
  }
];
