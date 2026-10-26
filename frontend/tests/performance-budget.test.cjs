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


test('six scientific labs are separate production chunks, not embedded in initial entry', () => {
    const names = [
        'ControlledComparisons', 'EligibilitySensitivityLab',
        'LifecycleFaultLab', 'TemporalBoundaryLab',
        'EvidenceMatrixLab', 'EvidenceReviewWorkbench',
    ];
    const entry = files.filter(name => /^index-[\\w-]+\\.js$/.test(name));
    assert.equal(entry.length, 1, 'Vite must emit one entry JavaScript bundle');
    const emitted = [];
    for (const name of names) {
        const chunks = files.filter(file =>
            new RegExp('^' + name + '-[\\w-]+\\.js$').test(file));
        assert.equal(chunks.length, 1, name + ' must be a standalone lazy module');
        emitted.push({ name, compressedBytes: gzipSync(
            readFileSync(path.join(js, chunks[0])), {level: 9}).length });
    }
    const initialGzip = gzipSync(readFileSync(path.join(js, entry[0])), {level: 9}).length;
    // A total-bundle budget alone would hide accidental reintroduction of
    // eager code. The formerly monolithic guest build was ~104 KiB gzipped.
    assert.ok(initialGzip <= 95 * 1024,
        'Initial guest entry unexpectedly contains heavy laboratory code: ' + initialGzip);
    const html = readFileSync(path.join(root, 'index.html'), 'utf8');
    for (const name of names) {
        assert.doesNotMatch(html, new RegExp(name + '-[\\w-]+\\.js'),
            'HTML must not eagerly preload the ' + name + ' laboratory');
    }
    console.log('PUBLIC_DEMO_LAZY_CHUNKS ' + JSON.stringify({
        initialEntryGzipBytes: initialGzip, experiments: emitted,
    }));
});
