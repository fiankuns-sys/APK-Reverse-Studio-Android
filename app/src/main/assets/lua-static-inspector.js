/* Read-only Lua source scanner. This never compiles, executes or injects Lua. */
(function(global) {
'use strict';
const MAX_SOURCE=150000, MAX_TOKENS=25000, MAX_ITEMS=40;
function lex(input) {
  const tokens=[],warnings=[];let i=0,line=1, truncated=false;
  function move(end){for(let k=i;k<end;k++)if(input[k]==='\n')line++;i=end;}
  function token(kind,text,at){if(tokens.length<MAX_TOKENS)tokens.push({kind,text:text.slice(0,512),line:at});else truncated=true;}
  while(i<input.length) {
    if(tokens.length>=MAX_TOKENS){truncated=true;break;}
    const c=input[i], start=line;
    if(/\s/.test(c)){move(i+1);continue;}
    if(input.startsWith('--',i)) {
      const h=/^--\[(=*)\[/.exec(input.slice(i,i+32));
      if(h){const closing=']'+h[1]+']';const end=input.indexOf(closing,i+h[0].length);if(end<0){warnings.push('Komentar panjang tidak ditutup');move(input.length);}else move(end+closing.length);}
      else {const end=input.indexOf('\n',i+2);move(end<0?input.length:end);}
      continue;
    }
    if(c==='['){
      const h=/^\[(=*)\[/.exec(input.slice(i,i+30));
      if(h){const closing=']'+h[1]+']';const end=input.indexOf(closing,i+h[0].length);if(end<0){warnings.push('String panjang tidak ditutup');token('string',input.slice(i+h[0].length),start);move(input.length);}else{token('string',input.slice(i+h[0].length,end),start);move(end+closing.length);}continue;}
    }
    if(c==='"'||c==="'"){
      let j=i+1,value='',closed=false;
      while(j<input.length){
        if(input[j]==='\\'&&j+1<input.length){value+=input[j+1];j+=2;continue;}
        if(input[j]===c){closed=true;j++;break;}
        value+=input[j++];if(value.length>2000){value=value.slice(0,2000);}
      }
      if(!closed)warnings.push('String tidak ditutup di baris '+start);
      token('string',value,start);move(j);continue;
    }
    const id=/^[a-zA-Z_][a-zA-Z0-9_]*/.exec(input.slice(i,i+128));
    if(id){token('id',id[0],start);move(i+id[0].length);continue;}
    const num=/^[0-9]+(?:\.[0-9]+)?/.exec(input.slice(i,i+80));
    if(num){token('number',num[0],start);move(i+num[0].length);continue;}
    token('punct',c,start);move(i+1);
  }
  if(truncated)warnings.push('Token dibatasi; hasil analisis mungkin belum lengkap');
  return {tokens,warnings,tokenTruncated:truncated};
}
const callRules=[
 [/^(?:load|loadfile|loadstring)$/,'dynamic','Pemanggilan pemuat kode; telaah konteks penggunaannya'],
 [/^dofile$/,'filesystem','Pemanggilan pembaca skrip lain; telaah dependensi'],
 [/^os\.(?:execute|remove|rename)$/,'process','Operasi sistem/berkas; tinjau hak aksesnya'],
 [/^io\.(?:popen|open)$/,'filesystem','Operasi I/O; periksa input dan outputnya'],
 [/^package\.loadlib$/,'native','Pemuatan library native; validasi kompatibilitas platform'],
 [/^debug\./,'debug','Penggunaan API debugging; bukan bukti penyalahgunaan'],
 [/^ffi\.(?:load|cdef)$/,'native','Referensi antarmuka native; analisis ABI diperlukan']
];
function scan(raw){
 if(typeof raw!=='string')return {status:'error',message:'Sumber Lua harus berupa teks'};
 if(raw.length>MAX_SOURCE)return {status:'error',message:'Cuplikan melewati batas 150.000 karakter; pecah menjadi beberapa file'};
 if(!raw.trim())return {status:'empty',message:'Tempel kode Lua untuk pemeriksaan offline'};
 const parsed=lex(raw),t=parsed.tokens;
 const deps=[],defs=[],findings=[],platform=[],seen=new Set();
 function add(out,key,value){const k=key+'|'+value;if(seen.has(k)||out.length>=MAX_ITEMS)return;seen.add(k);out.push(value);}
 function asName(i) {
   if(!t[i]||t[i].kind!=='id')return null;
   let name=t[i].text,j=i+1;
   while(t[j]&&(t[j].text==='.'||t[j].text===':')&&t[j+1]&&t[j+1].kind==='id'&&j-i<14){name+=t[j].text+t[j+1].text;j+=2;}
   return {name,end:j};
 }
 for(let i=0;i<t.length;i++){
   const q=t[i];
   if(q.kind==='string'){
     if(/(?:[a-zA-Z]:\\|\.dll\b|\.exe\b)/i.test(q.text))add(platform,'pc'+q.line+'|'+q.text.slice(0,30),{platform:'Windows PC',line:q.line,reason:'Referensi path/ekstensi Windows',sample:q.text.slice(0,90)});
     else if(/(?:lib\/(?:arm64-v8a|armeabi-v7a)\/|\.so\b|\/data\/user\/0\/)/i.test(q.text))add(platform,'android'+q.line+'|'+q.text.slice(0,30),{platform:'Android / Unix',line:q.line,reason:'Referensi lokasi/library Android atau Unix',sample:q.text.slice(0,90)});
     continue;
   }
   if(q.kind!=='id')continue;
   if(q.text==='function'||(q.text==='local'&&t[i+1]?.text==='function')){
     const pos=q.text==='local'?i+2:i+1, parsedName=asName(pos);
     if(parsedName)add(defs,'def'+q.line+'|'+parsedName.name,{name:parsedName.name,line:q.line});
   }
   const call=asName(i);
   if(!call)continue;
   const next=t[call.end];if(!next||!(next.text==='('||next.kind==='string'||next.text==='{'))continue;
   const name=call.name;
   if(name==='require'){
     const arg=next.text==='('?t[call.end+1]:next;
     if(arg&&arg.kind==='string')add(deps,'dep'+arg.text,{module:arg.text.slice(0,120),line:q.line,kind:'require'});
     else add(findings,'dynamic-require'+q.line,{kind:'dependency',line:q.line,detail:'Nama dependensi dinamis; tidak dapat dipastikan secara statis'});
   }
   for(const [re,kind,detail] of callRules){
     if(re.test(name))add(findings,kind+'|'+q.line+'|'+name,{kind,line:q.line,symbol:name,detail});
   }
 }
 const status=parsed.tokenTruncated?'partial':'ok';
 return {status,sourceLength:raw.length,lines:raw.split('\n').length,tokenCount:t.length,dependencies:deps,functions:defs,findings,platformHints:platform,warnings:parsed.warnings,limits:[
 'Analisis statis heuristik, bukan parser Lua lengkap atau bukti perilaku runtime',
 'Komentar dan string dipisahkan agar referensi tidak keliru dianggap sebagai pemanggilan',
 'Skrip tidak dijalankan, tidak diinjeksi, tidak memodifikasi aplikasi atau game',
 'Kompatibilitas Android harus diuji pada proyek yang dimiliki atau berizin'
 ]};
}
global.LuaStaticInspector=Object.freeze({scan,MAX_SOURCE});
})(typeof window!=='undefined'?window:globalThis);
