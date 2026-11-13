import {readdir,readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {join} from 'node:path';
const root=new URL('../',import.meta.url).pathname;
await rm(join(root,'dist'),{recursive:true,force:true});
await mkdir(join(root,'dist'),{recursive:true});
await cp(join(root,'public'),join(root,'dist'),{recursive:true});
const files=await readdir(join(root,'dist'));
if(!files.includes('index.html')||!files.includes('app.js')||!files.includes('courses.js'))throw Error('Missing required site files');
console.log('Easay static files built:',files.join(', '));
