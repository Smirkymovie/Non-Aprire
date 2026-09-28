'use strict';
const q=s=>document.querySelector(s), chat=q('#chat'), input=q('#input');
const fresh=()=>({v:2,started:false,phase:'door',alive:true,door:false,knowledge:[],inventory:['telefono sconosciuto'],flags:{peeked:false,called:false},turn:0});
let S=fresh();
function save(){try{localStorage.setItem('nonaprire_v2',JSON.stringify(S))}catch(_){}}
function bubble(text,who='them',ms=0){return new Promise(r=>setTimeout(()=>{let d=document.createElement('div');d.className='msg '+who;d.textContent=text;chat.appendChild(d);chat.scrollTop=chat.scrollHeight;if(who==='them')push(text);r()},ms));}
function push(t){try{if(document.hidden&&Notification.permission==='granted')new Notification('NUMERO SCONOSCIUTO',{body:t,tag:'na-'+Date.now()})}catch(_){}}
async function start(){if(S.started)return;S.started=true;q('#overlay').classList.add('hidden');await bubble('00:01  •  Connessione assente','sys');await bubble('Non spaventarti.','them',900);await bubble('Abbiamo poco tempo.','them',900);await bubble('Controlla che la porta d’ingresso sia chiusa a chiave. Poi dimmi cosa hai fatto.','them',1100);save();}
function norm(x){return x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function has(x,...a){return a.some(k=>x.includes(k));}
async function die(reason){S.alive=false;await bubble(reason,'sys',700);await bubble('00:01','sys',1600);await bubble('Il telefono vibra di nuovo.','sys',500);await bubble('Hai già commesso questo errore.','them',700);q('#restart').classList.remove('hidden');save();}
async function act(raw){if(!S.alive||!raw.trim())return;let x=norm(raw.trim());bubble(raw.trim(),'me');input.value='';S.turn++;
 if(has(x,'inventario')){await bubble('Hai con te: '+S.inventory.join(', ')+'.','sys',400);return}
 if(has(x,'ora','che ore')){await bubble('00:' + String(Math.min(48,1+S.turn)).padStart(2,'0'),'sys',300);return}
 if(S.phase==='door'){
  if(has(x,'chiudo','chiusa','chiave','controllo la porta','porta chiusa')){S.door=true;await bubble('Bene. Non aprirla, qualunque cosa tu senta.','them',600);await bubble('TOC.  TOC.  TOC.','sys',1500);await bubble('E non guardare dallo spioncino.','them',700);S.phase='knock';}
  else if(has(x,'apro la porta','apro')) return die('Apri. Nel corridoio non c’è nessuno. Poi qualcosa ti afferra da dietro.');
  else if(has(x,'chi sei','perche','numero')) await bubble('Dopo. Prima la porta. È importante che sia chiusa.','them',500);
  else await bubble('Non ho capito. Dimmi cosa fai con la porta d’ingresso.','them',500);
 } else if(S.phase==='knock'){
  if(has(x,'spion','guardo fuori','occhiello')){S.flags.peeked=true;await bubble('Il corridoio è vuoto.','sys',500);await bubble('Ti avevo detto di non guardare. Ora sa dove sei. Allontanati dalla porta.','them',700);S.phase='hall';}
  else if(has(x,'apro')) return die('La maniglia si abbassa prima che tu riesca a toccarla.');
  else if(has(x,'allont','indietro','salotto','cucina','non guard','ignoro')){await bubble('Bravo.','them',500);await bubble('Dal fondo della casa arrivano tre colpi. Questa volta dalla camera.','sys',1100);S.phase='hall';}
  else if(has(x,'chiamo','112','polizia')){S.flags.called=true;await bubble('La chiamata parte, ma dall’altra parte qualcuno sussurra il tuo nome prima ancora che tu parli.','sys',700);await bubble('RIATTACCA.','them',500);S.phase='hall';}
  else await bubble('Non restare davanti alla porta.','them',500);
 } else if(S.phase==='hall'){
  if(has(x,'chi sei','perche mi aiuti','aiut')){await bubble('Perché questa notte l’ho già vissuta.','them',500);await bubble('E tu non sei arrivato alle 00:48.','them',900);S.knowledge.push('loop');S.phase='identity';}
  else if(has(x,'camera','apro camera','entro')) return die('La porta della camera si apre. La tua voce, dall’interno, dice: “Finalmente.”');
  else if(has(x,'bagno','chiudo in bagno')){await bubble('Ti chiudi in bagno. Per ora sei al sicuro.','sys',500);await bubble('Non basta nascondersi. Devi capire cosa sta entrando in casa.','them',700);S.phase='identity';}
  else await bubble('Prima di muoverti ancora, fammi una domanda. Una sola.','them',500);
 } else if(S.phase==='identity'){
  if(has(x,'chi sei','sei tu','nome')){await bubble('Sono te. Ma non quello che sei adesso.','them',600);await bubble('Guarda il telefono che hai in mano. Il graffio vicino alla fotocamera: il tuo non ce l’ha.','them',900);S.knowledge.push('phone');S.phase='phone';}
  else if(has(x,'cosa','succede','loop')){await bubble('Alle 00:48 tutto ricomincia. Quasi tutto.','them',600);S.phase='phone';}
  else await bubble('Chiedimi chi sono. È il modo più veloce per capire.','them',500);
 } else if(S.phase==='phone'){
  if(has(x,'mio telefono','vero telefono','dove')){await bubble('Il tuo vero telefono è in camera.','them',500);await bubble('Non aprire quella porta. Devi trovare un modo per verificare che io stia dicendo la verità senza entrare.','them',900);S.phase='test';}
  else if(has(x,'distrug','spacco','rompo')) return die('Spezzi il telefono. L’ultima cosa che compare sul display è: “Era l’unico oggetto che ricordava.”');
  else if(has(x,'fotocamera','camera telefono','foto')){await bubble('Apri la fotocamera. Sullo schermo, la porta della camera sembra illuminata da dietro. A occhio nudo è buia.','sys',600);S.phase='test';}
  else await bubble('Il tuo vero telefono non è quello che stai usando. Dimostralo.','them',500);
 } else if(S.phase==='test'){
  if(has(x,'chiamo il mio','faccio squill','sveglia','suoneria','trova il mio','find my')){await bubble('Dalla camera parte una suoneria. È la tua.','sys',700);await bubble('Bene. Adesso sai che non sto mentendo su tutto. Ma non fidarti ancora di me.','them',700);S.inventory.push('posizione del vero telefono');S.phase='choice';}
  else if(has(x,'apro','entro')) return die('Entri per recuperarlo. La suoneria smette. Qualcuno dietro di te dice: “Grazie.”');
  else if(has(x,'fotocamera','filmo','video')){await bubble('Attraverso la fotocamera vedi un’ombra ferma davanti alla porta della camera. Senza schermo non c’è nulla.','sys',600);S.knowledge.push('camera-sees');S.phase='choice';}
  else await bubble('Puoi verificare la presenza del tuo telefono senza entrare nella stanza.','them',500);
 } else if(S.phase==='choice'){
  if(has(x,'polizia','112')){await bubble('Prima di chiamare: se qualcuno risponde, chiedigli dove si trova la pattuglia. Non dire il tuo indirizzo.','them',500);await bubble('La linea si apre. “Emergenze, dica pure.”','sys',900);S.phase='call';}
  else if(has(x,'fotocamera','guardo','riprendo')){await bubble('Nello schermo l’ombra non è più davanti alla camera. È nel corridoio, rivolta verso di te.','sys',600);await bubble('Non correre. Se non la guardi attraverso uno schermo, non sa esattamente dove sei.','them',600);S.phase='shadow';}
  else await bubble('Puoi cercare aiuto, osservare senza esporti o provare qualcos’altro. Il tempo continua.','them',500);
 } else if(S.phase==='call'){
  if(has(x,'dove','pattuglia','posizione')){await bubble('“La pattuglia è davanti al civico.”','sys',500);await bubble('Ma dalla finestra non vedi lampeggianti.','sys',700);await bubble('Chiudi la chiamata. Quello non è il 112.','them',500);S.phase='shadow';}
  else if(has(x,'indirizzo')) return die('Dai l’indirizzo. Dall’altra parte rispondono: “Lo sappiamo.” Tre colpi arrivano dalla porta.');
  else await bubble('La voce al telefono aspetta. Il numero sconosciuto scrive: “Non dargli informazioni.”','sys',500);
 } else if(S.phase==='shadow'){
  if(has(x,'spengo','schermo spento','non guardo')){await bubble('Spegni lo schermo. I passi si fermano.','sys',500);await bubble('Hai appena scoperto una regola importante.','them',500);S.knowledge.push('blind');S.phase='sliceEnd';}
  else if(has(x,'corro','scappo','porta ingresso','esco')) return die('Corri verso l’uscita. Sullo schermo spento del televisore vedi per un istante qualcosa correre con te.');
  else if(has(x,'parlo','chi sei','cosa vuoi')){await bubble('Dal corridoio, con la tua stessa voce: “Il telefono.”','sys',700);S.phase='sliceEnd';}
  else await bubble('L’ombra resta visibile soltanto attraverso lo schermo. Sperimenta con questa informazione.','them',500);
 } else if(S.phase==='sliceEnd'){
   await bubble('00:17','sys',400);await bubble('La corrente salta.','sys',700);await bubble('Adesso inizia la parte che non sono mai riuscito a superare.','them',800);await bubble('FINE CAPITOLO 1 — il salvataggio conserverà ciò che hai scoperto.','sys',1200);S.alive=false;q('#restart').classList.remove('hidden');
 }
 save();
}
function reset(){localStorage.removeItem('nonaprire_v2');location.reload()}
q('#start').addEventListener('click',start);q('#send').addEventListener('click',()=>act(input.value));input.addEventListener('keydown',e=>{if(e.key==='Enter')act(input.value)});q('#restart').addEventListener('click',reset);q('#notify').addEventListener('click',async()=>{try{if(!('Notification'in window))throw 0;let p=await Notification.requestPermission();q('#notify').textContent=p==='granted'?'NOTIFICHE ATTIVE':'NOTIFICHE NON DISPONIBILI'}catch(_){q('#notify').textContent='NOTIFICHE NON DISPONIBILI'}});
window.addEventListener('error',e=>{let d=document.createElement('div');d.className='msg sys';d.textContent='Errore interno: '+e.message;chat.appendChild(d)});
try{let old=JSON.parse(localStorage.getItem('nonaprire_v2'));if(old&&old.v===2){S=old;if(S.started){q('#overlay').classList.add('hidden');bubble('PARTITA RIPRISTINATA • scrivi “inventario” o continua da dove eri rimasto.','sys')}}}catch(_){S=fresh()}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
