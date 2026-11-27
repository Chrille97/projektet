const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1440,height:900}});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
 await pg.goto('file://'+process.cwd()+'/index.html');await pg.waitForTimeout(500);
 ok(await pg.evaluate(()=>document.documentElement.lang)==='sv','lang=sv');
 ok(await pg.locator('h1').count()===1&&(await pg.textContent('h1'))==='Start','en h1, Start');
 ok(!(await pg.locator('#viewStart').isHidden()),'Start är första vyn');
 ok(await pg.locator('.st-intro').count()===1,'introduktionen visas första gången');
 await pg.screenshot({path:'scan/v12_start.png'});
 // Projektledning: ingen Avstämning-flik, Problem-knapp i Tidplan
 ok(await pg.locator('#tabCheck').isHidden(),'Avstämning-fliken dold för Projektledning');
 await pg.click('#tabPlan');await pg.waitForTimeout(250);
 const prob=pg.locator('.pt-actions [data-act="gocheck"]');ok(await prob.count()===1,'Problem-knapp i Tidplan: '+await prob.textContent());
 await prob.click();await pg.waitForTimeout(200);
 ok((await pg.textContent('#checkBody')).includes('Tillbaka till tidplanen'),'tillbaka-knapp i avstämning');
 ok((await pg.getAttribute('#tabPlan','aria-selected'))==='true','Tidplan-fliken markerad i Avstämning');
 ok(!(await pg.textContent('#checkBody')).includes('Kör AI-avstämning'),'ingen död AI-knapp');
 const ct=await pg.textContent('#checkBody');console.log(JSON.stringify(ct.slice(-200)));ok(ct.includes('inte är kopplad'),'tydlig AI-förklaring');
 ok(!(await pg.textContent('#viewPlan')).includes('Andon'),'inga Andon-ord i tidplanen');
 // Andra parts: Avstämning-flik syns
 await pg.click('#tabStart');await pg.selectOption('#asSel','best');await pg.waitForTimeout(200);
 ok(!(await pg.locator('#tabCheck').isHidden()),'Avstämning-fliken syns för Beställare');
 ok((await pg.textContent('#startBody')).includes('Hej! Du ser projektet som Beställare'),'Start hälsar som Beställare');
 // AI-fältet ärligt märkt
 ok((await pg.textContent('#aiSend'))==='Sök'&&(await pg.getAttribute('#aiQ','placeholder')).startsWith('Sök'),'sökfältet märkt Sök när AI saknas');
 // Persona-synk: Beställare -> Maria i Spårbarhet
 await pg.click('#tabTrace');await pg.waitForTimeout(250);
 ok((await pg.inputValue('#trMe'))==='u1','Spårbarhet följer Visa som (Maria)');
 // Väntar på mig: byt till Sara
 await pg.selectOption('#trMe','u3');await pg.waitForTimeout(150);
 const chips=await pg.locator('#trChips .tr-chip').allTextContents();console.log(chips.join(' | '));
 ok(chips[1].startsWith('Väntar på mig'),'chip Väntar på mig finns');
 await pg.click('[data-chip="wait:me"]');await pg.waitForTimeout(150);
 let n=await pg.locator('#trGrid tbody tr').count();
 console.log('Sara väntar på mig rader:',n);ok(n>=1,'Sara har punkter som väntar på henne ('+n+')');
 // öppna första raden och åtgärda, sedan ångra
 await pg.locator('#trGrid tbody tr').first().locator('.op').first().click();await pg.waitForTimeout(250);
 console.log('detaljknappar:',(await pg.locator('#trDetail button').allTextContents()).join(' | '));
 const fixBtn=pg.locator('#trDetail button',{hasText:/Markera som åtgärdad/}).first();
 ok(await fixBtn.count()>0,'Åtgärda-knapp finns för Sara');
 await fixBtn.click();await pg.waitForTimeout(250);
 ok(!(await pg.locator('#trUndo').isHidden()),'Ångra-knapp visas efter statusändring');
 console.log('toast:',await pg.textContent('#trUndo'));
 await pg.click('#trUndo [data-undo]');await pg.waitForTimeout(250);
 ok((await pg.textContent('#trMsg')).includes('ångrad'),'ångrad');
 await pg.click('[data-chip="wait:me"]');await pg.waitForTimeout(100);
 ok(await pg.locator('#trGrid tbody tr').count()===1,'punkten väntar på Sara igen efter ångra');
 await pg.screenshot({path:'scan/v12_trace_chips.png'});
 // lämna Spårbarhet: Visa som följer med
 await pg.click('#tabStart');await pg.waitForTimeout(200);
 ok((await pg.inputValue('#asSel'))==='kons','Visa som följer Spårbarhets person (Sara -> Projektör el)');
 ok((await pg.textContent('#startBody')).includes('Väntar på dig'),'Start visar Väntar på dig');
 await pg.screenshot({path:'scan/v12_start_sara.png'});
 await pg.click('[data-go="intro-done"]');await pg.waitForTimeout(100);
 ok(await pg.locator('.st-intro').count()===0,'introduktionen kan döljas');
 // hjälp och inbjudan
 await pg.click('#btnHelp');ok(!(await pg.locator('#gModal').isHidden())&&(await pg.textContent('#gBody')).includes('Förskjutning'),'ordlista öppnas');
 await pg.keyboard.press('Escape');ok(await pg.locator('#gModal').isHidden(),'Esc stänger dialogen');
 await pg.click('#btnInvite');await pg.selectOption('#invArea','entr');
 const link=await pg.inputValue('#invLink');ok(link.endsWith('#inbjudan=entr'),'inbjudningslänk '+link.slice(-20));
 await pg.keyboard.press('Escape');
 const pg2=await ctx.newPage();await pg2.goto(link);await pg2.waitForTimeout(500);await pg2.reload();await pg2.waitForTimeout(500);
 ok((await pg2.textContent('#startBody')).includes('bjudits in som Elentreprenör'),'länken öppnar som Elentreprenör');
 await pg2.close();
 // exempel flyttat till Nytt projekt
 ok(await pg.locator('.bar #btnExample').count()===0,'Ladda exempel borta från toppen');
 await pg.click('#btnNew');ok(!(await pg.locator('#newSheet #btnExample').isHidden()),'Exempelprojekt i Nytt projekt-dialogen');
 await pg.click('#npCancel');
 // Data borta från verktygsraden, Kolumnfilter i meny
 await pg.click('#tabTrace');await pg.waitForTimeout(150);
 ok(await pg.locator('#trData').count()===0,'Data-knappen borta');
 ok(await pg.locator('.tr-more').count()===1,'Kolumnfilter i ⋯-meny');
 ok(errs.length===0,'inga JS-fel '+errs.join('|'));
 await b.close();process.exit(fails?1:0);
})();
