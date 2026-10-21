module.exports.run = async (page, base, shot) => {
  const out = [];
  // play a full game: human X, impossible level -> click center, then follow hints to draw
  await page.select ? null : null;
  // set Impossible
  await page.evaluate(()=>{[...document.querySelectorAll('#levelSeg button')].find(b=>b.textContent==='Impossible').click()});
  await new Promise(r=>setTimeout(r,400));
  // play using hint each turn -> should draw vs impossible
  for (let t=0;t<9;t++){
    const done = await page.evaluate(()=>document.querySelector('#status').textContent);
    if (/win|draw/i.test(done)) break;
    await page.evaluate(()=>document.querySelector('#hintBtn').click());
    await new Promise(r=>setTimeout(r,150));
    await page.evaluate(()=>{const c=document.querySelector('.cell.hint'); if(c) c.click();});
    await new Promise(r=>setTimeout(r,900));
  }
  const status = await page.evaluate(()=>document.querySelector('#status').textContent);
  out.push(['end status', status.trim()]);
  const ana = await page.evaluate(()=>document.querySelectorAll('.ana-item').length);
  out.push(['analysis items', ana]);
  // undo check on new game
  await page.evaluate(()=>document.querySelector('#newGameBtn').click());
  await new Promise(r=>setTimeout(r,300));
  await page.evaluate(()=>document.querySelectorAll('.cell')[4].click());
  await new Promise(r=>setTimeout(r,900));
  const taken = await page.evaluate(()=>document.querySelectorAll('.cell.taken').length);
  await page.evaluate(()=>document.querySelector('#undoBtn').click());
  await new Promise(r=>setTimeout(r,200));
  const takenAfter = await page.evaluate(()=>document.querySelectorAll('.cell.taken').length);
  out.push(['taken before/after undo', taken+'/'+takenAfter]);
  await page.screenshot({path:shot});
  return out;
};
