import {expect,test,type Page} from '@playwright/test';
const one='123e4567-e89b-42d3-a456-426614174000';
const two='123e4567-e89b-42d3-a456-426614174001';
const rows=[
 {id:one,title:'Festival Aurora QA',description:'Música e cultura local fictícia',city:'Jales',starts_at:'2027-05-20T20:00:00Z',status:'published'},
 {id:two,title:'Conferência de Tecnologia QA',description:'Programação fictícia',city:'Santa Fé do Sul',starts_at:'2027-05-22T20:00:00Z',status:'published'}
];
async function mockPublicApi(page:Page){
 await page.route('**/api/**',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/api/events'){
     const q=(u.searchParams.get('q')||'').toLowerCase(),city=(u.searchParams.get('city')||'').toLowerCase(),p=Number(u.searchParams.get('page')||'1');
     const matches=rows.filter(r=>(!q||[r.title,r.description,r.city].some(s=>s.toLowerCase().includes(q)))&&(!city||r.city.toLowerCase().includes(city)));
     const filtered=matches.slice((p-1)*1,p*1);
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({events:filtered,page:p,hasMore:matches.length>p})});
     return;
   }
   if(u.pathname==='/api/events/'+one){
     await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({event:rows[0],
       lots:[{id:'223e4567-e89b-42d3-a456-426614174000',label:'Pista QA',price_cents:7500,available:3,capacity:3,issued:0,reserved:0,status:'available'}]})});
     return;
   }
   await route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'NOT_FOUND'})});
 });
}
test.beforeEach(async({page})=>{await mockPublicApi(page);await page.goto('/');await page.getByRole('button',{name:'Sandbox autenticado'}).click();});
test('public catalogue search, pagination, ticket total and help have no billing action',async({page})=>{
 await expect(page.getByRole('heading',{name:/RFBTicket Sandbox/i})).toBeVisible();
 await expect(page.getByRole('button',{name:/Festival Aurora QA/})).toBeVisible();
 await page.getByRole('button',{name:'Próxima'}).first().click();
 await expect(page.getByRole('button',{name:/Conferência de Tecnologia QA/})).toBeVisible();
 await page.getByRole('textbox',{name:'Nome ou descrição'}).fill('Aurora');
 await page.getByRole('button',{name:'Buscar'}).click();
 await expect(page.getByRole('button',{name:/Festival Aurora QA/})).toBeVisible();
 await page.getByRole('button',{name:/Festival Aurora QA/}).click();
 await expect(page.getByRole('heading',{name:'Lotes'})).toBeVisible();
 await page.getByRole('button',{name:/Pista QA/}).click();
 await page.getByLabel('Quantidade').selectOption('2');
 await expect(page.getByText('Total fictício:')).toContainText('R$');
 await expect(page.getByRole('button',{name:/Reservar 10 min/})).toBeDisabled();
 await page.getByRole('button',{name:'Ajuda',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Ajuda e funcionamento do sandbox'})).toBeVisible();
 await expect(page.getByText('não compre nem apresente essas credenciais',{exact:false})).toBeVisible();
});
test('empty result and no horizontal overflow in public sandbox UI',async({page})=>{
 await page.getByRole('textbox',{name:'Cidade'}).fill('Cidade Inexistente');
 await page.getByRole('button',{name:'Buscar'}).click();
 await expect(page.getByText('Nenhum evento encontrado.')).toBeVisible();
 await page.getByRole('button',{name:'Limpar filtros'}).click();
 await expect(page.getByRole('button',{name:/Festival Aurora QA/})).toBeVisible();
 const width=await page.evaluate(()=>({page:document.documentElement.scrollWidth,viewport:window.innerWidth}));
 expect(width.page).toBeLessThanOrEqual(width.viewport+1);
});
