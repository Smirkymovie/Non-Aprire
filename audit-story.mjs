import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/game/engine.ts', import.meta.url), 'utf8');
const chapterTwo = source.slice(source.indexOf('/* CAPITOLO II — LA SOGLIA */'), source.indexOf('\n};\nasync function deliverFirstMessage'));
const checks = [
  ['obbediente', ['t2_entry_observe','t2_bath_open_error','t2_serious_open','t2_prepare_cross']],
  ['scettico', ['t2_bath_doubt','t2_serious_inspect','t2_deep_trust','t2_final_inspect']],
  ['esplorativo', ['t2_mark_doors','t2_audio_record','t2_kitchen_test','t2_follow_anomaly']],
  ['secondo tentativo', ['lastThresholdDeath','thresholdDeathRule','Ti resta addosso una certezza']],
  ['vincoli', ['thresholdEvidenceCount()>=2','recordingSaved','recordingDeleted','recordingReplayed','<b>15</b> secondi']]
];

let failed = false;
for (const [profile, markers] of checks) {
  const missing = markers.filter(marker => !source.includes(marker));
  if (missing.length) {
    failed = true;
    console.error(`FAIL ${profile}: ${missing.join(', ')}`);
  } else console.log(`OK   ${profile}`);
}

const endings = [...chapterTwo.matchAll(/chapter2End:\{id:/g)].length;
if (endings !== 5) {
  failed = true;
  console.error(`FAIL finali: attesi 5, trovati ${endings}`);
} else console.log('OK   cinque finali');

for (const forbidden of ['Non sono sparito.', 'timestamp di domani', 'me futuro', 'me-mostro']) {
  if (chapterTwo.includes(forbidden)) {
    failed = true;
    console.error(`FAIL rivelazione anticipata: ${forbidden}`);
  }
}
if (!failed) console.log('OK   nessuna rivelazione del finale vero anticipata');
process.exitCode = failed ? 1 : 0;
