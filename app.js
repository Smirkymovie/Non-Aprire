'use strict';
const $=s=>document.querySelector(s), chat=$('#chat'), choices=$('#choices'), clock=$('#clock');
const KEY='nonaprire_v09_state', META='nonaprire_v09_meta';
const START=60, END=48*60, LIMIT=(END-START)*1000;
let S={started:false,alive:true,ending:false,chapterDone:false,startAt:0,node:'intro',history:[],loops:0};
let clockTimer=null, deadlineTimer=null, busy=false, deathTimer=null;
try{const m=JSON.parse(localStorage.getItem(META));if(m&&Number.isFinite(m.loops))S.loops=m.loops}catch(_){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(_){}}
function elapsed(){return S.started?Math.max(0,Date.now()-S.startAt):0}
function gameSec(){return Math.min(END,START+Math.floor(elapsed()/1000))}
function fmt(n){const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':')}
function updateClock(){clock.textContent=fmt(gameSec());if(S.started&&S.alive&&!S.ending&&!S.chapterDone&&elapsed()>=LIMIT)deadlineDeath()}
function startClock(){clearInterval(clockTimer);clearTimeout(deadlineTimer);clockTimer=setInterval(updateClock,250);deadlineTimer=setTimeout(deadlineDeath,Math.max(0,LIMIT-elapsed()+50));updateClock()}
function stopTimers(){clearInterval(clockTimer);clearTimeout(deadlineTimer);if(deathTimer)clearInterval(deathTimer);clockTimer=deadlineTimer=deathTimer=null}
function scrollBottom(){requestAnimationFrame(()=>chat.scrollTop=chat.scrollHeight)}
function add(text,who='sys',delay=0){return new Promise(resolve=>setTimeout(()=>{if(!text){resolve();return}const d=document.createElement('div');d.className='msg '+who;d.textContent=text;chat.appendChild(d);scrollBottom();resolve()},delay))}
function clearChoices(){choices.replaceChildren()}
function renderChoices(list){clearChoices();if(S.ending||S.chapterDone)return;for(const c of list){const b=document.createElement('button');b.type='button';b.className='choice '+(c.action?'action':'');b.textContent=c.label;b.addEventListener('click',()=>pick(c),{once:true});choices.appendChild(b)}}
async function pick(c){if(busy||S.ending||S.chapterDone)return;busy=true;const label=c.label;clearChoices();S.history.push({node:S.node,choice:label,at:gameSec()});save();await add(label,'me',0);if(c.death){busy=false;return die(c.death)}if(c.end){busy=false;return chapterEnd()}busy=false;return go(c.next)}
async function go(id){if(S.ending||S.chapterDone)return;const node=NODES[id];if(!node){return failSafe('Il filo della conversazione si interrompe. Il telefono vibra una volta, poi compare un nuovo messaggio.')}S.node=id;save();clearChoices();for(const m of node.msgs){await add(m.text,m.who||'sys',m.delay??420)}if(node.end)return chapterEnd();if(!node.choices||node.choices.length===0)return failSafe('Per qualche secondo non succede nulla. Poi il numero sconosciuto scrive di nuovo.');renderChoices(node.choices)}
async function failSafe(text){await add(text,'sys',500);await add('Non restare fermo. Vai verso l’ingresso.','them',450);renderChoices([{label:'Vado verso l’ingresso.',action:true,next:'entry_final'},{label:'Resto dove sono e ascolto.',action:true,next:'listen_final'}])}
function contextualDeadline(){const n=S.node;if(/bed|room|mirror/.test(n))return 'Alle 00:48 lo schermo nella camera si accende. Nel vetro nero compare il tuo riflesso, ma continua a muoversi quando tu ti fermi.';if(/door|entry/.test(n))return 'Alle 00:48 la serratura scatta. Non dall’esterno. La porta si apre lentamente verso di te e, dietro, c’è il corridoio di casa tua.';if(/wall|listen|ceiling/.test(n))return 'Alle 00:48 i colpi tornano. Non arrivano più dalla parete: arrivano da dentro il telefono che tieni in mano.';return 'Alle 00:48 tutti i rumori cessano. Nel display vedi per un istante qualcuno fermo esattamente alle tue spalle.'}
async function deadlineDeath(){if(!S.started||!S.alive||S.ending||S.chapterDone)return;await die(contextualDeadline())}
async function die(text){if(S.ending||S.chapterDone)return;S.ending=true;S.alive=false;clearChoices();clearTimeout(deadlineTimer);save();await add(text,'sys',450);const box=document.createElement('div');box.className='deadBattery';box.innerHTML='<div class="deadBatteryRow"><span class="deadBatteryIcon" aria-hidden="true">🪫</span><div><strong>BATTERIA SCARICA</strong><span>0%</span></div></div><p class="deathCountdown">Il loop ricomincia tra <b>15</b> secondi…</p><small>Puoi scorrere la chat e rileggere cosa è successo.</small>';chat.appendChild(box);scrollBottom();let left=15;const n=box.querySelector('b');deathTimer=setInterval(()=>{left--;if(n)n.textContent=Math.max(0,left);if(left<=0){clearInterval(deathTimer);deathTimer=null;resetLoop()}},1000)}
async function chapterEnd(){if(S.chapterDone||S.ending)return;S.chapterDone=true;clearChoices();stopTimers();try{const m=JSON.parse(localStorage.getItem(META)||'{}');m.loops=S.loops||m.loops||0;m.chapter2Unlocked=true;m.chapter1Ending=S.node;localStorage.setItem(META,JSON.stringify(m))}catch(_){}save();await add('Il telefono smette di vibrare. Per la prima volta dall’inizio della notte, il silenzio non sembra una minaccia.','sys',600);const box=document.createElement('div');box.className='chapterEnd';box.innerHTML='<strong>CAPITOLO 1 COMPLETATO</strong><p>Hai raggiunto la fine del contenuto disponibile.</p><small>Il Capitolo 2 è ancora in sviluppo.</small>';chat.appendChild(box);scrollBottom();const b=document.createElement('button');b.type='button';b.className='choice';b.textContent='RICOMINCIA IL CAPITOLO 1';b.addEventListener('click',resetLoop,{once:true});choices.appendChild(b)}
function resetLoop(){stopTimers();const loops=(S.loops||0)+1;try{localStorage.setItem(META,JSON.stringify({loops}))}catch(_){}localStorage.removeItem(KEY);location.reload()}
function resetAll(){stopTimers();localStorage.removeItem(KEY);localStorage.removeItem(META);location.reload()}
const C=(label,next,action=false)=>({label,next,action});
const D=(label,death,action=true)=>({label,death,action});
const M=(text,who='sys',delay=420)=>({text,who,delay});
const NODES={
intro:{msgs:[M('NON APRIRE.','them',650),M('Controlla la porta d’ingresso. Assicurati che sia chiusa.','them',650),M('TOC.  TOC.  TOC.','sys',1100)],choices:[
 C('Controllo la porta.','A1',true),
 C('“Chi sei?”','B1'),
 C('Ignoro il messaggio.','C1',true),
 C('Provo a chiamare il 112.','D1',true),
 C('Cerco da dove arriva la vibrazione.','E1',true)
]},

// RAMO A — LA PORTA
A1:{msgs:[M('La porta è chiusa a chiave.','sys'),M('Dall’altra parte qualcuno appoggia lentamente la mano sul legno.','sys',650),M('Non guardare dallo spioncino.','them')],choices:[C('Mi allontano senza guardare.','A2',true),C('“Perché?”','A3'),D('Guardo dallo spioncino.','Il pianerottolo è vuoto. Poi un occhio si apre dall’altra parte dello spioncino, troppo vicino per appartenere a qualcuno in piedi.') ]},
A2:{msgs:[M('Fai due passi indietro.','sys'),M('La maniglia si abbassa una volta. Poi torna su.','sys',650),M('Sotto la porta compare il bordo di una fotografia.','sys')],choices:[C('Raccolgo la fotografia.','A4',true),C('La lascio dov’è e fotografo la porta.','A5',true)]},
A3:{msgs:[M('Perché la seconda volta vedrai qualcosa che ti riconosce.','them'),M('Sotto la porta scivola una fotografia.','sys',650)],choices:[C('Raccolgo la fotografia.','A4',true),D('Guardo comunque dallo spioncino.','Questa volta nello spioncino vedi il tuo stesso occhio. Sbatti le palpebre. Quello dall’altra parte no.') ]},
A4:{msgs:[M('La foto mostra il tuo ingresso.','sys'),M('Sei davanti alla porta, esattamente come adesso.','sys'),M('Ma nella foto la porta è aperta.','sys',650)],choices:[C('Confronto la foto con la porta senza voltarmi.','A6',true),D('Apro la porta per controllare.','La fotografia cade dalle tue dita. Dietro la porta c’è di nuovo il tuo ingresso, con te stesso dall’altra parte.') ]},
A5:{msgs:[M('Scatti una foto.','sys'),M('Nell’immagine la porta è socchiusa. Davanti a te, invece, è ancora chiusa.','sys',700)],choices:[C('Salvo la foto e resto lontano.','A6',true),D('Mi avvicino per controllare la serratura.','La serratura scatta. Non dall’esterno. Qualcosa gira la chiave dalla tua parte della porta.') ]},
A6:{msgs:[M('Il numero sconosciuto invia un allegato.','sys'),M('È la stessa fotografia. Il timestamp è di domani.','them',650),M('«Questa volta non l’hai aperta.»','them')],choices:[C('Conservo la fotografia.','A_END',true)]},
A_END:{msgs:[M('Dietro la porta i passi si allontanano.','sys'),M('Per la prima volta capisci che non tutto ciò che è fuori sta cercando di entrare. Qualcosa voleva soltanto che fossi tu ad aprire.','sys',700)],end:true},

// RAMO B — IL NUMERO SCONOSCIUTO / SPECCHIO
B1:{msgs:[M('Se te lo dicessi adesso non mi crederesti.','them'),M('Fammi una domanda di cui solo tu puoi conoscere la risposta.','them',600)],choices:[C('“Dimmi dove sono adesso.”','B2'),C('“Dimostrami che mi conosci.”','B3')]},
B2:{msgs:[M('Sei nel corridoio. La luce del bagno è spenta.','them'),M('E tra pochi secondi si accenderà da sola.','them',600),M('CLICK.','sys',900)],choices:[C('Vado in bagno senza accendere altre luci.','B4',true),D('Spengo anche la luce del corridoio.','Nel buio senti il tuo telefono vibrare. Poi una seconda vibrazione risponde dalla tasca dei tuoi pantaloni, anche se lì non hai nulla.') ]},
B3:{msgs:[M('Sul polso sinistro hai un segno che non avevi quando sei andato a dormire.','them'),M('Non guardarlo qui. Vai davanti allo specchio.','them')],choices:[C('Vado allo specchio.','B4',true),D('Guardo subito il polso.','Il graffio sul polso forma lentamente quattro cifre: 00:48. Quando provi a strofinarle, la pelle sotto le dita si muove.') ]},
B4:{msgs:[M('Nello specchio distingui appena il tuo viso.','sys'),M('Il riflesso tiene il telefono nella mano opposta alla tua.','sys',700)],choices:[C('Resto immobile e osservo il riflesso.','B5',true),C('“Sei tu nello specchio?”','B6')]},
B5:{msgs:[M('Tu resti fermo. Il riflesso abbassa lentamente lo sguardo.','sys'),M('Con un dito scrive sulla condensa: “NON È LA PRIMA”.','sys',700)],choices:[C('Fotografo la scritta senza avvicinarmi.','B7',true),D('Tocco lo specchio.','La superficie cede come acqua fredda. Il tuo riflesso afferra il polso prima che tu riesca a ritrarre la mano.') ]},
B6:{msgs:[M('No.','them'),M('Ma io l’ho già visto fare quello che stai vedendo tu.','them'),M('Non lasciargli capire che hai capito.','them',650)],choices:[C('Fingo di non aver notato nulla e scatto una foto.','B7',true)]},
B7:{msgs:[M('Nella foto il tuo riflesso non c’è.','sys'),M('Al suo posto compare la schermata di questa chat, aperta su un messaggio che non hai ancora ricevuto.','sys',700),M('«Ricordati di me quando ricomincia.»','them')],choices:[C('Conservo la foto.','B_END',true)]},
B_END:{msgs:[M('La luce del bagno si spegne.','sys'),M('Quando torna, lo specchio riflette di nuovo soltanto te. Ma adesso hai una prova che il numero sconosciuto conosce una versione della notte che tu non hai ancora vissuto.','sys',700)],end:true},

// RAMO C — IGNORARE / CAMERA
C1:{msgs:[M('Posi il telefono.','sys'),M('Per quasi un minuto non succede nulla.','sys',700),M('Poi senti il materasso della camera scricchiolare.','sys')],choices:[C('Guardo dalla soglia.','C2',true),C('Chiudo la porta della camera senza guardare dentro.','C3',true)]},
C2:{msgs:[M('Sul letto c’è un secondo telefono acceso.','sys'),M('Sta mostrando la stessa conversazione, ma è qualche messaggio più avanti.','sys',700)],choices:[C('Leggo lo schermo restando sulla soglia.','C4',true),D('Entro e prendo il telefono.','Appena tocchi il secondo telefono, quello nella tua mano si spegne. Dal corridoio arriva la tua voce: «Finalmente.»') ]},
C3:{msgs:[M('Chiudi la porta.','sys'),M('Dall’interno qualcuno prova immediatamente la maniglia. Una volta. Due.','sys',650),M('Il tuo telefono si riaccende da solo.','sys')],choices:[C('Tengo chiusa la porta e leggo il messaggio.','C5',true),D('Riapro per vedere chi c’è.','La stanza è vuota. Sul letto, però, c’è qualcuno sotto le coperte con la tua stessa altezza. La porta si chiude alle tue spalle.') ]},
C4:{msgs:[M('Sul secondo telefono leggi: «QUANDO SENTI LA SEDIA, NON GUARDARE IN ALTO.»','sys'),M('Un istante dopo, sopra di te, una sedia viene trascinata sul pavimento.','sys',900),M('Tu non hai un piano di sopra.','them')],choices:[C('Tengo gli occhi bassi e fotografo il secondo telefono.','C6',true),D('Guardo il soffitto.','Una crepa si apre esattamente sopra di te. Non cade intonaco. Cade una ciocca dei tuoi capelli.') ]},
C5:{msgs:[M('«Non aprirla più.»','them'),M('«Qualunque cosa ci sia dentro, ha bisogno che tu la veda per uscire.»','them',650),M('La maniglia smette di muoversi.','sys')],choices:[C('Registro il suono dietro la porta.','C6',true)]},
C6:{msgs:[M('Il file che hai creato cambia nome da solo.','sys'),M('DOMANI_0001.','sys',600),M('La data del file è di ventiquattro ore nel futuro.','sys')],choices:[C('Conservo il file senza riaprire la camera.','C_END',true)]},
C_END:{msgs:[M('Dalla camera non arriva più alcun rumore.','sys'),M('Hai ignorato il primo ordine, ma hai scoperto qualcosa che l’altra versione di te non ti aveva detto: certe cose diventano reali soltanto quando scegli di guardarle.','sys',700)],end:true},

// RAMO D — RETE / CHIAMATA
D1:{msgs:[M('Nessun servizio.','sys'),M('La chiamata al 112 non parte.','sys',600),M('Poi il telefono squilla. Chiamata in arrivo: 112.','sys',850)],choices:[C('Rispondo senza parlare.','D2',true),C('Rifiuto la chiamata.','D3',true)]},
D2:{msgs:[M('Dall’altra parte senti il rumore della tua casa.','sys'),M('Poi la tua voce, molto lontana: «Non dire dove sei.»','sys',700)],choices:[C('Resto in silenzio e ascolto.','D4',true),D('“Sono a casa.”','La linea diventa perfettamente nitida. Una voce diversa risponde: «Lo sappiamo.» Nello stesso istante qualcuno bussa alla finestra.') ]},
D3:{msgs:[M('Rifiuti. Il telefono squilla di nuovo.','sys'),M('Questa volta il numero chiamante è il tuo.','sys',650)],choices:[C('Lascio squillare e registro lo schermo.','D5',true),D('Rispondo.','Per alcuni secondi senti solo silenzio. Poi la tua stessa voce sussurra il tuo nome dalla stanza alle tue spalle.') ]},
D4:{msgs:[M('La tua voce nella chiamata continua: «Se mi senti, io sono dopo di te.»','sys'),M('«Non so quanto dopo.»','sys'),M('La linea cade.','sys',600)],choices:[C('Controllo i dettagli della chiamata.','D6',true)]},
D5:{msgs:[M('La registrazione dura undici secondi.','sys'),M('Quando la riguardi, sullo schermo compare una chiamata che tu non hai visto: “IERI — 00:01”.','sys',700)],choices:[C('Salvo la registrazione.','D6',true)]},
D6:{msgs:[M('Nel registro chiamate compare una voce impossibile.','sys'),M('Durata: 47:00. Stato: “ancora in corso”.','sys',700),M('Il numero sconosciuto scrive: «Adesso sai che la rete non c’entra.»','them')],choices:[C('Conservo il registro e non richiamo.','D_END',true)]},
D_END:{msgs:[M('Il segnale resta assente.','sys'),M('Eppure il telefono continua a ricevere. Hai una prova che qualunque cosa stia collegando le due estremità della notte non passa dalla rete cellulare.','sys',700)],end:true},

// RAMO E — MURO / QUATTRO COLPI
E1:{msgs:[M('La vibrazione non viene dal telefono.','sys'),M('Viene dalla parete del corridoio.','sys',650),M('Appoggi l’orecchio al muro.','sys')],choices:[C('Resto ad ascoltare.','E2',true),C('Busso una volta.','E3',true)]},
E2:{msgs:[M('TOC. TOC. TOC.','sys',900),M('Tre colpi dall’interno della parete.','sys'),M('Poi silenzio.','sys')],choices:[C('Busso quattro volte.','E4',true),C('Non rispondo ai colpi.','E5',true)]},
E3:{msgs:[M('Il tuo colpo viene ripetuto dall’altra parte.','sys',650),M('Poi altri due. Tre colpi in totale.','sys'),M('Il numero sconosciuto scrive immediatamente.','sys'),M('Non completare la sequenza.','them')],choices:[C('Busso altre tre volte: quattro in totale.','E4',true),C('Mi fermo.','E5',true)]},
E4:{msgs:[M('TOC. TOC. TOC. TOC.','me',300),M('Per qualche secondo non accade nulla.','sys',700),M('Poi quattro colpi rispondono. Ma arrivano dalla parete opposta.','sys',850)],choices:[C('Seguo i colpi lungo il corridoio.','E6',true),D('Busso altre quattro volte.','La risposta arriva prima del tuo ultimo colpo. Poi qualcosa bussa una quinta volta, dall’interno del muro proprio accanto al tuo orecchio.') ]},
E5:{msgs:[M('Non rispondi.','sys'),M('I tre colpi ricominciano, più lontani, e si spostano lungo la parete.','sys',750),M('Sul telefono compare per un istante una chiamata verso il tuo stesso numero.','sys')],choices:[C('Seguo il punto in cui si sposta il rumore.','E7',true)]},
E6:{msgs:[M('I quattro colpi terminano davanti a una porzione di muro senza crepe.','sys'),M('Una linea sottile compare nell’intonaco e disegna lentamente un rettangolo alto quanto una porta.','sys',800)],choices:[C('Fotografo la forma senza toccarla.','E8',true),D('Premo la mano sulla crepa.','Il muro è caldo. La crepa si apre sotto il palmo e dall’altra parte qualcuno appoggia la propria mano contro la tua.') ]},
E7:{msgs:[M('Il rumore si ferma.','sys'),M('Nel punto esatto in cui termina compare una piccola crepa.','sys',650),M('Dal muro arriva una vibrazione identica a quella di un messaggio.','sys')],choices:[C('Registro il suono e la crepa.','E8',true)]},
E8:{msgs:[M('Riguardi ciò che hai registrato.','sys'),M('Nell’immagine la crepa forma quattro segni verticali che a occhio nudo non esistono.','sys',700),M('Il numero sconosciuto scrive: «Quattro. Finalmente li hai sentiti anche tu.»','them')],choices:[C('Conservo la registrazione.','E_END',true)]},
E_END:{msgs:[M('La crepa smette di crescere.','sys'),M('I colpi non tornano. Hai trovato una regola che non appartiene alla porta, allo specchio o alla rete: qualcosa dentro le pareti ricorda quante volte gli rispondi.','sys',750)],end:true}
};
async function start(){if(S.started)return;S.started=true;S.startAt=Date.now();save();$('#overlay').classList.add('hidden');startClock();go('intro')}
const menuPanel=$('#menuPanel'),confirmPanel=$('#confirmPanel');let confirmAction=null;
$('#menuBtn').addEventListener('click',()=>menuPanel.classList.remove('hidden'));
$('#menuClose').addEventListener('click',()=>menuPanel.classList.add('hidden'));
function ask(kind){menuPanel.classList.add('hidden');confirmAction=kind;$('#confirmTitle').textContent=kind==='all'?'CANCELLARE TUTTO?':'RIAVVIARE IL LOOP?';$('#confirmText').textContent=kind==='all'?'Cancella anche i progressi conservati tra i loop. Non può essere annullato.':'Usalo se la partita sembra bloccata. Il loop corrente ripartirà dalle 00:01:00.';$('#confirmYes').textContent=kind==='all'?'CANCELLA TUTTO':'RIAVVIA';confirmPanel.classList.remove('hidden')}
$('#loopReset').addEventListener('click',()=>ask('loop'));$('#fullReset').addEventListener('click',()=>ask('all'));
$('#confirmNo').addEventListener('click',()=>{confirmPanel.classList.add('hidden');confirmAction=null});
$('#confirmYes').addEventListener('click',()=>{const a=confirmAction;confirmPanel.classList.add('hidden');a==='all'?resetAll():resetLoop()});
$('#start').addEventListener('click',start);$('#restart').addEventListener('click',resetLoop);
$('#notify').addEventListener('click',async()=>{try{if(!('Notification'in window))throw 0;const p=await Notification.requestPermission();$('#notify').textContent=p==='granted'?'NOTIFICHE ATTIVE':'NOTIFICHE NON DISPONIBILI'}catch(_){$('#notify').textContent='NOTIFICHE NON DISPONIBILI'}});
// Gli errori esterni/iniettati dal browser non vengono mostrati nella chat di gioco.
// Una partita lasciata a metà viene riavviata in modo pulito: niente ricostruzioni parziali della chat.
try{const old=JSON.parse(localStorage.getItem(KEY));if(old&&old.started&&!old.chapterDone&&!old.ending){localStorage.removeItem(KEY)}}catch(_){localStorage.removeItem(KEY)}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(r=>r.update()).catch(()=>{});
