'use strict';
const $=s=>document.querySelector(s);
const chat=$('#chat'), choices=$('#choices'), clock=$('#clock'), hubClock=$('#hubClock');
const hubScreen=$('#hubScreen'), chatScreen=$('#chatScreen'), galleryScreen=$('#galleryScreen'), threadList=$('#threadList');
const contactName=$('#contactName'), contactStatus=$('#status'), toast=$('#messageToast'), headerAvatar=document.querySelector('.chatHeader .avatar');
const galleryFab=$('#galleryFab'), backGallery=$('#backGallery'), galleryGrid=$('#galleryGrid'), galleryEmpty=$('#galleryEmpty'), galleryClock=$('#galleryClock');
const mediaViewer=$('#mediaViewer'), mediaFull=$('#mediaFull'), mediaAudio=$('#mediaAudio'), audioViewerCard=$('#audioViewerCard'), audioViewerDuration=$('#audioViewerDuration'), mediaTitle=$('#mediaTitle'), mediaMeta=$('#mediaMeta'), closeMedia=$('#closeMedia');
const KEY='nonaprire_v10_state', META='nonaprire_v10_meta', GALLERY_KEY='nonaprire_v10_gallery';
const START=60, END=48*60, LIMIT=(END-START)*1000;
let S={started:false,alive:true,ending:false,chapterDone:false,startAt:0,node:'intro',history:[],loops:0,threads:{},activeThread:null,storyBegun:false,firstMessageSent:false};
let clockTimer=null, deadlineTimer=null, busy=false, deathTimer=null, firstMessageTimer=null, toastTimer=null;
const choiceState={};
let unlockedMedia=[];
try{const g=JSON.parse(localStorage.getItem(GALLERY_KEY));if(Array.isArray(g))unlockedMedia=g}catch(_){}
const THREAD_META={
  unknown:{title:'NUMERO SCONOSCIUTO',status:'offline',avatar:'default'},
  anomaly:{title:'⌁¤⊘//?⌁',status:'online',avatar:'glitch'}
};
const MEDIA_CATALOG={
  window:{id:'window',src:'./scene-window.jpg',title:'Finestra',kind:'immagine ricevuta',mediaType:'image'},
  entry_photo_1:{id:'entry_photo_1',src:'./entry-photo-1.png',title:'Foto 1',kind:'immagine ricevuta',mediaType:'image'},
  entry_photo_2:{id:'entry_photo_2',src:'./entry-photo-2.png',title:'Foto 2',kind:'immagine ricevuta',mediaType:'image'},
  room_photo_bed:{id:'room_photo_bed',src:'./room-photo-bed.jpg',title:'Foto camera',kind:'foto scattata',mediaType:'image'},
  breath_20260929:{id:'breath_20260929',src:'./respiro_00_03.wav',title:'Registrazione',kind:'audio registrato',mediaType:'audio',dateLabel:'2026-09-29',durationLabel:'-00:03'},
  breath_20260930:{id:'breath_20260930',src:'./respiro_00_03.wav',title:'Registrazione',kind:'audio ricevuto',mediaType:'audio',dateLabel:'2026-09-30',durationLabel:'-00:03'}
};
function saveGallery(){try{localStorage.setItem(GALLERY_KEY,JSON.stringify(unlockedMedia))}catch(_){}}
function unlockMedia(id,overrides={}){const base=MEDIA_CATALOG[id]||{id,...overrides};const item={...base,...overrides,id};if(!item.src)return false;if(!unlockedMedia.some(x=>x.id===id)){unlockedMedia.push({...item,unlockedAt:gameSec()});saveGallery();if(!galleryScreen.classList.contains('hidden'))renderGallery();return true}return false}
window.unlockGameMedia=unlockMedia;
try{const m=JSON.parse(localStorage.getItem(META));if(m&&Number.isFinite(m.loops))S.loops=m.loops}catch(_){}
function normalizeState(){if(!S.threads||typeof S.threads!=='object')S.threads={};if(!('activeThread' in S))S.activeThread=null;if(!('storyBegun' in S))S.storyBegun=false;if(!('firstMessageSent' in S))S.firstMessageSent=false}
normalizeState();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(_){}}
function elapsed(){return S.started?Math.max(0,Date.now()-S.startAt):0}
function gameSec(){return Math.min(END,START+Math.floor(elapsed()/1000))}
function fmt(n){const h=Math.floor(n/3600),m=Math.floor(n%3600/60),s=n%60;return [h,m,s].map(x=>String(x).padStart(2,'0')).join(':')}
function shortTime(n){const m=Math.floor(n%3600/60),s=n%60;return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
function updateClock(){const t=fmt(gameSec());if(clock)clock.textContent=t;if(hubClock)hubClock.textContent=t;if(galleryClock)galleryClock.textContent=t;if(S.started&&S.alive&&!S.ending&&!S.chapterDone&&elapsed()>=LIMIT)deadlineDeath()}
function startClock(){clearInterval(clockTimer);clearTimeout(deadlineTimer);clockTimer=setInterval(updateClock,250);deadlineTimer=setTimeout(deadlineDeath,Math.max(0,LIMIT-elapsed()+50));updateClock()}
function stopTimers(){clearInterval(clockTimer);clearTimeout(deadlineTimer);clearTimeout(firstMessageTimer);if(deathTimer)clearInterval(deathTimer);clockTimer=deadlineTimer=deathTimer=firstMessageTimer=null}
function scrollBottom(){requestAnimationFrame(()=>{if(chat)chat.scrollTop=chat.scrollHeight})}
function makeThread(id,title,status='offline',avatar){
  const meta=THREAD_META[id]||{title:id,status:'offline',avatar:'default'};
  if(!S.threads[id])S.threads[id]={id,title:title||meta.title,status:status||meta.status,avatar:avatar||meta.avatar||'default',messages:[],unread:0,lastAt:gameSec()};
  if(!S.threads[id].title)S.threads[id].title=title||meta.title;
  if(!S.threads[id].status)S.threads[id].status=status||meta.status;
  if(!S.threads[id].avatar)S.threads[id].avatar=avatar||meta.avatar||'default';
  return S.threads[id]
}
function mediaById(id){return unlockedMedia.find(x=>x.id===id)||MEDIA_CATALOG[id]||null}
function applyThreadIdentity(t){
  contactName.textContent=t.title;
  contactStatus.textContent=t.status||'offline';
  if(headerAvatar)headerAvatar.className='avatar'+((t.avatar==='glitch')?' glitch':'');
}
function threadHasMedia(threadId,mediaId){const t=S.threads[threadId];return !!(t&&t.messages&&t.messages.some(m=>m.mediaId===mediaId))}
function deliverAnomalyPhoto(which='entry_photo_1'){
  makeThread('anomaly');
  const item=MEDIA_CATALOG[which];
  if(!item||threadHasMedia('anomaly',which))return false;
  pushImageMessage('anomaly',which,{title:item.title,kind:item.kind},'them');
  return true;
}
function messageEl(m){
  if(m.mediaId){
    const item=mediaById(m.mediaId);
    if(item&&item.mediaType==='audio'){
      const wrap=document.createElement('div');
      wrap.className='msgAudio '+(m.who||'them');
      wrap.innerHTML='<div class="audioTop"><span class="audioGlyph">◉</span><strong></strong><span class="audioDuration"></span></div><audio controls preload="metadata"></audio><div class="audioDate"></div>';
      wrap.querySelector('strong').textContent=item.title||'Registrazione';
      wrap.querySelector('.audioDuration').textContent=item.durationLabel||'-00:03';
      wrap.querySelector('.audioDate').textContent=item.dateLabel||'';
      const audio=wrap.querySelector('audio');audio.src=item.src;audio.setAttribute('aria-label',(item.title||'Audio')+' '+(item.dateLabel||''));
      return wrap;
    }
    const wrap=document.createElement('button');wrap.type='button';wrap.className='msgMedia '+(m.who||'them');wrap.setAttribute('aria-label','Apri immagine '+((item&&item.title)||''));if(item){wrap.innerHTML='<img alt=""><span class="msgMediaMeta">📷 <b></b></span>';wrap.querySelector('img').src=item.src;wrap.querySelector('img').alt=item.title||'Immagine ricevuta';wrap.querySelector('b').textContent=item.title||'Foto';wrap.addEventListener('click',()=>openMedia(item))}return wrap
  }
  const d=document.createElement('div');d.className='msg '+(m.who||'sys');d.textContent=m.text;return d
}
function threadPreview(t){if(!t.messages.length)return 'Nuova conversazione';const m=t.messages[t.messages.length-1];if(m.mediaId){const item=mediaById(m.mediaId);return (m.who==='me'?'Tu: ':'')+((item&&item.mediaType==='audio')?'🎧 Audio':'📷 Foto')}return (m.who==='me'?'Tu: ':'')+(m.text||'').replace(/\s+/g,' ').slice(0,90)}
function renderHub(){threadList.replaceChildren();const arr=Object.values(S.threads).sort((a,b)=>(b.lastAt||0)-(a.lastAt||0));if(!arr.length){const e=document.createElement('div');e.id='emptyHub';e.className='emptyHub';e.innerHTML='<span class="emptyHubIcon" aria-hidden="true">•••</span><strong>Nessuna conversazione</strong><small>I nuovi messaggi compariranno qui.</small>';threadList.appendChild(e);return}for(const t of arr){const b=document.createElement('button');b.type='button';b.className='threadRow';b.dataset.thread=t.id;const unread=t.unread?'<span class="unreadBadge">'+Math.min(99,t.unread)+'</span>':'<span class="threadChevron">›</span>';b.innerHTML='<span class="threadAvatar" aria-hidden="true"></span><span class="threadMain"><span class="threadTop"><span class="threadName"></span><span class="threadTime"></span></span><span class="threadPreview"></span></span><span class="threadMeta">'+unread+'</span>';const avatarEl=b.querySelector('.threadAvatar');if(t.avatar==='glitch')avatarEl.classList.add('glitch');b.querySelector('.threadName').textContent=t.title;b.querySelector('.threadTime').textContent=shortTime(t.lastAt||gameSec());b.querySelector('.threadPreview').textContent=threadPreview(t);b.addEventListener('click',()=>openThread(t.id));threadList.appendChild(b)}}
function renderGallery(){galleryGrid.replaceChildren();if(!unlockedMedia.length){galleryEmpty.classList.remove('hidden');return}galleryEmpty.classList.add('hidden');for(const item of unlockedMedia.slice().reverse()){const b=document.createElement('button');b.type='button';b.className='galleryTile'+(item.mediaType==='audio'?' audioTile':'');if(item.mediaType==='audio'){b.innerHTML='<span class="galleryAudioIcon">◉</span><strong class="galleryAudioTitle"></strong><small class="galleryAudioDate"></small><span class="galleryBadge"></span>';b.querySelector('.galleryAudioTitle').textContent=item.durationLabel||'-00:03';b.querySelector('.galleryAudioDate').textContent=item.dateLabel||''}else{b.innerHTML='<img alt=""><span class="galleryBadge"></span>';const img=b.querySelector('img');img.src=item.src;img.alt=item.title||'Immagine sbloccata'}b.querySelector('.galleryBadge').textContent=item.kind||'file';b.addEventListener('click',()=>openMedia(item));galleryGrid.appendChild(b)}}
function openGallery(){S.activeThread=null;chatScreen.classList.add('hidden');hubScreen.classList.add('hidden');galleryScreen.classList.remove('hidden');renderGallery();updateClock();save()}
function openMedia(item){
  const isAudio=item.mediaType==='audio';
  mediaFull.classList.toggle('hidden',isAudio);audioViewerCard.classList.toggle('hidden',!isAudio);
  if(isAudio){mediaFull.removeAttribute('src');mediaAudio.src=item.src;audioViewerDuration.textContent=item.durationLabel||'-00:03'}else{mediaAudio.pause();mediaAudio.removeAttribute('src');mediaFull.src=item.src;mediaFull.alt=item.title||'Immagine'}
  mediaTitle.textContent=item.title|| (isAudio?'Audio':'Immagine');
  const date=item.dateLabel?(' · '+item.dateLabel):'';mediaMeta.textContent=(item.kind||'file')+date;
  mediaViewer.classList.remove('hidden')
}
function closeMediaViewer(){mediaViewer.classList.add('hidden');mediaAudio.pause();mediaAudio.removeAttribute('src');mediaFull.removeAttribute('src');mediaTitle.textContent='';mediaMeta.textContent=''}
function renderChoiceDOM(list){choices.replaceChildren();if(!list||S.ending||S.chapterDone)return;for(const c of list){const b=document.createElement('button');b.type='button';b.className='choice '+(c.action?'action':'');b.textContent=c.label;b.addEventListener('click',()=>pick(c),{once:true});choices.appendChild(b)}}
function renderThread(id){const t=S.threads[id];if(!t)return;chat.replaceChildren();for(const m of t.messages)chat.appendChild(messageEl(m));applyThreadIdentity(t);renderChoiceDOM(choiceState[id]||[]);scrollBottom()}
function openHub(){S.activeThread=null;chatScreen.classList.add('hidden');galleryScreen.classList.add('hidden');mediaViewer.classList.add('hidden');hubScreen.classList.remove('hidden');renderHub();save()}
function openThread(id){const t=S.threads[id];if(!t)return;S.activeThread=id;t.unread=0;hubScreen.classList.add('hidden');galleryScreen.classList.add('hidden');mediaViewer.classList.add('hidden');chatScreen.classList.remove('hidden');renderThread(id);save();if(id==='unknown'&&!S.storyBegun&&!S.ending&&!S.chapterDone){S.storyBegun=true;save();setTimeout(()=>go('intro'),260)}}
function showToast(t,m){
  if(S.activeThread===t.id||!S.started)return;
  clearTimeout(toastTimer);
  const isAnomaly=t.id==='anomaly';
  toast.className='messageToast'+(isAnomaly?' anomalyToast':'');
  toast.innerHTML='<div class="toastAvatar" aria-hidden="true"></div><div class="toastCopy"><strong></strong><span></span></div>';
  toast.querySelector('strong').textContent=t.title;
  toast.querySelector('span').textContent=m.text||'Nuovo messaggio';
  if(isAnomaly)toast.querySelector('.toastAvatar').classList.add('glitch');
  toast.classList.remove('hidden');
  try{if(isAnomaly&&navigator.vibrate)navigator.vibrate([90,55,90])}catch(_){}
  toastTimer=setTimeout(()=>toast.classList.add('hidden'),isAnomaly?2900:2400)
}
function pushMessage(threadId,text,who='sys'){const t=makeThread(threadId);const m={text,who,at:gameSec()};t.messages.push(m);t.lastAt=m.at;if(S.activeThread===threadId&&!chatScreen.classList.contains('hidden')){chat.appendChild(messageEl(m));scrollBottom()}else{t.unread=(t.unread||0)+1;renderHub();showToast(t,m)}save();return m}
function add(text,who='sys',delay=0,threadId='unknown'){return new Promise(resolve=>setTimeout(()=>{if(text)pushMessage(threadId,text,who);resolve()},delay))}
function pushImageMessage(threadId,id,overrides={},who='them'){unlockMedia(id,overrides);const item=mediaById(id);if(!item)return null;const t=makeThread(threadId);const m={mediaId:id,who,at:gameSec()};t.messages.push(m);t.lastAt=m.at;if(S.activeThread===threadId&&!chatScreen.classList.contains('hidden')){chat.appendChild(messageEl(m));scrollBottom()}else{t.unread=(t.unread||0)+1;renderHub();showToast(t,{text:'Ti ha inviato una nuova foto.'})}save();return m}
window.sendGameImage=pushImageMessage;
function pushAudioMessage(threadId,id,overrides={},who='them'){unlockMedia(id,overrides);const item=mediaById(id);if(!item)return null;const t=makeThread(threadId);const m={mediaId:id,who,at:gameSec()};t.messages.push(m);t.lastAt=m.at;if(S.activeThread===threadId&&!chatScreen.classList.contains('hidden')){chat.appendChild(messageEl(m));scrollBottom()}else{t.unread=(t.unread||0)+1;renderHub();showToast(t,{text:'Ti ha inviato un nuovo audio.'})}save();return m}
window.sendGameAudio=pushAudioMessage;
function clearChoices(threadId='unknown'){choiceState[threadId]=[];if(S.activeThread===threadId)choices.replaceChildren()}
function renderChoices(list,threadId='unknown'){choiceState[threadId]=list||[];if(S.activeThread===threadId)renderChoiceDOM(choiceState[threadId])}
async function pick(c){if(busy||S.ending||S.chapterDone)return;busy=true;const threadId=S.activeThread||'unknown';const label=c.label;clearChoices(threadId);S.history.push({node:S.node,choice:label,at:gameSec(),thread:threadId});save();await add(label,'me',0,threadId);if(c.death){busy=false;return die(c.death)}if(c.run){busy=false;return c.run()}if(c.end){busy=false;return chapterEnd()}busy=false;return go(c.next)}
async function go(id){if(S.ending||S.chapterDone)return;const node=NODES[id];if(!node){return failSafe('Il filo della conversazione si interrompe. Il telefono vibra una volta, poi compare un nuovo messaggio.')}const threadId=node.thread||'unknown';S.node=id;save();clearChoices(threadId);for(const m of node.msgs){await add(m.text,m.who||'sys',m.delay??420,threadId)}if(node.effect)await node.effect();if(node.end)return chapterEnd();if(!node.choices||node.choices.length===0)return failSafe('Per qualche secondo non succede nulla. Poi il numero sconosciuto scrive di nuovo.');renderChoices(node.choices,threadId)}
async function failSafe(text){await add(text,'sys',500,'unknown');await add('Non restare fermo. Vai verso l’ingresso.','them',450,'unknown');renderChoices([{label:'Vado verso l’ingresso.',action:true,next:'entry_final'},{label:'Resto dove sono e ascolto.',action:true,next:'listen_final'}],'unknown')}
function contextualDeadline(){const n=S.node;if(/bed|room|mirror/.test(n))return 'Alle 00:48 lo schermo nella camera si accende. Nel vetro nero compare il tuo riflesso, ma continua a muoversi quando tu ti fermi.';if(/door|entry/.test(n))return 'Alle 00:48 la serratura scatta. Non dall’esterno. La porta si apre lentamente verso di te e, dietro, c’è il corridoio di casa tua.';if(/wall|listen|ceiling/.test(n))return 'Alle 00:48 i colpi tornano. Non arrivano più dalla parete: arrivano da dentro il telefono che tieni in mano.';return 'Alle 00:48 tutti i rumori cessano. Nel display vedi per un istante qualcuno fermo esattamente alle tue spalle.'}
async function deadlineDeath(){if(!S.started||!S.alive||S.ending||S.chapterDone)return;await die(contextualDeadline())}
async function die(text){if(S.ending||S.chapterDone)return;S.ending=true;S.alive=false;clearChoices('unknown');clearTimeout(deadlineTimer);save();if(S.threads.unknown)openThread('unknown');await add(text,'sys',450,'unknown');const box=document.createElement('div');box.className='deadBattery';box.innerHTML='<div class="deadBatteryRow"><span class="deadBatteryIcon" aria-hidden="true">🪫</span><div><strong>BATTERIA SCARICA</strong><span>0%</span></div></div><p class="deathCountdown">Il loop ricomincia tra <b>15</b> secondi…</p><small>Puoi scorrere la chat e rileggere cosa è successo.</small>';chat.appendChild(box);scrollBottom();let left=15;const n=box.querySelector('b');deathTimer=setInterval(()=>{left--;if(n)n.textContent=Math.max(0,left);if(left<=0){clearInterval(deathTimer);deathTimer=null;resetLoop()}},1000)}
async function chapterEnd(){if(S.chapterDone||S.ending)return;S.chapterDone=true;clearChoices('unknown');stopTimers();save();if(S.threads.unknown)openThread('unknown');await add('Il telefono smette di vibrare. Per la prima volta dall’inizio della notte, il silenzio non sembra una minaccia.','sys',600,'unknown');const box=document.createElement('div');box.className='chapterEnd';box.innerHTML='<strong>CAPITOLO 1 COMPLETATO</strong><p>Hai raggiunto la fine del contenuto disponibile.</p><small>Il Capitolo 2 è ancora in sviluppo.</small>';chat.appendChild(box);scrollBottom();const b=document.createElement('button');b.type='button';b.className='choice';b.textContent='RICOMINCIA IL CAPITOLO 1';b.addEventListener('click',resetLoop,{once:true});choices.appendChild(b)}
function resetLoop(){stopTimers();const loops=(S.loops||0)+1;try{localStorage.setItem(META,JSON.stringify({loops}))}catch(_){}localStorage.removeItem(KEY);location.reload()}
function resetAll(){stopTimers();localStorage.removeItem(KEY);localStorage.removeItem(META);localStorage.removeItem(GALLERY_KEY);location.reload()}
const C=(label,next,action=false)=>({label,next,action});
const D=(label,death,action=true)=>({label,death,action});
const M=(text,who='sys',delay=420)=>({text,who,delay});
const NODES={
intro:{msgs:[M('Controlla la porta d’ingresso. Assicurati che sia chiusa.','them',650)],choices:[C('“Chi sei?”','who'),C('“Perché?”','why'),C('Controllo la porta.','door_check',true),C('Ignoro il messaggio.','ignore',true)]},
who:{msgs:[M('Non importa ancora.','them'),M('Tra poco sentirai tre colpi. Se la porta non è chiusa, non avremo molto tempo.','them',600)],choices:[C('“Come fai a saperlo?”','knows'),C('Controllo la porta.','door_check',true),C('Aspetto i colpi.','wait_knock',true)]},
why:{msgs:[M('Perché tra poco sentirai tre colpi.','them'),M('Qualunque voce sentirai dopo, non aprire.','them')],choices:[C('Controllo la porta.','door_check',true),C('Aspetto i colpi.','wait_knock',true),C('Provo a chiamare il 112.','call_112',true)]},
knows:{msgs:[M('Perché li ho già aspettati.','them'),M('La prima volta ho aperto.','them',550)],choices:[C('“La prima volta?”','first_time'),C('Controllo la porta.','door_check',true)]},
first_time:{msgs:[M('Non posso spiegartelo in un messaggio.','them'),M('Prima ascolta i colpi. Poi decidi se credermi.','them')],choices:[C('Controllo la porta.','door_check',true),C('Resto fermo e aspetto.','wait_knock',true)]},
call_112:{msgs:[M('Nessun servizio.','sys'),M('Il numero sconosciuto scrive prima che tu possa riprovare.','sys'),M('La rete non ti aiuterà stanotte.','them')],choices:[C('“Come lo sai?”','knows'),C('Controllo la porta.','door_check',true),D('Apro la porta e cerco aiuto.','La maniglia scende prima che tu riesca a toccarla. La porta si apre verso l’interno. Dall’altra parte non c’è il pianerottolo.') ]},
door_check:{msgs:[M('La porta è chiusa a chiave.','sys'),M('TOC.  TOC.  TOC.','sys',1100),M('Allontanati dalla porta.','them')],choices:[C('Guardo dallo spioncino.','peephole',true),C('“Chi è?”','voice'),C('Mi allontano in silenzio.','back_away',true)]},
wait_knock:{msgs:[M('Aspetti.','sys'),M('TOC.  TOC.  TOC.','sys',1200),M('Adesso sai che non stavo indovinando.','them')],choices:[C('Guardo dallo spioncino.','peephole',true),C('“Chi è?”','voice'),C('Mi allontano in silenzio.','back_away',true)]},
ignore:{msgs:[M('Posi il telefono.','sys'),M('TOC.  TOC.  TOC.','sys',1200),M('Il telefono vibra di nuovo.','sys'),M('NON APRIRE.','them')],choices:[C('Guardo dallo spioncino.','peephole',true),C('Mi allontano dalla porta.','back_away',true),D('Apro la porta.','La porta si apre senza resistenza. Sul pianerottolo non c’è nessuno. Poi senti la porta chiudersi alle tue spalle.') ]},
peephole:{msgs:[M('Avvicini l’occhio allo spioncino.','sys'),M('Il pianerottolo è vuoto. Ma la luce davanti alla tua porta è spenta. Tutte le altre sono accese.','sys',650),M('Non guardare una seconda volta.','them')],choices:[C('Mi allontano.','hall_a',true),C('“Perché non devo guardare?”','proof'),D('Guardo di nuovo.','Lo spioncino è completamente nero. Poi qualcosa batte tre volte sul vetro, dall’interno.') ]},
voice:{msgs:[M('“Chi è?”','sys'),M('Dall’altra parte arriva la tua voce.','sys',700),M('«Sono io. Aprimi.»','sys',600),M('Non risponderle.','them')],choices:[C('Mi allontano senza parlare.','hall_a',true),C('“Sei tu quello fuori?”','proof'),D('“Dimmi qualcosa che solo io so.”','La voce dietro la porta risponde con una frase che ricordi di aver pensato, ma mai detto. La serratura scatta.') ]},
back_away:{msgs:[M('Ti allontani. I colpi cessano.','sys'),M('Dal fondo della casa arriva una vibrazione breve.','sys',700)],choices:[C('Controllo il corridoio.','hall_a',true),C('“Adesso dimmi chi sei.”','proof')]},
proof:{msgs:[M('Se te lo dicessi adesso, penseresti che sto mentendo.','them'),M('Vai in bagno. Guarda lo specchio, ma non accendere la luce.','them',600)],choices:[C('Vado in bagno.','bathroom',true),C('Non mi fido. Controllo il corridoio.','hall_a',true)]},
hall_a:{msgs:[M('Il corridoio è vuoto.','sys'),M('La porta della camera da letto è socchiusa. Prima era chiusa.','sys',650)],choices:[C('Guardo dentro senza entrare.','bed_glance',true),C('Vado in bagno.','bathroom',true),C('Cerco da dove arriva la vibrazione.','wall',true)]},
bathroom:{msgs:[M('Il bagno è buio. Nello specchio distingui appena il tuo viso.','sys'),M('Il telefono vibra.','sys'),M('Guarda la tua mano sinistra.','them')],choices:[C('Guardo la mano.','hand',true),C('Esco subito dal bagno.','hall_b',true)]},
hand:{msgs:[M('Sul polso c’è un’evidente bruciatura che non ricordi di esserti fatta.','sys'),M('Sul bordo dello specchio, nella condensa, qualcuno ha scritto: “NON È LA PRIMA”.','sys',700)],choices:[C('“Sei stato tu?”','identity'),C('Esco e controllo la camera.','bed_glance',true)]},
identity:{msgs:[M('Sì. Ma non stanotte.','them'),M('Sono te. Non quello che sei adesso.','them',650),M('Non devi credermi. Devi solo ricordare quello che vedi.','them')],choices:[C('“Cosa devo ricordare?”','remember'),C('Non gli credo. Esco dal bagno.','hall_b',true)]},
remember:{msgs:[M('Quale porta cambia posizione. Da dove arrivano i colpi. E cosa stai facendo quando l’orologio smette di essere dalla tua parte.','them')],choices:[C('Controllo la camera da letto.','bed_glance',true),C('Cerco da dove arrivano i colpi.','wall',true)]},
wall:{msgs:[M('Appoggi l’orecchio alla parete.','sys'),M('Senti un ronzio basso, come un telefono in vibrazione molto lontano.','sys',650),M('Poi tre colpi si spostano lungo il muro, verso la camera.','sys',700)],choices:[C('Seguo i colpi.','bed_glance',true),C('Mi sposto nella direzione opposta.','hall_b',true),C('Appoggio il telefono alla parete.','wall_phone',true)]},
wall_phone:{msgs:[M('Appoggi il telefono al muro.','sys'),M('Lo schermo si accende da solo. Per un istante compare una chiamata in uscita verso il tuo stesso numero.','sys',700),M('La chiamata termina prima che tu possa toccare nulla.','sys')],choices:[C('Vado verso la camera.','bed_glance',true),C('Vado verso l’ingresso.','entry_final',true)]},
bed_glance:{msgs:[M('Dalla soglia vedi il letto.','sys'),M('Sopra le coperte c’è un secondo telefono acceso.','sys',650),M('Sul suo schermo è aperta la stessa conversazione.','sys',600)],choices:[C('Resto sulla soglia e leggo lo schermo.','second_phone',true),C('Mi allontano dalla camera.','hall_b',true),D('Entro e prendo il secondo telefono.','Appena tocchi il secondo telefono, quello nella tua mano si spegne. Dal corridoio arriva la tua voce: «Finalmente.»') ]},
second_phone:{msgs:[M('Sullo schermo dell’altro telefono c’è un messaggio non ancora arrivato sul tuo.','sys'),M('«Quando senti la sedia, non guardare in alto.»','sys',650),M('Un secondo dopo, dal soffitto arriva il rumore di una sedia trascinata.','sys',850)],choices:[C('Non guardo in alto e torno nel corridoio.','hall_b',true),C('“Cosa c’è sopra di me?”','ceiling_answer'),D('Guardo il soffitto.','Una crepa compare esattamente sopra di te. Si apre come una palpebra. Qualcosa dall’altra parte guarda giù.') ]},
ceiling_answer:{msgs:[M('Nel mio appartamento non c’era niente.','them'),M('Nel tuo, adesso, non ne sono più sicuro.','them',600)],choices:[C('Mi allontano dalla camera.','hall_b',true),C('Vado verso l’ingresso.','entry_final',true)]},
hall_b:{msgs:[M('Le luci del corridoio si spengono una alla volta.','sys'),M('L’ultima rimasta accesa è quella vicino all’ingresso.','sys',700),M('Il numero sconosciuto scrive una sola frase.','sys'),M('Adesso scegli dove vuoi essere quando cambia tutto.','them')],choices:[C('Vado verso l’ingresso.','entry_final',true),C('Resto nel corridoio e ascolto.','listen_final',true),C('Torno davanti alla camera.','room_final',true),C('Torno alla parete da cui arrivava la vibrazione.','wall_final',true),C('Torno davanti allo specchio del bagno.','mirror_final',true)]},
entry_final:{msgs:[M('Raggiungi l’ingresso. La porta è ancora chiusa.','sys'),M('Il telefono vibra di nuovo. Ma non è il numero sconosciuto.','sys',700),M('Nell’hub compare una nuova conversazione.','sys',700)],effect:async()=>{deliverAnomalyPhoto('entry_photo_1')},choices:[C('Non mi volto. Salvo la foto.','entry_evidence',true),C('Mi volto subito.','entry_turn',true),C('“Cosa devo fare con questa foto?”','entry_question')]},
entry_question:{msgs:[M('Non te l’ho inviata io.','them'),M('Ma se è arrivata adesso, allora qualcuno ti sta già guardando da dentro il corridoio.','them',650),M('Non voltarti finché non hai deciso cosa farne.','them',650)],choices:[C('Non mi volto. Salvo la foto.','entry_evidence',true),C('Mi volto subito.','entry_turn',true)]},
entry_turn:{msgs:[M('Ti volti di scatto.','sys'),M('Il corridoio è vuoto.','sys',650),M('Un attimo dopo, la nuova conversazione si aggiorna da sola.','sys',700),M('Nella seconda foto sei girato verso l’obiettivo. Dietro di te c’è una sagoma.','sys',780)],effect:async()=>{deliverAnomalyPhoto('entry_photo_2')},choices:[C('Salvo anche la seconda foto.','entry_evidence',true),C('“Chi c’è dietro di me?”','entry_truth')]},
entry_evidence:{msgs:[M('Salvi la foto nella galleria del telefono.','sys'),M('Il numero sconosciuto risponde quasi subito.','sys',550),M('Bene. Adesso hai una prova che non dipende dalla porta.','them',650),M('Se la notte ricomincia, questa conversazione potrebbe comparire prima del resto.','them',650)],choices:[C('“Come può un’altra chat avermi fotografato?”','entry_truth')]},
entry_truth:{msgs:[M('Non lo so ancora.','them'),M('So solo che quel numero non apparteneva alla mia prima notte.','them',600),M('Il tuo telefono sta ricevendo cose che prima restavano dall’altra parte.','them',650),M('Conserva le foto. Se ricomincia tutto, saranno il primo scarto reale.','them',650)],choices:[C('Continuo a leggere.','entry_close',true)]},
entry_close:{msgs:[M('La fotografia resta nella galleria.','sys'),M('Quando torni alla chat, il numero sconosciuto non è più online.','sys',650),M('La porta rimane chiusa. Per ora.','sys')],end:true},
listen_final:{msgs:[M('Rimani fermo.','sys'),M('Senti due respirazioni: la tua e una seconda, sincronizzata con mezzo secondo di ritardo.','sys',750),M('Quando trattieni il fiato, l’altra continua.','sys',650)],choices:[C('Registro il suono con il telefono.','listen_evidence',true),D('Chiamo ad alta voce chiunque sia lì.','La seconda respirazione si interrompe. Una voce, vicinissima al tuo orecchio, risponde: «Eccomi.»'),C('Resto immobile e continuo ad ascoltare.','listen_deeper',true)]},
listen_deeper:{msgs:[M('Non ti muovi.','sys'),M('La seconda respirazione si allontana di qualche passo.','sys',650),M('Poi senti la tua voce, molto più avanti nel corridoio, sussurrare: «Registrami.»','sys',700)],choices:[C('Avvio la registrazione senza parlare.','listen_evidence',true),D('Seguo la mia voce nel buio.','Fai tre passi. Al quarto, il pavimento sotto il piede non c’è più. Eppure il corridoio davanti a te continua.') ]},
listen_evidence:{msgs:[M('Avvii la registrazione.','sys')],effect:async()=>{pushAudioMessage('unknown','breath_20260929',{},'me');await new Promise(r=>setTimeout(r,650));await add('Sul display l’onda sonora continua anche quando la casa è completamente silenziosa.','sys',0,'unknown');await add('Il file si salva con una durata impossibile: -00:03.','sys',650,'unknown');await new Promise(r=>setTimeout(r,500));pushAudioMessage('unknown','breath_20260930',{},'them')},choices:[C('“L’hai già sentito?”','listen_truth_heard'),C('“Perché la durata è negativa?”','listen_truth')]},
listen_truth_heard:{msgs:[M('Sì, perché è lo stesso audio.','them'),M('Perché non sta registrando quello che accade adesso.','them',650),M('Sta registrando qualcosa che deve ancora arrivare.','them',650)],choices:[C('Salvo il file.','listen_close',true)]},
listen_truth:{msgs:[M('Perché non sta registrando quello che accade adesso.','them'),M('Sta registrando qualcosa che deve ancora arrivare.','them',650)],choices:[C('Salvo il file.','listen_close',true)]},
listen_close:{msgs:[M('Metti il telefono in tasca senza interrompere la registrazione.','sys'),M('Per la prima volta, il secondo respiro si ferma, insieme al tuo audio.','sys',700),M('Il corridoio resta buio, ma non sei più costretto a seguirlo.','sys')],end:true},
room_final:{msgs:[M('Torni davanti alla camera. Il secondo telefono è ancora sul letto.','sys'),M('Lo schermo sfarfalla a intermittenza, come se faticasse a restare acceso.','sys',700),M('Dall’altoparlante esce un rumore di fondo termico, basso e continuo.','sys',700)],choices:[C('Non lo tocco. Scatto una foto.','room_evidence',true),D('Raccolgo il secondo telefono.','Lo schermo mostra la tua chat un messaggio avanti. Leggi: «Non raccoglierlo.» Poi senti le dita chiudersi attorno al tuo polso.'),C('Resto sulla soglia e osservo lo schermo da lontano.','room_watch',true)]},
room_watch:{msgs:[M('Resti sulla soglia. Il secondo telefono continua a sfarfallare sul letto.','sys'),M('La chat scorre da sola fino a un messaggio che sul tuo telefono non esiste.','sys',650),M('«NON ENTRARE QUANDO IL LETTO È VUOTO.»','sys',650),M('Alzi gli occhi. Sul letto adesso non c’è più nemmeno la tua ombra.','sys')],choices:[C('Scatto una foto senza entrare.','room_evidence',true),D('Entro per controllare sotto il letto.','Ti chini. Sotto il letto vedi il corridoio di casa tua, ma dall’altra parte qualcuno è già inginocchiato e ti sta guardando.') ]},
room_evidence:{msgs:[M('Scatti la foto.','sys')],effect:async()=>{await add('Oddio che schifo.','them',500,'unknown');await add('Mi è preso un colpo, non me lo aspettavo.','them',750,'unknown');await new Promise(r=>setTimeout(r,450));await add('Nell’immagine il secondo telefono non compare.','sys',0,'unknown');await add('Al suo posto c’è una persona seduta sul bordo del letto, di spalle.','sys',700,'unknown');await new Promise(r=>setTimeout(r,450));pushImageMessage('unknown','room_photo_bed',{title:'Foto camera',kind:'foto scattata'},'me')},choices:[C('“Chi è quella persona?”','room_truth'),C('“Come hai ricevuto la foto?”','room_truth')]},
room_truth:{msgs:[M('Non guardarle il viso.','them'),M('Io l’ho fatto. È per questo che questa parte della notte per me finiva qui.','them',650),M('Tu invece hai una prova che io non avevo. Conservala.','them',650),M('Il numero sconosciuto riceve la foto prima ancora che tu possa inviarla.','sys',700)],choices:[C('Esco dalla camera senza voltarmi.','room_close',true)]},
room_close:{msgs:[M('Chiudi lentamente la porta della camera.','sys'),M('Dall’altra parte qualcuno imita il rumore della serratura mezzo secondo dopo di te.','sys',700),M('La fotografia rimane sul telefono.','sys')],end:true},
wall_final:{msgs:[M('Torni alla parete.','sys'),M('Il ronzio è ancora lì, ma adesso pulsa a intervalli regolari.','sys',650),M('TOC. TOC. TOC. TOC.','sys',900),M('Quattro colpi. Non tre.','them')],choices:[C('Busso quattro volte nello stesso punto.','wall_four',true),C('Registro i quattro colpi.','wall_record',true),D('Appoggio l’occhio alla crepa.','La crepa non mostra l’interno del muro. Mostra il tuo corridoio, visto da un punto che non dovrebbe esistere. Qualcuno si avvicina dall’altra parte.') ]},
wall_four:{msgs:[M('Rispondi con quattro colpi.','sys'),M('Per qualche secondo non accade nulla.','sys',700),M('Poi la parete risponde una sola volta.','sys',900),M('Una crepa sottile compare sotto le tue nocche e comincia a salire.','sys',700)],choices:[C('Non la tocco. La filmo.','wall_evidence',true),D('Seguo la crepa con le dita.','La crepa si ferma sotto il tuo indice. Poi si apre di colpo lungo tutta la parete, come se qualcosa dall’altra parte avesse tirato.') ]},
wall_record:{msgs:[M('Avvii la registrazione.','sys'),M('I quattro colpi si ripetono. Questa volta il quarto arriva dal telefono, non dal muro.','sys',750),M('Sul display compare per un istante una chiamata dal tuo stesso numero.','sys')],choices:[C('Salvo la registrazione.','wall_evidence',true),D('Rispondo alla chiamata.','Dall’altoparlante senti quattro colpi. Il quarto arriva da dietro la tua testa.') ]},
wall_evidence:{msgs:[M('Salvi il video.','sys'),M('Riguardandolo, la crepa è già presente nel primo fotogramma.','sys',650),M('Tu ricordi perfettamente che non c’era.','sys'),M('Il numero sconosciuto ti invia lo stesso fotogramma con la data di domani.','them',700)],choices:[C('“Hai già bussato quattro volte?”','wall_truth'),C('“Cosa c’è dall’altra parte?”','wall_truth')]},
wall_truth:{msgs:[M('Io avevo sentito solo tre colpi.','them'),M('Il quarto è nuovo.','them',650),M('Questo significa che non stai ripetendo esattamente la mia notte.','them'),M('Conserva il video. È la prima cosa che hai trovato che io non ricordo.','them',650)],choices:[C('Mi allontano dalla parete.','wall_close',true)]},
wall_close:{msgs:[M('Ti allontani.','sys'),M('La crepa smette di crescere.','sys',650),M('Dopo qualche secondo senti quattro colpi molto lontani, come se provenissero da un altro appartamento.','sys',700)],end:true},
mirror_final:{msgs:[M('Torni in bagno senza accendere la luce.','sys'),M('La scritta “NON È LA PRIMA” è ancora sulla condensa.','sys',650),M('Ma sotto è comparsa una seconda riga.','sys'),M('“NON SEI L’ULTIMA.”','sys',700)],choices:[C('Fotografo lo specchio senza guardare il riflesso.','mirror_evidence',true),C('“L’hai scritto tu?”','mirror_question'),D('Guardo direttamente il mio riflesso.','Il tuo riflesso non ti guarda. Sta leggendo qualcosa sul telefono. Poi solleva lentamente gli occhi verso di te.') ]},
mirror_question:{msgs:[M('La prima frase sì.','them'),M('La seconda no.','them',650),M('Non guardare il centro dello specchio. Guarda soltanto il bordo.','them')],choices:[C('Guardo solo il bordo.','mirror_edge',true),C('Scatto una foto senza guardare.','mirror_evidence',true)]},
mirror_edge:{msgs:[M('Sul bordo inferiore dello specchio ci sono piccoli segni incisi nel vetro.','sys'),M('Sembrano tacche. Ne conti molte più di quante riesci a seguire.','sys',700),M('L’ultima è ancora pulita, come se fosse stata incisa pochi secondi fa.','sys')],choices:[C('Fotografo le tacche.','mirror_evidence',true),D('Tocco l’ultima tacca.','Nel momento in cui la tocchi, tutte le tacche compaiono sul tuo polso come graffi sottili.') ]},
mirror_evidence:{msgs:[M('Scatti la foto.','sys'),M('Nella galleria l’immagine appare capovolta, anche se non hai ruotato il telefono.','sys',650),M('Nel riflesso fotografato c’è una notifica che sul tuo schermo non è ancora arrivata.','sys',700),M('«HAI TROVATO UN’ALTRA USCITA.»','sys')],choices:[C('“Un’uscita da cosa?”','mirror_truth'),C('“Perché il messaggio è già nella foto?”','mirror_truth')]},
mirror_truth:{msgs:[M('Non lo so ancora.','them'),M('Ma questa foto non esiste nei miei ricordi.','them',650),M('Se la notte ricomincia, portala con te. Forse non dobbiamo sempre arrivare alla stessa porta.','them')],choices:[C('Conservo la foto.','mirror_close',true)]},
mirror_close:{msgs:[M('Blocchi lo schermo.','sys'),M('Quando lo riaccendi, la foto è ancora lì.','sys',650),M('Nello specchio, invece, la seconda frase è scomparsa.','sys')],end:true}
};
async function deliverFirstMessage(){if(!S.started||S.firstMessageSent||S.ending||S.chapterDone)return;S.firstMessageSent=true;const t=makeThread('unknown');try{if(navigator.vibrate)navigator.vibrate([70,45,70])}catch(_){}const m={text:'NON APRIRE.',who:'them',at:gameSec()};t.messages.push(m);t.lastAt=m.at;t.unread=(t.unread||0)+1;renderHub();save()}
async function start(){if(S.started)return;S.started=true;S.startAt=Date.now();S.activeThread=null;S.storyBegun=false;S.firstMessageSent=false;S.threads={};save();$('#overlay').classList.add('hidden');chatScreen.classList.add('hidden');galleryScreen.classList.add('hidden');hubScreen.classList.remove('hidden');renderHub();startClock();firstMessageTimer=setTimeout(deliverFirstMessage,3000)}
const menuPanel=$('#menuPanel'),confirmPanel=$('#confirmPanel');let confirmAction=null;
function openMenu(){menuPanel.classList.remove('hidden')}
$('#menuBtn').addEventListener('click',openMenu);$('#hubMenuBtn').addEventListener('click',openMenu);
$('#menuClose').addEventListener('click',()=>menuPanel.classList.add('hidden'));
$('#backHub').addEventListener('click',openHub);
galleryFab.addEventListener('click',openGallery);backGallery.addEventListener('click',openHub);closeMedia.addEventListener('click',closeMediaViewer);mediaViewer.addEventListener('click',e=>{if(e.target===mediaViewer||e.target===mediaFull)closeMediaViewer()});window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!mediaViewer.classList.contains('hidden'))closeMediaViewer()});
function ask(kind){menuPanel.classList.add('hidden');confirmAction=kind;$('#confirmTitle').textContent=kind==='all'?'CANCELLARE TUTTO?':'RIAVVIARE IL LOOP?';$('#confirmText').textContent=kind==='all'?'Cancella anche i progressi conservati tra i loop. Non può essere annullato.':'Usalo se la partita sembra bloccata. Il loop corrente ripartirà dalle 00:01:00.';$('#confirmYes').textContent=kind==='all'?'CANCELLA TUTTO':'RIAVVIA';confirmPanel.classList.remove('hidden')}
$('#loopReset').addEventListener('click',()=>ask('loop'));$('#fullReset').addEventListener('click',()=>ask('all'));
$('#confirmNo').addEventListener('click',()=>{confirmPanel.classList.add('hidden');confirmAction=null});
$('#confirmYes').addEventListener('click',()=>{const a=confirmAction;confirmPanel.classList.add('hidden');a==='all'?resetAll():resetLoop()});
$('#start').addEventListener('click',start);$('#restart').addEventListener('click',resetLoop);
$('#notify').addEventListener('click',async()=>{try{if(!('Notification'in window))throw 0;const p=await Notification.requestPermission();$('#notify').textContent=p==='granted'?'NOTIFICHE ATTIVE':'NOTIFICHE NON DISPONIBILI'}catch(_){$('#notify').textContent='NOTIFICHE NON DISPONIBILI'}});
window.addEventListener('error',()=>{});
// Una partita lasciata a metà viene riavviata in modo pulito: niente ricostruzioni parziali della chat.
try{const old=JSON.parse(localStorage.getItem(KEY));if(old&&old.started&&!old.chapterDone&&!old.ending){localStorage.removeItem(KEY)}}catch(_){localStorage.removeItem(KEY)}
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').then(r=>r.update()).catch(()=>{});
