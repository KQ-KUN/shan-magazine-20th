"""Derive thin native entries from the project's verified assembly/folio builds."""
from pathlib import Path
r=Path(__file__).resolve().parents[1]
s=(r/'build/48_messages_v2_assembly.jsx').read_text(encoding='utf-8-sig').replace('exports/messages_v2','exports/history_v2').replace('content/MESSAGES_V2_BOOK.json','content/HISTORY_V2_BOOK.json').replace('Messages V2 Assembly','History V2 Assembly')
s=s.replace('originalToc=SHAN.editorialTocSkin.apply;','originalToc=SHAN.editorialTocSkin.apply,originalVerify=SHAN.printBook.verify;')
s=s.replace('  var report=SHAN.printBook.run(root,runtime);', '''  var guard=SHAN.assemblyV0.read(root,'exports/history_v2/ASSEMBLY_HOST_GUARD.json'),key;
  SHAN.assemblyV0.check(guard.status==='PASS','Missing host SHA256 guard');
  for(key in guard.small){if(guard.small.hasOwnProperty(key)){originalVerify.call(SHAN.printBook,root,key,guard.small[key]);}}
  // Windows SHA256 verifies large PDFs before dispatch. Native checks bind each
  // exact hash, byte length and modification time to those verified inputs.
  SHAN.printBook.verify=function(r,file,sha){
   var f=File(r+'/'+file),record=guard.files[file];
   this.check(record && record.sha256===sha && f.exists && f.length===record.bytes && Math.floor(f.modified.getTime()/1000)===record.modified_seconds,'Host/native input guard mismatch '+file);return f;
  };
  var report=SHAN.printBook.run(root,runtime);''')
s=s.replace('}finally{SHAN.editorialTocSkin.apply=originalToc;', '}finally{SHAN.printBook.verify=originalVerify;SHAN.editorialTocSkin.apply=originalToc;')
(r/'build/52_history_v2_assembly.jsx').write_text(s,encoding='utf-8-sig')
s=(r/'build/38_print_v7_folios.jsx').read_text(encoding='utf-8-sig').replace('exports/print_v7','exports/history_v2').replace('FOLIO_ONLY_V7','FOLIO_ONLY_HISTORY_V2')
s=s.replace('(function(){','#include "../modules/ebook_v8.jsx"\n(function(){',1)
needle="stage='create-folio-only-document';"
replacement="""stage='profile-date-correction';
  var manifest=a.read(root,'content/HISTORY_V2_ASSEMBLY_MANIFEST.json'),profile=null;
  for(var ci=0;ci<manifest.interior.length;ci+=1){if(manifest.interior[ci].id==='association_profile'){profile=manifest.interior[ci];}}
  var pr=SHAN.ebookV8.render(root,profile,3,{setStage:function(){}});
  a.check(pr.doc.pages.length===1,'Profile page count');
  pr.doc.save(File(out+'/components/ASSOCIATION_PROFILE_NATIVE.indd'));
  SHAN.printBook.exportPDF(pr.doc,File(out+'/components/association_profile_native.pdf'),false);
  stage='create-folio-only-document';"""
assert needle in s;s=s.replace(needle,replacement)
(r/'build/53_history_v2_folios.jsx').write_text(s,encoding='utf-8-sig')
print('Prepared thin entries using the existing native Assembly and folio workflows.')
