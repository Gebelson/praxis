import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveLanguage} from '../../src/i18n/locale.js';
test('manual choice takes precedence over device language',()=>{assert.equal(resolveLanguage({saved:'es',languages:['en-US']}),'es');assert.equal(resolveLanguage({requested:'en',saved:'pt',languages:['es-MX']}),'en');});
test('regional device languages match supported languages in preference order',()=>{assert.equal(resolveLanguage({languages:['es-AR','en-US']}),'es');assert.equal(resolveLanguage({languages:['fr-FR','en-GB']}),'fr');assert.equal(resolveLanguage({languages:['pt-PT']}),'pt-PT');});
test('unsupported or invalid preferences fall back safely',()=>{assert.equal(resolveLanguage({saved:'bad',requested:'bad',languages:['ja-JP']}),'pt');assert.equal(resolveLanguage({languages:[]}),'pt');});

test('new language variants and saved preferences resolve correctly',()=>{assert.equal(resolveLanguage({languages:['zh-CN']}),'zh');assert.equal(resolveLanguage({languages:['fr-CA']}),'fr');assert.equal(resolveLanguage({saved:'pt-PT',languages:['pt-BR']}),'pt-PT');assert.equal(resolveLanguage({requested:'pt_PT'}),'pt-PT');});

test('catalog includes every new language for all entries',async()=>{const {readFile}=await import('node:fs/promises');const messages=JSON.parse(await readFile(new URL('../../src/i18n/messages.json',import.meta.url),'utf8'));for(const [key,value] of Object.entries(messages))for(const code of ['en','es','fr','zh','pt-PT'])assert.ok(typeof value[code]==='string'&&value[code].length>0,key+' / '+code);});
