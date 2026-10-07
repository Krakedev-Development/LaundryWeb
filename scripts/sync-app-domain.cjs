const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const app=path.resolve(root,'../LaundryApp');
fs.mkdirSync(path.join(app,'src/services/domain'),{recursive:true});
fs.mkdirSync(path.join(app,'src/domain'),{recursive:true});
fs.mkdirSync(path.join(app,'src/services/geo/mapbox'),{recursive:true});
for(const name of ['geo.types','demo','DemoGeoProvider','DispatchService','RoutingService','mapbox/MapboxGeoProvider'])fs.copyFileSync(path.join(root,`src/services/geo/${name}.ts`),path.join(app,`src/services/geo/${name}.ts`));
for(const name of ['fulfillment','HandoffService','BusinessService','BusinessDemoData']) {
  let source=fs.readFileSync(path.join(root,`src/services/${name}.ts`),'utf8');
  source=source.replace(/from (['"])\.\.\/types\1/g,"from '../../domain/models'");
  fs.writeFileSync(path.join(app,`src/services/domain/${name}.ts`),source);
}
fs.writeFileSync(path.join(app,'src/domain/models.ts'),fs.readFileSync(path.join(root,'src/types/index.ts'),'utf8').replace("from '../services/fulfillment'","from '../services/domain/fulfillment'"));
if(process.argv.includes('--fixtures')) {
  require('../tests/ts-loader.cjs');
  const values=new Map();global.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
  const {storageService:storage}=require('../src/services/storage.ts');
  const workflow=storage.getWorkflow();workflow.customers.forEach(c=>{delete c.kycDocumentUrl;delete c.kycSelfieUrl;});workflow.drivers.forEach(d=>d.avatar='');
  fs.writeFileSync(path.join(app,'src/domain/demo.json'),JSON.stringify({workflow,facilities:storage.getFacilities(),catalog:storage.getCatalog(),promotions:storage.getPromotions(),rewards:storage.getRewards()},null,2));
}
