import { chromium } from '@playwright/test';
import fs from 'fs';
const routes=['/dashboard','/calendar','/appointments'];
(async()=>{fs.mkdirSync('verification/final/screens',{recursive:true});const b=await chromium.launch({headless:true});for(const r of routes){const p=await b.newPage({viewport:{width:1920,height:1080}});try{await p.goto('http://localhost:3000'+r,{timeout:5000});}catch(e){}await p.waitForTimeout(400);await p.screenshot({path:'verification/final/screens/'+r.replace(/\//g,'-')+'-dash.png',fullPage:true});await p.close();}await b.close();console.log('done-screens-partial');})();
