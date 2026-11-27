const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('file://'+process.cwd()+'/index.html');await pg.waitForTimeout(500);
 await pg.click('#tabTrace');await pg.waitForTimeout(200);
 // Sara (Projektör) ska inte få exportera? kolla io-rättighet
 await pg.selectOption('#trMe','u1');await pg.waitForTimeout(150);
 ok(!(await pg.locator('#trXl').isDisabled()),'Beställare kan öppna Excel');
 await pg.click('#trXl');await pg.waitForTimeout(150);
 ok((await pg.textContent('#trModal')).includes('32 rader'),'modalen visar 32 rader');
 await pg.screenshot({path:'xl_modal.png'});
 await pg.check('#trXlHist');
 const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('[data-m="xlexp"]')]);
 const p='/tmp/out_gran.xlsx';await dl.saveAs(p);ok(dl.suggestedFilename().endsWith('.xlsx'),'filnamn '+dl.suggestedFilename());
 await pg.click('[data-m="close"]');
 // Projektör (Sara u3): bara egen part
 await pg.selectOption('#trMe','u3');await pg.waitForTimeout(150);
 const dis=await pg.locator('#trXl').isDisabled();console.log('Sara Excel disabled:',dis);
 if(!dis){await pg.click('#trXl');const [d2]=await Promise.all([pg.waitForEvent('download'),pg.click('[data-m="xlexp"]')]);await d2.saveAs('/tmp/out_sara.xlsx')}
 ok(errs.length===0,'inga JS-fel '+errs.join('|'));
 await b.close();process.exit(fails?1:0);
})();
