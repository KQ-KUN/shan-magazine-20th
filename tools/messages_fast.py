from importlib.metadata import version as package_version
"""Plan small Messages edits and render only pages whose native lines changed."""
from pathlib import Path
from collections import Counter
import argparse,hashlib,json,time,sys
import pdfplumber,pypdfium2 as pdfium
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/messages_revision_20261024'
sys.path.insert(0,str(ROOT/'tools'))
from messages_source import verify_source,EXPECTED
LAYOUT_FILES=['modules/messages.jsx','visual/messages_skin.jsx','spec/MESSAGES_TOKENS.json','spec/VISUAL_TOKENS.json','core/document.jsx','core/styles.jsx','core/parents.jsx','core/utils.jsx','visual/typography.jsx','visual/running_system.jsx','modules/print_book.jsx']
PDF=OUT/'SHAN_MESSAGES_REVISION_20261024.pdf';INDD=OUT/'SHAN_MESSAGES_REVISION_20261024.indd';REPORT=OUT/'MESSAGES_RUNTIME.json'
def read(p):return json.loads(Path(p).read_text('utf-8-sig'))
def write(p,v):Path(p).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
def digest(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def fingerprint():return digest_bytes(json.dumps({f:digest(ROOT/f) for f in LAYOUT_FILES},sort_keys=True).encode())
def digest_bytes(b):return hashlib.sha256(b).hexdigest()
def display_rows(rows,mapping):
 result=list(rows)
 for e in mapping['entries']:
  raw=rows[e['header_paragraph']-1];result[e['header_paragraph']-1]=raw[slice(*e['name_range'])]+'\t'+raw[slice(*e['role_range'])]
 return result

def select_mode(previous,rows,mapping,layout_hash,artifacts_match=True):
 if not previous or previous.get('status')!='PASS':return {'mode':'full','reason':'no-validated-baseline'}
 if previous.get('layout_fingerprint')!=layout_hash:return {'mode':'full','reason':'layout-baseline-missing-or-changed'}
 if not artifacts_match:return {'mode':'blocked','reason':'saved-artifact-changed'}
 if len(previous['paragraphs'])!=len(rows) or previous['people']!=len(mapping['entries']):return {'mode':'full','reason':'source-structure-changed'}
 if [e['header_paragraph'] for e in previous['entries']]!=[e['header_paragraph'] for e in mapping['entries']]:return {'mode':'full','reason':'entry-structure-changed'}
 centers=[f['source_paragraph'] for f in previous.get('source_formatting',[]) if f['kind']=='centered-title']
 underlines=[(f['source_paragraph'],f['start'],f['end']) for f in previous.get('source_formatting',[]) if f['kind']=='double-underline']
 if centers!=[f['source_paragraph'] for f in mapping.get('centered_titles',[])] or underlines!=[(f['source_paragraph'],f['start'],f['end']) for f in mapping.get('double_underlines',[])]:return {'mode':'full','reason':'source-format-contract-changed'}
 current=display_rows(rows,mapping);changed=[i+1 for i,(a,b) in enumerate(zip(previous['paragraphs'],current)) if a['text']!=b]
 if not changed and previous.get('source_sha256')==mapping['sha256']:return {'mode':'reuse','reason':'source-layout-artifacts-unchanged','changed_paragraphs':[]}
 if not changed:return {'mode':'full','reason':'source-format-or-package-changed'}
 if len(changed)>3:return {'mode':'full','reason':'multiple-paragraph-revision'}
 special={f['source_paragraph'] for f in previous.get('source_formatting',[])}
 if any(i in special for i in changed):return {'mode':'full','reason':'formatted-source-paragraph-changed'}
 return {'mode':'fast','reason':'small-text-correction','changed_paragraphs':changed}

def stamp():
 r=read(REPORT);assert r['status']=='PASS' and r['source_sha256']==EXPECTED and r['pages']==len(PdfReader(PDF).pages)
 assert [p['text'] for p in r['paragraphs']]==display_rows(verify_source(),read(ROOT/'content/MESSAGES_IMPORT_MAP.json'))
 r['layout_fingerprint']=fingerprint();r['artifact_hashes']={'pdf':digest(PDF),'indd':digest(INDD)};write(REPORT,r)

def plan():
 rows=verify_source();mapping=read(ROOT/'content/MESSAGES_IMPORT_MAP.json');previous=read(REPORT) if REPORT.exists() else None
 valid=bool(previous and PDF.exists() and INDD.exists() and previous.get('artifact_hashes')=={'pdf':digest(PDF),'indd':digest(INDD)})
 result=select_mode(previous,rows,mapping,fingerprint(),valid)
 if previous:write(OUT/'FAST_BASELINE.json',previous)
 write(OUT/'FAST_PLAN.json',result);print(result['mode'])

def changed_pages(before,after):
 pages=set()
 if not before or before.get('pages')!=after['pages']:return list(range(1,after['pages']+1))
 for old,new in zip(before['paragraphs'],after['paragraphs']):
  key=lambda p:[(l['text'],l['page_index'],l['column'],round(l['baseline_pt'],2)) for l in p['lines']]
  if old['style']!=new['style'] or key(old)!=key(new):pages.update(l['page_index'] for l in old['lines']);pages.update(l['page_index'] for l in new['lines'])
 return sorted(pages)

def verify_delta():
 start=time.perf_counter();r=read(REPORT);before=read(OUT/'FAST_BASELINE.json');mapping=read(ROOT/'content/MESSAGES_IMPORT_MAP.json')
 assert r['status']=='PASS' and not r['overset'] and r['fonts_installed'] and not r['missing_links'] and not r['focus']['active_page_is_parent']
 assert [p['text'] for p in r['paragraphs']]==display_rows(verify_source(),mapping)
 pages=changed_pages(before,r);reader=PdfReader(PDF);assert len(reader.pages)==r['pages']
 folder=OUT/'fast_previews'/f'{digest(PDF)[:12]}_pdfium-{package_version("pypdfium2")}_180';folder.mkdir(parents=True,exist_ok=True)
 with pdfplumber.open(PDF) as doc:
  for number in pages:
   page=doc.pages[number-1];native=reader.pages[number-1];pt=72/25.4;ox=float(native.trimbox.left);oy=float(native.mediabox.top)-float(native.trimbox.top);top=41 if number==1 else 23
   chars=[c for c in page.chars if oy+(top-3)*pt<=c['top'] and c['bottom']<=oy+243*pt]
   expected=''.join(l['text'].replace('\r','') for p in r['paragraphs'] for l in p['lines'] if l['page_index']==number)
   assert Counter(''.join(c['text'] for c in chars))==Counter(expected),'Changed-page PDF glyph mismatch'
 document=pdfium.PdfDocument(str(PDF))
 try:
  for number in pages:
   page=document[number-1];bitmap=page.render(scale=180/72)
   try:bitmap.to_pil().save(folder/f'page-{number}.png')
   finally:bitmap.close();page.close()
 finally:document.close()
 stamp();result={'status':'PASS','validation':'delta','pages':r['pages'],'rendered_pages':pages,'source_paragraphs':len(r['paragraphs']),'overset':False,'preview_directory':str(folder.relative_to(ROOT)),'validation_seconds':round(time.perf_counter()-start,3),'visual_review':'PENDING' if pages else 'UNCHANGED_REUSED'}
 write(OUT/'FAST_VALIDATION.json',result);print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('action',choices=['plan','stamp','verify']);args=parser.parse_args()
 {'plan':plan,'stamp':stamp,'verify':verify_delta}[args.action]()
