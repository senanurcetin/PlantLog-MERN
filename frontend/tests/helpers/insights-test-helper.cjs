const fs=require('node:fs');
const ts=require('typescript');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../../src/demo/insights.ts'),'utf8');
const out=ts.transpileModule(src,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020
}}).outputText;
const moduleObj={exports:{}};
new Function('module','exports',out)(moduleObj,moduleObj.exports);
module.exports=moduleObj.exports;
