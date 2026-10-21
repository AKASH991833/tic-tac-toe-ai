/* Tic Tac Toe AI: minimax with alpha-beta, analysis, hints, undo, sounds */
(function(){
'use strict';
const WINS=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const boardEl=$('#board'),statusEl=$('#status');
let board,current,human,ai,level=2,gameOver=false,history=[],scores,hintsUsed,soundOn=localStorage.getItem('ttt-sound')!=='0';
try{scores=JSON.parse(localStorage.getItem('ttt-scores'))||{you:0,ai:0,draw:0}}catch(e){scores={you:0,ai:0,draw:0}}

/* ---------- engine ---------- */
function winner(b){for(const [a,c,d] of WINS){if(b[a]&&b[a]===b[c]&&b[a]===b[d])return{who:b[a],line:[a,c,d]}}return b.every(x=>x)?{who:'draw'}:null}
function minimax(b,player,alpha,beta,depth){
  const w=winner(b);
  if(w){if(w.who==='draw')return{score:0};return{score:w.who===ai?10-depth:depth-10}}
  let best={score:player===ai?-Infinity:Infinity};
  for(let i=0;i<9;i++){
    if(b[i])continue;
    b[i]=player;
    const r=minimax(b,player==='X'?'O':'X',alpha,beta,depth+1);
    b[i]=null;
    if(player===ai){if(r.score>best.score)best={score:r.score,move:i};alpha=Math.max(alpha,r.score)}
    else{if(r.score<best.score)best={score:r.score,move:i};beta=Math.min(beta,r.score)}
    if(beta<=alpha)break;
  }
  return best;
}
function bestMove(b,player){const save=ai;ai=player;const r=minimax(b.slice(),player,-Infinity,Infinity,0);ai=save;return r}
function aiPick(){
  const r=Math.random();
  if(level===0){const open=board.map((v,i)=>v?null:i).filter(v=>v!==null);return open[Math.floor(Math.random()*open.length)]}
  const perfect=bestMove(board,ai).move;
  const p=level===1?0.55:level===2?0.9:1;
  if(r<p)return perfect;
  const open=board.map((v,i)=>v?null:i).filter(v=>v!==null&&v!==perfect);
  return open.length?open[Math.floor(Math.random()*open.length)]:perfect;
}

/* ---------- sound ---------- */
let AC;
function beep(f,d=0.09,type='sine',g=0.06){
  if(!soundOn)return;
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  const o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.value=f;
  gn.gain.setValueAtTime(g,AC.currentTime);gn.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+d);
  o.connect(gn).connect(AC.destination);o.start();o.stop(AC.currentTime+d);}catch(e){}
}

