require('./ts-loader.cjs');
const {test}=require('node:test');const assert=require('node:assert/strict');
const values=new Map();global.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const {storageService:storage}=require('../src/services/storage.ts');
const {BusinessService,ensureBusinessState,recordBusinessCustody}=require('../src/services/BusinessService.ts');
const {HandoffService}=require('../src/services/HandoffService.ts');
const clone=v=>JSON.parse(JSON.stringify(v));
function harness(){
  let state=clone(storage.getWorkflow());let actor={id:'admin',role:'ADMIN',name:'Operador',facilityId:'FAC-02'};
  const fixedNow=new Date();const read=()=>clone(state),transaction=fn=>{const next=clone(state);const result=fn(next);state=next;return result;};
  const handoffs=new HandoffService({read,transaction,actor:id=>{if(id!==actor.id)throw Error('Actor no autenticado');return actor;},random:()=>require('node:crypto').randomBytes(20).toString('hex'),paid:o=>o.pricing.paymentStatus==='PAID',intakeAllowed:o=>o.pricing.pricingModel==='PER_WEIGHT',declaredCount:o=>o.itemCount,blocked:o=>state.incidents.some(i=>i.orderId===o.id&&i.status!=='RESOLVED'),confirmed:recordBusinessCustody});
  const catalog=clone(storage.getCatalog()),facilities=clone(storage.getFacilities()),promotions=clone(storage.getPromotions());
  const service=new BusinessService({read,transaction,actor:()=>actor,facilities:()=>facilities,catalog:()=>catalog,promotions:()=>promotions,covers:(a,f)=>a.coordinates.lat>-3&&a.coordinates.lat<-1&&f==='FAC-02',handoffs,now:()=>fixedNow});
  const client=()=>actor={id:'CUST-001',role:'CLIENT',name:'Cliente'};const staff=()=>actor={id:'admin',role:'ADMIN',name:'Operador',facilityId:'FAC-02'};const driver=()=>actor={id:'DRV-105',role:'DRIVER',name:'Diego'};
  const slot=(context,day=0)=>state.timeSlots.filter(s=>s.facilityId==='FAC-02'&&s.context===context)[day];
  function input(mode='STORE_STORE',weight=false){const item=catalog.find(c=>c.category==='PRENDAS'&&c.status==='ACTIVE');const base=state.orders.find(o=>o.id==='SOL-HH-001');return {requestId:require('node:crypto').randomUUID(),customerId:'CUST-001',facilityId:'FAC-02',inbound:mode.startsWith('HOME')?'DRIVER':'CUSTOMER',outbound:mode.endsWith('HOME')?'DRIVER':'CUSTOMER',inboundSlotId:slot(mode.startsWith('HOME')?'DRIVER_PICKUP':'FACILITY_DROPOFF').id,outboundSlotId:slot(mode.endsWith('HOME')?'DRIVER_DELIVERY':'FACILITY_PICKUP',4).id,pickupAddress:base.customerAddress,deliveryAddress:base.deliveryAddress,items:[{id:item.id,name:item.name,quantity:3,unitPrice:item.price,category:'PRENDAS'}],pricingModel:weight?'PER_WEIGHT':'FIXED',catalogServiceId:weight?'SVC-WEIGHT':undefined};}
  function transfer(id,type,details={count:3}){const h=state.handoffs.find(h=>h.orderId===id&&h.type===type&&h.status==='ACTIVE');assert.ok(h,'Active '+type);const before=state.orders.find(o=>o.id===id).status;const verified=handoffs.verify(h.fallbackCode,actor.id,h.id);assert.equal(state.orders.find(o=>o.id===id).status,before,'verification preserves custody');handoffs.confirm(actor.id,{ticket:verified.ticket,...details});return h;}
  return {catalog,facilities,promotions,service,handoffs,input,client,staff,driver,slot,transfer,read,transaction,get actor(){return actor;},set actor(value){actor=value;}};
}
for(const mode of ['HOME_HOME','HOME_STORE','STORE_HOME','STORE_STORE'])test(`${mode}: one order through independent logistics and verified custody`,()=>{
  const h=harness();h.client();const input=h.input(mode),o=h.service.create(input);h.service.pay(o.id,'payment');h.staff();
  if(input.inbound==='DRIVER'){h.service.assign(o.id,'DRV-105','inbound');h.driver();h.service.driverAdvance(o.id,'inbound','EN_ROUTE');h.service.driverAdvance(o.id,'inbound','ARRIVED');h.transfer(o.id,'CUSTOMER_TO_DRIVER');h.service.driverAdvance(o.id,'inbound','TO_FACILITY');h.service.driverAdvance(o.id,'inbound','ARRIVED_AT_FACILITY');h.staff();h.transfer(o.id,'DRIVER_TO_FACILITY');}else h.transfer(o.id,'CUSTOMER_TO_FACILITY');
  h.service.inspect(o.id,'Inspección completada');h.service.process(o.id,'IN_PROCESS');h.service.process(o.id,'QUALITY_CONTROL');h.service.process(o.id,'READY');
  if(input.outbound==='DRIVER'){h.service.assign(o.id,'DRV-105','outbound');h.driver();assert.throws(()=>h.service.driverAdvance(o.id,'outbound','EN_ROUTE'));h.staff();h.transfer(o.id,'FACILITY_TO_DRIVER');h.driver();h.service.driverAdvance(o.id,'outbound','EN_ROUTE');h.service.driverAdvance(o.id,'outbound','ARRIVED');h.transfer(o.id,'DRIVER_TO_CUSTOMER',{recipient:'Cliente',relationship:'Titular'});}else h.transfer(o.id,'FACILITY_TO_CUSTOMER',{recipient:'Cliente',relationship:'Titular'});
  assert.equal(h.read().orders.filter(order=>order.trackingNumber===input.requestId).length,1);assert.equal(h.read().orders.find(order=>order.id===o.id).status,'COMPLETED');const used=h.read().handoffs.filter(x=>x.orderId===o.id&&x.status==='USED');assert.equal(used.length,mode==='HOME_HOME'?4:mode==='STORE_STORE'?2:3);
});
test('weight intake precedes payment; 22.5 LB, private adjustment, approval and incremental payment gate processing',()=>{
  const h=harness();h.client();const o=h.service.create(h.input('STORE_STORE',true));assert.equal(o.pricing.paymentStatus,'PENDING_AMOUNT');assert.equal(o.pricing.amountKnown,false);assert.throws(()=>h.service.pay(o.id,'early'),/pesaje/);h.staff();h.transfer(o.id,'CUSTOMER_TO_FACILITY');assert.throws(()=>h.service.process(o.id,'IN_PROCESS'));h.service.weigh(o.id,22.5,'LB');assert.equal(h.read().orders.find(x=>x.id===o.id).pricing.total,36);h.service.inspect(o.id,'Prendas revisadas');h.client();h.service.pay(o.id,'weight-pay');h.staff();h.service.proposeAdjustment(o.id,5,'Detalle interno sensible','Servicio adicional requerido');h.client();const view=h.service.customerView(o.id);assert.equal(view.adjustments[0].reason,undefined);const adj=h.read().adjustments[0];h.service.decideAdjustment(adj.id,true);assert.equal(h.read().orders.find(x=>x.id===o.id).pricing.amountDue,5);h.staff();assert.throws(()=>h.service.process(o.id,'IN_PROCESS'),/pago/);h.client();h.service.pay(o.id,'adjustment-pay');h.service.pay(o.id,'adjustment-pay');assert.equal(h.read().payments.filter(x=>x.orderId===o.id).length,2);h.staff();h.service.process(o.id,'IN_PROCESS');
});
test('capacity and failed rescheduling roll back atomically; duplicate checkout and unchanged reservations do not double book',()=>{
  const h=harness();h.client();const input=h.input();h.transaction(s=>s.timeSlots.find(x=>x.id===input.inboundSlotId).capacity=s.timeSlots.find(x=>x.id===input.inboundSlotId).reservedCount+1);const o=h.service.create(input);const booked=h.read();assert.equal(h.service.create(input).id,o.id);assert.equal(h.read().reservations.length,booked.reservations.length);assert.throws(()=>h.service.create({...input,requestId:'second'}),/completa/);assert.equal(h.read().orders.length,booked.orders.length);
  const full=h.slot('FACILITY_PICKUP',6);h.transaction(s=>{const x=s.timeSlots.find(x=>x.id===full.id);x.capacity=x.reservedCount=1;});const before=h.read();assert.throws(()=>h.service.change(o.id,'outbound',full.id,'CUSTOMER',o.deliveryAddress,'Cambio de horario'),/completa/);assert.deepEqual(h.read(),before);
});
test('method change recomputes mixed handoffs, revokes obsolete code and disallows started changes',()=>{
  const h=harness();h.client();const o=h.service.create(h.input('HOME_HOME'));h.service.pay(o.id,'pay');const old=h.read().handoffs.find(x=>x.orderId===o.id&&x.type==='DRIVER_TO_CUSTOMER');h.service.change(o.id,'outbound',h.slot('FACILITY_PICKUP',4).id,'CUSTOMER',o.deliveryAddress,'Retiraré personalmente');assert.equal(h.read().orders.find(x=>x.id===o.id).fulfillment.mode,'HOME_STORE');assert.equal(h.read().handoffs.find(x=>x.id===old.id).status,'REVOKED');assert.ok(h.read().handoffs.find(x=>x.orderId===o.id&&x.type==='FACILITY_TO_CUSTOMER'));
  h.staff();h.service.assign(o.id,'DRV-105','inbound');h.driver();h.service.driverAdvance(o.id,'inbound','EN_ROUTE');h.client();assert.throws(()=>h.service.change(o.id,'inbound',h.slot('DRIVER_PICKUP',2).id,'DRIVER',o.customerAddress,'Cambio tardío'),/inició/);
});
test('pending policies apply no arbitrary penalty; configured late cancellation creates one charge and only admin can waive',()=>{
  const h=harness();h.client();const o=h.service.create(h.input());h.service.cancel(o.id,'Ya no necesito el servicio');assert.equal(h.read().charges.length,0);assert.ok(h.read().reservations.filter(r=>r.orderId===o.id).every(r=>!r.active));h.staff();h.service.savePolicy({...h.read().businessPolicy,cutoffMinutes:100000,lateCancellationFee:7,blockNewOrdersOnCharges:true});h.client();const second=h.service.create(h.input());h.service.cancel(second.id,'Cancelación tardía');h.service.cancel(second.id,'Reintento');assert.equal(h.read().charges.length,1);assert.throws(()=>h.service.create(h.input()),/cargo pendiente/);const charge=h.read().charges[0];assert.throws(()=>h.service.settleCharge(charge.id,true,'Exoneración justificada'),/autorizada/);h.staff();h.service.settleCharge(charge.id,true,'Exoneración justificada');h.client();h.service.create(h.input());
});
test('rejected adjustments stay in review without an invented refund or automatic release',()=>{
  const h=harness();h.client();const o=h.service.create(h.input());h.service.pay(o.id,'paid');h.staff();h.transfer(o.id,'CUSTOMER_TO_FACILITY');h.service.inspect(o.id,'Inspección');h.service.proposeAdjustment(o.id,3,'Detalle técnico interno','Confirma este servicio');h.client();h.service.decideAdjustment(h.read().adjustments[0].id,false);const after=h.read().orders.find(x=>x.id===o.id);assert.equal(after.status,'CUSTOMER_APPROVAL_PENDING');assert.equal(after.pricing.paymentStatus,'PAID');assert.match(after.policyReview,/revisión/);h.staff();assert.throws(()=>h.service.process(o.id,'IN_PROCESS'),/ajuste/);
});
test('supervisor cannot configure policies or access another facility; customer cannot change someone else’s order',()=>{
  const h=harness();h.actor={id:'supervisor',name:'Supervisor',role:'SUPERVISOR',facilityId:'FAC-01'};assert.throws(()=>h.service.savePolicy(h.read().businessPolicy),/autorizada/);assert.throws(()=>h.service.weigh('SOL-WEIGHT-001',22.5,'LB'),/autorizada/);h.actor={id:'other-client',name:'Otra cuenta',role:'CLIENT'};assert.throws(()=>h.service.customerView('SOL-WEIGHT-001'),/titular/);
});


