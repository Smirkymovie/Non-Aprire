# 00:01 — React + TypeScript

Conversione della build UI37 del gioco **00:01 / Non Aprire** a React + TypeScript con Vite.

## Avvio locale

```bash
npm install
npm run dev
```

## Build produzione

```bash
npm run build
```

I file pronti da pubblicare vengono creati nella cartella `dist/`.

## GitHub Pages

La configurazione Vite usa `base: './'`, quindi il build resta compatibile con un repository pubblicato in una sottocartella come `/Non-Aprire/`.

La conversione mantiene gli stessi ID DOM, le stesse chiavi `localStorage`, gli asset, la galleria, il Capitolo 1, `CAPITOLO II — LA SOGLIA`, i checkpoint e le morti della UI37.

La revisione `0.14.38-react-ts` interviene soltanto sul Capitolo 2: memoria della causa di morte tra i loop, prove visive/fisiche/audio da incrociare, registrazione contraddittoria, contaminazioni al ricongiungimento e audit dei quattro profili narrativi. Il Capitolo 1 e la UI restano congelati.

## Audit narrativo

```bash
npm run audit:story
```

Controlla i profili obbediente, scettico, esplorativo e secondo tentativo, oltre ai vincoli strutturali (cinque finali, countdown da 15 secondi e assenza delle rivelazioni riservate al finale vero nel Capitolo 2).

### Struttura

- `src/App.tsx` — interfaccia React
- `src/game/engine.ts` — motore narrativo TypeScript compatibile con la logica UI37
- `public/` — immagini, audio, CSS, manifest e service worker
