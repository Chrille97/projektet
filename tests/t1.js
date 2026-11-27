const { chromium } = require('playwright');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++};
(async()=>{
 const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
 const ctx=await b.newContext({viewport:{width:1440,height:900},colorScheme:'light'});
 const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
 await pg.goto('file://'+process.cwd()+'/new.html');await pg.waitForTimeout(600);
 await pg.click('#tabTrace');await pg.waitForTimeout(300);
 const rows=()=>pg.locator('#trGrid tbody tr').count();
 const info=()=>pg.textContent('#trInfo');
 const msg=()=>pg.textContent('#trMsg');
 // Sara (proj) default
 const n1=await rows();ok(n1>0&&n1<12,'Sara (Projektör) ser bara egen part: '+n1+' rader');
 await pg.selectOption('#trMe','u2');await pg.waitForTimeout(150);
 ok(await rows()===12,'Erik (Granskare) ser alla 12 rader');
 await pg.screenshot({path:'tr_gran.png'});
 // inline edit as Erik: row 4 (GRK-004) desc col idx 4
 const cell=(r,c)=>pg.locator(`#trGrid td[data-r="${r}"][data-c="${c}"]`);
 await cell(3,5).click();await cell(3,5).dblclick();
 ok(await pg.locator('#trGrid .tr-ed').count()===1,'dblclick öppnar redigering');
 await pg.fill('#trGrid .tr-ed','Ändrad kommentar från test');await pg.keyboard.press('Enter');await pg.waitForTimeout(100);
 ok((await cell(3,5).textContent()).includes('Ändrad kommentar från test'),'cellen sparades');
 // type-to-edit with Excel behaviour: move to rev col (2) and type
 await cell(3,3).click();await pg.keyboard.press('Q');await pg.waitForTimeout(80);
 ok(await pg.locator('#trGrid .tr-ed').count()===1,'tangenttryck startar redigering');
 await pg.keyboard.type('Z');await pg.keyboard.press('Tab');await pg.waitForTimeout(100);
 ok((await cell(3,3).textContent())==='QZ','typ-för-att-redigera gav QZ (var '+await cell(3,3).textContent()+')');
 // open detail via row number
 await pg.click('#trGrid th[data-rn="3"]');await pg.waitForTimeout(150);
 const dt=await pg.textContent('#trDetail');
 ok(dt.includes('GRK-004')&&dt.includes('Historik'),'detaljpanel öppnas för GRK-004');
 await pg.click('#trDetail [data-tab="hist"]');
 const h=await pg.textContent('#trDetail');
 ok(h.includes('ändrade')&&h.includes('Kommentar')&&h.includes('Ändrad kommentar från test'),'historiken loggar från/till');
 // comment
 await pg.click('#trDetail [data-tab="comments"]');
 await pg.fill('#trCom','Testkommentar');await pg.click('#trDetail [data-d="addc"]');
 ok((await pg.textContent('#trDetail')).includes('Testkommentar'),'kommentar syns i tråden');
 // permissions: switch to Sara, GRK-004 belongs to Karin (aut) so Sara can't see it
 await pg.selectOption('#trMe','u3');await pg.waitForTimeout(150);
 const saraRows=await rows();
 // Sara edits desc on a row she did not create -> blocked
 await cell(0,4).click();await cell(0,4).dblclick();await pg.waitForTimeout(80);
 ok(await pg.locator('#trGrid .tr-ed').count()===0&&(await msg()).includes('får inte ändra'),'Projektör blockeras från att ändra andras kommentar: '+await msg());
 // Sara can edit resp (fix) on her own part row: find GRK-011 (open, proj) via search
 await pg.fill('#trQ','Skyddsjordning');await pg.waitForTimeout(100);
 ok(await rows()===1,'sökning filtrerar');
 await cell(0,10).click();await cell(0,10).dblclick();
 ok(await pg.locator('#trGrid .tr-ed').count()===1,'ansvarig part får fylla i Svar / åtgärd');
 await pg.fill('#trGrid .tr-ed','Redovisas på blad E-111.');await pg.keyboard.press('Enter');
 await pg.click('#trGrid th[data-rn="0"]');await pg.waitForTimeout(100);
 let d=await pg.textContent('#trDetail');
 ok(d.includes('Markera som åtgärdad'),'Sara ser Markera som åtgärdad på sin punkt');
 await pg.click('#trDetail [data-t="fix"]');await pg.waitForTimeout(100);
 d=await pg.textContent('#trDetail');
 ok(d.includes('Åtgärdad')&&!d.includes('Godkänn')&&d.includes('Väntar på godkännande'),'efter åtgärd väntar den på godkännande, Sara får inte godkänna');
 // Erik approves
 await pg.selectOption('#trMe','u2');await pg.waitForTimeout(200);
 await pg.fill('#trQ','Skyddsjordning');await pg.waitForTimeout(100);
 await pg.click('#trGrid th[data-rn="0"]');await pg.waitForTimeout(100);
 d=await pg.textContent('#trDetail');
 ok(d.includes('Godkänn')&&d.includes('Avvisa åtgärd'),'Erik (skapare) ser Godkänn och Avvisa åtgärd');
 await pg.click('#trDetail [data-t="reject"]');await pg.waitForTimeout(80);
 await pg.click('#trDetail [data-d="trok"]');
 ok((await msg()).includes('kommentar'),'Avvisa kräver kommentar');
 await pg.fill('#trPend','Blad E-111 saknas.');await pg.click('#trDetail [data-d="trok"]');await pg.waitForTimeout(100);
 d=await pg.textContent('#trDetail');
 ok(d.includes('Öppen')&&d.includes('Blad E-111 saknas.'),'avvisad åtgärd går tillbaka till Öppen med kommentar');
 // four eyes with Admin
 await pg.selectOption('#trMe','u6');await pg.waitForTimeout(200);
 await pg.fill('#trQ','Skyddsjordning');await pg.waitForTimeout(100);
 await pg.click('#trGrid th[data-rn="0"]');
 await pg.click('#trDetail [data-t="fix"]');await pg.waitForTimeout(100);
 d=await pg.textContent('#trDetail');
 ok(d.includes('Du åtgärdade punkten själv'),'fyra ögon: admin kan inte godkänna egen åtgärd');
 await pg.fill('#trQ','');await pg.waitForTimeout(100);
 // sorting
 await pg.selectOption('#trMe','u2');await pg.waitForTimeout(150);
 await pg.click('#trGrid th[data-sort="status"]');await pg.waitForTimeout(100);
 const firstStatus=await cell(0,1).textContent();
 await pg.click('#trGrid th[data-sort="status"]');await pg.waitForTimeout(100);
 const lastFirst=await cell(0,1).textContent();
 ok(firstStatus!==lastFirst,'sortering växlar riktning: '+firstStatus+' / '+lastFirst);
 await pg.click('#trGrid th[data-sort="status"]');await pg.waitForTimeout(100);
 // column filter
 await pg.click('#trFil');await pg.fill('#trGrid input[data-fil="cat"]','Fel');await pg.waitForTimeout(150);
 const nf=await rows();ok(nf>0&&nf<12,'kolumnfilter Kategori=Fel ger '+nf+' rader');
 ok(await pg.evaluate(()=>document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.fil==='cat'),'fokus kvar i filterfältet');
 await pg.fill('#trGrid input[data-fil="cat"]','');await pg.click('#trFil');
 // copy
 await cell(0,2).click();
 const copied=await pg.evaluate(()=>{const dt=new DataTransfer();const ev=new ClipboardEvent('copy',{clipboardData:dt,bubbles:true,cancelable:true});document.getElementById('trGrid').dispatchEvent(ev);return dt.getData('text/plain')});
 ok(copied.length>0&&!copied.includes('\n'),'kopiera en cell: '+JSON.stringify(copied));
 await cell(1,2).click();
 await cell(2,4).click({modifiers:['Shift']});
 const copied2=await pg.evaluate(()=>{const dt=new DataTransfer();const ev=new ClipboardEvent('copy',{clipboardData:dt,bubbles:true,cancelable:true});document.getElementById('trGrid').dispatchEvent(ev);return dt.getData('text/plain')});
 ok(copied2.split('\n').length===2&&copied2.split('\n')[0].split('\t').length===3,'kopiera ett område (2x3): '+JSON.stringify(copied2).slice(0,80));
 // paste: new rows from Excel-like TSV at last row
 const before=await rows();
 await cell(before-1,2).click();
 await pg.evaluate(()=>{const dt=new DataTransfer();dt.setData('text/plain','E-999 Test\tA\tP9-X\tTestkommentar ett\tFel\nE-998 Test\tB\tP8-X\tTestkommentar två\tBrist\n');const ev=new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true});document.getElementById('trGrid').dispatchEvent(ev)});
 await pg.waitForTimeout(150);
 const after=await rows();
 ok(after===before+1,'klistra in två rader från sista raden: över skriver sista + skapar en ny ('+before+' → '+after+')');
 ok((await msg()).includes('Klistrade in'),'meddelande: '+await msg());
 // new row button
 await pg.click('#trNew');await pg.waitForTimeout(150);
 ok(await pg.locator('#trGrid .tr-ed').count()===1,'Ny punkt öppnar redigering i beskrivningen');
 await pg.keyboard.type('Ny punkt via knappen');await pg.keyboard.press('Enter');await pg.waitForTimeout(100);
 ok((await rows())===after+1,'ny rad finns');
 // Karin (entreprenör) create row in FAT list, then check Erik can't edit closed rows
 await pg.screenshot({path:'tr_after.png'});
 // settings: matrix change takes effect
 await pg.selectOption('#trMe','u1');await pg.waitForTimeout(100);
 await pg.click('#trSet');await pg.waitForTimeout(100);
 ok(await pg.locator('#trModal [data-perm]').count()===9*5,'matrisen har 9x5 val');
 await pg.selectOption('#trModal select[data-perm="create|entr"]','0');
 await pg.click('#trModal [data-m="close"]');
 await pg.selectOption('#trMe','u5');await pg.waitForTimeout(150);
 ok(await pg.locator('#trNew').isDisabled(),'när skapa=Nej för Entreprenör är Ny punkt avstängd');
 await pg.selectOption('#trMe','u1');await pg.click('#trSet');
 await pg.selectOption('#trModal select[data-perm="create|entr"]','1');await pg.click('#trModal [data-m="close"]');
 // visibility setting
 await pg.selectOption('#trMe','u5');await pg.waitForTimeout(100);
 const own=await rows();
 await pg.selectOption('#trMe','u1');await pg.click('#trSet');await pg.selectOption('#trModal select[data-vis]','all');await pg.click('#trModal [data-m="close"]');
 await pg.selectOption('#trMe','u5');await pg.waitForTimeout(100);
 ok(await rows()>own,'alla-ser-alla ger fler rader för Karin ('+own+' → '+await rows()+')');
 await pg.selectOption('#trMe','u1');await pg.click('#trSet');await pg.selectOption('#trModal select[data-vis]','own');await pg.click('#trModal [data-m="close"]');
 // lists
 await pg.click('#trSheets [data-list="fat"]');await pg.waitForTimeout(100);
 ok(await rows()===12,'FAT-listan har 12 steg');
 await pg.click('#trSheets [data-list="rp"]');await pg.waitForTimeout(100);
 ok(await rows()===8,'Restpunkter har 8');
 await pg.selectOption('#trMe','u1');await pg.waitForTimeout(100);
 // JSON roundtrip
 await pg.click('#trData');
 const json=await pg.inputValue('#trJsonOut');
 let parsed=null;try{parsed=JSON.parse(json)}catch(e){}
 ok(parsed&&parsed.lists.length===3&&parsed.events.length>50,'export ger giltig JSON med '+(parsed&&parsed.events.length)+' händelser');
 await pg.click('#trModal [data-m="close"]');
 // reset then import
 await pg.click('#trSet');await pg.click('#trModal [data-m="reset1"]');await pg.click('#trModal [data-m="reset2"]');await pg.waitForTimeout(150);
 await pg.selectOption('#trMe','u1');await pg.click('#trData');await pg.fill('#trJsonIn',json);await pg.click('#trModal [data-m="import"]');await pg.waitForTimeout(200);
 ok((await pg.locator('#trModal').isHidden()),'import stänger dialogen');
 await pg.click('#trSheets [data-list="grk"]');await pg.selectOption('#trMe','u2');await pg.waitForTimeout(100);
 ok((await rows())===14||(await rows())===13||(await rows())>12,'importerade ändringar (nya rader) finns kvar: '+await rows());
 await pg.selectOption('#trMe','u1');await pg.click('#trData');await pg.fill('#trJsonIn','{trasig');await pg.click('#trModal [data-m="import"]');
 ok((await pg.textContent('#trImpMsg')).includes('inte ett giltigt'),'trasig JSON ger felmeddelande');
 await pg.click('#trModal [data-m="close"]');
 // reload keeps state
 await pg.reload();await pg.waitForTimeout(500);await pg.click('#tabTrace');await pg.waitForTimeout(200);
 ok((await pg.textContent('#trMe')).length>0&&(await rows())>0,'läses in igen efter omladdning');
 // other tabs still work
 await pg.click('#tabNet');await pg.waitForTimeout(200);
 ok(await pg.locator('#net .node').count()>3,'Projektnät fungerar fortfarande');
 await pg.click('#tabPlan');await pg.waitForTimeout(200);
 ok(await pg.locator('#gantt').count()>0,'Tidplan fungerar fortfarande');
 console.log('errors',errs);
 console.log(fails?('FAILS '+fails):'ALL PASS');
 await b.close();
})();