test('quote validates tax, logistics and coupons without booking or consuming promotion capacity',()=>{
  const h=harness();h.staff();h.service.savePolicy({...h.read().businessPolicy,taxRate:0.15,taxIncluded:false,pickupFee:2,deliveryFee:3});
  h.promotions.push({id:'TEST-PROMO',name:'Cupón',code:'TEST10',description:'Demo',status:'ACTIVE',discountType:'PERCENTAGE',discountValue:10,minOrderAmount:0,usageLimit:99,usageCount:0,startDate:'2020-01-01',endDate:'2099-12-31',applicableServices:['Todos los servicios']});
  h.client();const input={...h.input('HOME_HOME'),promoCode:'TEST10'},before=h.read(),quote=h.service.quote(input);
  assert.deepEqual(h.read(),before);assert.equal(quote.discount,Math.round(quote.subtotal*10)/100);assert.equal(quote.deliveryFee,5);assert.equal(quote.total,Math.round((quote.subtotal-quote.discount+5)*115)/100);
  const order=h.service.create(input);assert.equal(order.pricing.total,quote.total);assert.equal(h.read().promotionUses.filter(p=>p.orderId===order.id).length,1);
});
test('weight minimum coupon is rechecked after intake without rolling back the physical measurement',()=>{
  const h=harness();h.promotions.push({id:'P-WEIGHT',name:'Cupón',code:'PESO100',description:'Demo',status:'ACTIVE',discountType:'PERCENTAGE',discountValue:10,minOrderAmount:100,usageLimit:99,usageCount:0,startDate:'2020-01-01',endDate:'2099-12-31',applicableServices:['Todos los servicios']});
  h.client();const order=h.service.create({...h.input('STORE_STORE',true),promoCode:'PESO100'});h.staff();h.transfer(order.id,'CUSTOMER_TO_FACILITY');h.service.weigh(order.id,22.5,'LB');
  const state=h.read(),current=state.orders.find(o=>o.id===order.id);assert.equal(current.pricing.total,36);assert.equal(current.pricing.promoCodeApplied,undefined);assert.equal(state.weights.find(w=>w.orderId===order.id).weight,22.5);assert.ok(state.notifications.some(n=>n.orderId===order.id&&n.type==='PROMOTION'));
});
test('failed pickup preserves skipped route history and requires a fresh agenda before reassignment',()=>{
  const h=harness();h.client();const order=h.service.create(h.input('HOME_STORE'));h.service.pay(order.id,'P1');h.staff();const load=h.read().drivers.find(d=>d.id==='DRV-105').activeOrders;h.service.assign(order.id,'DRV-105','inbound');h.driver();h.service.driverAdvance(order.id,'inbound','EN_ROUTE');h.service.driverAdvance(order.id,'inbound','ARRIVED');h.service.recordFailure(order.id,'NO_SHOW','Cliente no salió');
  assert.equal(h.read().routeStops.filter(s=>s.orderId===order.id&&s.status==='SKIPPED').length,1);h.staff();h.service.resolveFailedPickup(order.id,'Coordinación telefónica con el cliente','Elige un nuevo horario de recogida.');
  assert.equal(h.read().drivers.find(d=>d.id==='DRV-105').activeOrders,load);assert.ok(h.read().routeStops.filter(s=>s.orderId===order.id).every(s=>s.status==='SKIPPED'));
  h.client();h.service.change(order.id,'inbound',h.slot('DRIVER_PICKUP',2).id,'DRIVER',order.customerAddress,'Nueva cita');h.staff();h.service.assign(order.id,'DRV-105','inbound');h.driver();h.service.driverAdvance(order.id,'inbound','EN_ROUTE');h.service.driverAdvance(order.id,'inbound','ARRIVED');h.transfer(order.id,'CUSTOMER_TO_DRIVER');assert.equal(h.read().routeStops.filter(s=>s.orderId===order.id&&s.status==='SKIPPED').length,2);
});
test('route ordering respects pickup prerequisites and rejects starting another active stop',()=>{
  const h=harness();h.client();const first=h.service.create(h.input('HOME_HOME')),second=h.service.create(h.input('HOME_HOME'));h.service.pay(first.id,'P1');h.service.pay(second.id,'P2');h.staff();h.service.assign(first.id,'DRV-105','inbound');h.service.assign(second.id,'DRV-105','inbound');const stops=h.read().routeStops.filter(s=>s.driverId==='DRV-105'&&s.status==='PENDING').sort((a,b)=>a.position-b.position);assert.equal(stops.filter(s=>s.orderId===first.id).length,2);
  assert.throws(()=>h.service.reorder('DRV-105',[stops[1].id,stops[0].id,...stops.slice(2).map(s=>s.id)]),/transferencia previa/);h.driver();h.service.driverAdvance(first.id,'inbound','EN_ROUTE');assert.throws(()=>h.service.driverAdvance(second.id,'inbound','EN_ROUTE'),/parada activa/);
});
test('slot hours, real calendar dates, reserved capacity and incompatible weight services are validated',()=>{
  const h=harness();h.staff();const slot={...h.slot('FACILITY_DROPOFF'),id:'INVALID'};for(const invalid of [{start:'24:00',end:'25:00'},{start:'09:00',end:'29:00'},{date:'2026-02-30'},{start:'06:00',end:'07:00'}])assert.throws(()=>h.service.saveSlot({...slot,...invalid}),/Revisa/);
  h.client();const input=h.input('STORE_STORE',true);h.catalog.find(c=>c.id===input.items[0].id).compatibleWithWeight=false;assert.throws(()=>h.service.create(input),/no admite/);
});

test('express catalog timing allows a pickup slot after its actual processing interval',()=>{
  const h=harness();h.client();const input=h.input();h.catalog.find(c=>c.id===input.items[0].id).estimatedHours=4;const slot=h.slot('FACILITY_PICKUP',1);const o=h.service.create({...input,outboundSlotId:slot.id});assert.equal(o.processingHours,4);assert.equal(o.fulfillment.outbound.timeSlotId,slot.id);
});


