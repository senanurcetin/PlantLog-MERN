const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync,readdirSync,statSync}=require('node:fs');
const path=require('node:path');
const {gzipSync}=require('node:zlib');
const root=path.resolve(__dirname,'../dist');
const js=path.join(root,'assets');
const files=readdirSync(js).filter(name=>/\.(js|css)$/.test(name));
const limits={js:180*1024,css:32*1024};
test('public demo bundle stays within reproducible gzip size budgets',()=>{
    const summary={js:0,css:0};
    assert.ok(files.some(f=>f.endsWith('.js')),'built JS must exist');
    assert.ok(files.some(f=>f.endsWith('.css')),'built CSS must exist');
    for(const file of files){
        const type=file.endsWith('.js')?'js':'css';
        summary[type]+=gzipSync(readFileSync(path.join(js,file)),{level:9}).length;
    }
    for(const type of ['js','css']){
        assert.ok(summary[type]<=limits[type],
            type+' exceeds '+limits[type]+' compressed bytes: '+summary[type]);
    }
    console.log('PUBLIC_DEMO_BUNDLE_BUDGET '+JSON.stringify(summary));
});
test('guest-only HTML includes current NEXUS app but not remote runtime scripts',()=>{
    const index=readFileSync(path.join(root,'index.html'),'utf8');
    assert.match(index,/<title>NEXUS \/ PlantLog/);
    assert.doesNotMatch(index,/<script[^>]+src="https?:\/\//i);
    assert.equal(statSync(path.join(root,'nexus-mark.svg')).isFile(),true);
});