/* ---------- UI ---------- */
function buildBoard(){
  boardEl.innerHTML='';
  for(let i=0;i<9;i++){
    const c=document.createElement('button');
    c.className='cell';c.dataset.i=i;c.setAttribute('role','gridcell');
    c.setAttribute('aria-label','Cell '+(i+1));
    c.addEventListener('click',()=>play(i));
    boardEl.appendChild(c);
  }
}
function render(){
  $$('.cell').forEach((c,i)=>{
    const v=board[i];
    c.classList.toggle('taken',!!v);c.classList.remove('x','o','win','hint');
    c.innerHTML=v?`<span class="mark">${v}</span>`:'';
    if(v)c.classList.add(v.toLowerCase());
  });
  $('#scoreYou').textContent=scores.you;$('#scoreAi').textContent=scores.ai;$('#scoreDraw').textContent=scores.draw;
  $('#youAre').textContent=human;
}
function setStatus(html){statusEl.innerHTML=html}
function turnStatus(){
  if(gameOver)return;
  const you=current===human;
  setStatus(`<span class="turn-dot" style="background:${you?'var(--accent-ink)':'#d97706'}"></span>${you?'Your move':'AI is thinking…'}`);
}
function play(i){
  if(gameOver||board[i]||current!==human)return;
  place(i,human);
  const w=winner(board);
  if(w)return endGame(w);
  current=ai;turnStatus();
  setTimeout(()=>{
    if(gameOver)return;
    place(aiPick(),ai);
    const w2=winner(board);
    if(w2)return endGame(w2);
    current=human;turnStatus();
  },260+Math.random()*240);
}
function place(i,who){
  board[i]=who;history.push({i,who});
  render();beep(who===human?520:340,0.08);
}
function endGame(w){
  gameOver=true;
  const cells=$$('.cell');
  if(w.line){w.line.forEach(i=>cells[i].classList.add('win'));drawWinLine(w.line)}
  if(w.who==='draw'){scores.draw++;setStatus('🤝 It\'s a draw. Well defended!');beep(300,.15,'sine');}
  else if(w.who===human){scores.you++;setStatus('🎉 You win! That\'s rare against this brain.');beep(523,.1);setTimeout(()=>beep(659,.1),110);setTimeout(()=>beep(784,.2),220);}
  else{scores.ai++;setStatus('🤖 AI wins this one. Check your analysis to see where it slipped.');beep(220,.2,'sawtooth',0.04);}
  localStorage.setItem('ttt-scores',JSON.stringify(scores));
  render();analyze();
}
function drawWinLine(line){
  const b=boardEl.getBoundingClientRect();
  const cell=b.width/3;
  const pos=i=>({x:(i%3)*cell+cell/2,y:Math.floor(i/3)*cell+cell/2});
  const p1=pos(line[0]),p2=pos(line[2]);
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','win-line');svg.setAttribute('viewBox',`0 0 ${b.width} ${b.width}`);
  svg.innerHTML=`<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}"/>`;
  boardEl.appendChild(svg);
}
function analyze(){
  const list=$('#analysis');list.innerHTML='';
  // replay, grading human moves by outcome preservation
  let b=Array(9).fill(null),turn='X',moveNo=0,any=false;
  const res=b2=>{const w=winner(b2);return w?(w.who==='draw'?0:(w.who===human?1:-1)):null};
  for(const {i,who} of history){
    if(who!==human){b[i]=who;turn=who==='X'?'O':'X';continue}
    moveNo++;any=true;
    // outcome if human plays i
    b[i]=who;
    const after=res(b)||(()=>{const r=bestMove(b.slice(),turn==='X'?'O':'X');/*not needed*/return null})();
    b[i]=null;
    // optimal: best achievable outcome from position before this move
    const opt=bestMove(b.slice(),human);
    b[opt.move]=human;
    const optRes=res(b)||forecast(b.slice(),human);
    b[opt.move]=null;
    b[i]=who;
    const actRes=res(b)||forecast(b.slice(),human);
    const cellNo=i+1;
    let tag,cls,txt;
    if(opt.move===i){tag='BEST';cls='ana-best';txt=`Move ${moveNo}: cell ${cellNo}: the strongest move.`}
    else if(actRes===optRes){tag='GOOD';cls='ana-good';txt=`Move ${moveNo}: cell ${cellNo}: keeps the same result as the best move (cell ${opt.move+1}).`}
    else{tag='MISSED';cls='ana-miss';txt=`Move ${moveNo}: cell ${cellNo}: perfect play was cell ${opt.move+1}. ${optRes>actRes?'You let a win slip.':'This opened the door for the AI.'}`}
    const div=document.createElement('div');div.className='ana-item';
    div.innerHTML=`<span class="ana-tag ${cls}">${tag}</span><span>${txt}</span>`;
    list.appendChild(div);
    turn=who==='X'?'O':'X';
  }
  if(!any)list.innerHTML='<div class="note">The AI played first, so there are no moves to grade yet.</div>';
}
// forecast final outcome with perfect play from position b where `next` moves next
function forecast(b,next){
  let turn=next;
  while(true){
    const w=winner(b);if(w)return w.who==='draw'?0:(w.who===human?1:-1);
    const m=bestMove(b,turn).move;b[m]=turn;turn=turn==='X'?'O':'X';
  }
}
function newGame(){
  board=Array(9).fill(null);history=[];gameOver=false;
  $('#analysis').innerHTML='<div class="note">Game in progress. Your report card appears when it ends.</div>';
  // alternate starter, human always X or O per choice
  current='X';
  render();turnStatus();
  if(ai==='X'){setTimeout(()=>{if(!gameOver){place(aiPick(),ai);current=human;turnStatus();}},350);}
}
/* controls */
$('#levelSeg').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  level=+b.dataset.level;$$('#levelSeg button').forEach(x=>x.classList.toggle('on',x===b));
  toast('Difficulty: '+b.textContent);newGame();
});
$('#newGameBtn').addEventListener('click',newGame);
$('#swapBtn').addEventListener('click',()=>{
  const h=human;human=ai;ai=h;newGame();toast('You are now '+human);
});
$('#undoBtn').addEventListener('click',()=>{
  if(gameOver||!history.length)return;
  // remove last AI + human move (or just last if AI hasn't replied)
  const last=history[history.length-1];
  const n=last.who===ai&&history.length>=2?2:1;
  for(let k=0;k<n;k++){const m=history.pop();board[m.i]=null;}
  current=human;render();turnStatus();beep(440,.06);
});
$('#hintBtn').addEventListener('click',()=>{
  if(gameOver||current!==human)return;
  const m=bestMove(board.slice(),human).move;
  const c=$$('.cell')[m];c.classList.add('hint');
  setTimeout(()=>c.classList.remove('hint'),2100);
  beep(660,.08);
});
$('#soundBtn').addEventListener('click',()=>{
  soundOn=!soundOn;localStorage.setItem('ttt-sound',soundOn?'1':'0');
  toast(soundOn?'Sound on':'Sound off');
});
document.addEventListener('keydown',e=>{
  if(e.key>='1'&&e.key<='9')play(+e.key-1);
  if(e.key==='u'||e.key==='U')$('#undoBtn').click();
  if(e.key==='h'||e.key==='H')$('#hintBtn').click();
  if(e.key==='n'||e.key==='N')newGame();
});
human='X';ai='O';buildBoard();newGame();
})();
