"""Prepare traceable digital artwork and the separate unapproved print candidate."""
from pathlib import Path
import hashlib,json,shutil,sys,copy
from pypdf import PdfReader
from pypdf import PdfWriter
from pypdf.generic import ContentStream
import pymupdf as fitz
from collections import Counter
from resolve_print_v3 import folio_blocks

ROOT=Path(__file__).resolve().parents[1]
REL='exports/back_cover_release_20261102';OUT=ROOT/REL
PACKAGE=ROOT.parent/'task_inputs/back_cover_20261102'
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def write(p,x):
    p=ROOT/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n','utf-8')
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def artwork():
    OUT.mkdir(exist_ok=True)
    supplied=json.loads((PACKAGE/'checks/FILES_SHA256.json').read_text('utf-8'))
    stale_documents=[]
    for name,digest in supplied.items():
        if sha(PACKAGE/name)!=digest:
            assert name in ('SEND_TO_CODEX.txt','tasks/TASK_BACK_COVER_DIGITAL_PRINT.md'),name
            stale_documents.append({'file':name,'actual_sha256':sha(PACKAGE/name),'listed_sha256':digest})
    write(REL+'/HANDOFF_HASH_AUDIT.json',{'artwork_hashes':'PASS','stale_instruction_document_hashes':stale_documents})
    copies={'digital':'assets/cover/back/SHAN_BACK_COVER_DIGITAL_185x260.pdf','print_candidate':'assets/cover/back/PRINT_CANDIDATE/SHAN_BACK_COVER_PRINT_CANDIDATE_191x266_BLEED3.pdf','original':'assets/cover/back/sources/USER_ORIGINAL_164559.pdf'}
    sources={'digital':'assets/cover/back/SHAN_BACK_COVER_DIGITAL_185x260.pdf','print_candidate':'assets/cover/back/SHAN_BACK_COVER_PRINT_CANDIDATE_191x266_BLEED3.pdf','original':'sources/originals/USER_ORIGINAL_164559.pdf'}
    rows={}
    for role,target in copies.items():
        dest=ROOT/target;dest.parent.mkdir(parents=True,exist_ok=True)
        if dest.exists():assert sha(dest)==sha(PACKAGE/sources[role])
        else:shutil.copy2(PACKAGE/sources[role],dest)
        r=PdfReader(dest);assert not r.is_encrypted and len(r.pages)==1;p=r.pages[0];assert p.rotation==0
        box=lambda b:[round(float(v)*25.4/72,5) for v in b]
        rows[role]={'file':target,'sha256':sha(dest),'bytes':dest.stat().st_size,'pages':1,'rotation':p.rotation,'has_text':bool(p.extract_text().strip()),'boxes_mm':{name:box(getattr(p,name)) for name in ['mediabox','cropbox','trimbox','bleedbox','artbox']},'images':[[x.image.width,x.image.height] for x in p.images]}
        assert rows[role]['images']==[[1056,1490]] and not rows[role]['has_text']
        dims=lambda b:[float(b.width)*25.4/72,float(b.height)*25.4/72]
        if role!='original':
            assert all(abs(a-b)<.002 for a,b in zip(dims(p.trimbox),[185,260]))
            assert all(abs(a-b)<.002 for a,b in zip(dims(p.mediabox),[191,266] if role=='print_candidate' else [185,260]))
    manifest={'digital':dict(rows['digital'],status='APPROVED_FOR_DIGITAL',assembly_mode='DIRECT_PDF_LINK_100_PERCENT',supersedes='procedural back-cover prototype'),'print_candidate':dict(rows['print_candidate'],status='PRINT_CANDIDATE_NOT_APPROVED',effective_ppi=140.4,icc='PRINTER_PENDING',pdfx='NOT_CERTIFIED',spine='WIDTH_PENDING',cover_spread='NOT_GENERATED'),'source':rows['original'],'front_cover':'assets/cover/SHAN_FRONT_COVER_EMBLEM_R1.pdf','front_cover_reason':'Current approved project cover retained; handoff FINAL path is superseded','cover_inside_front':'TRULY_BLANK','cover_inside_back':'TRULY_BLANK'}
    write('content/BACK_COVER_MANIFEST.json',manifest);write(REL+'/ARTWORK_PREFLIGHT.json',manifest)
    shutil.copy2(PACKAGE/'spec/BACK_COVER_HANDOFF.json',ROOT/'spec/BACK_COVER_HANDOFF.json')
    shutil.copy2(PACKAGE/'tasks/TASK_BACK_COVER_DIGITAL_PRINT.md',ROOT/'tasks/TASK_BACK_COVER_DIGITAL_PRINT.md')
    t=read('spec/MESSAGES_TOKENS.json');t['tail_balance_pages']=1;t['styles']['P_Message_Header']['space_before_mm']=3.5;t['styles']['P_Message_Header']['space_after_mm']=1.5
    write('spec/MESSAGES_COMPACT_TOKENS.json',t)
    display=read('content/EDITORIAL_TOC_DISPLAY.json')
    copyright='《第一届“月曜杯”山东高校科幻联合征文幕后二三事》《煎饼回忆录》《宇宙很大，科幻更大》《肖兆旭：肉体工作，灵魂爱好，心怀热爱就好》首发于《零重力报》，本刊予以转载。'
    display['short_copyright'].append(copyright);display['authorization']='Current user request: add first-publication attribution for four named articles; preserve original source.'
    write('content/EDITORIAL_TOC_RELEASE_DISPLAY.json',display)
    write('workflow/BACK_COVER_RELEASE_SCOPE.json',{'authorization':'Digital back integration, print candidate registration, named whitespace fixes, copyright addition, native validation and GitHub commit/push','preserve_frozen_source_files':True,'editable':['modules/print_book.jsx','modules/chapter_art.jsx','modules/toc.jsx','modules/back_cover.jsx','content/BACK_COVER_MANIFEST.json','content/EDITORIAL_TOC_RELEASE_DISPLAY.json','content/BACK_COVER_BOOK.json','content/BACK_COVER_ASSEMBLY_MANIFEST.json','spec/MESSAGES_COMPACT_TOKENS.json','workflow/MODULE_STATUS.json','spec/COVER_ARTWORK_STATUS.md','build/62_back_cover_refine.jsx','build/63_back_cover_folios.jsx','build/64_back_cover_assembly.jsx','tools/back_cover_release.py','tools/run_back_cover.ps1','tests/back_cover.test.cjs','workflow/BACK_COVER_ACCEPTANCE.json','workflow/BACK_COVER_RELEASE_SCOPE.json','spec/BACK_COVER_HANDOFF.json','tasks/TASK_BACK_COVER_DIGITAL_PRINT.md']})
    print('PASS supplied hashes, PDF boxes, original image dimensions; artwork registered')

def footer(path,index):
    with fitz.open(path) as d:
        rows=[s['text'].strip() for b in d[index].get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] if 'Consolas' in s['font'] and s['bbox'][1]>700 and s['text'].strip().isdigit()]
    assert len(rows)<=1
    return int(rows[0]) if rows else None

def plan():
    baseline=read('exports/image_review_20261102/RESOLVED_BOOK_PLAN.json')
    sources={c['id']:c for c in read('exports/image_review_20261102/PRINT_COMPONENT_INPUTS.json')['components']}
    manifest=read('content/HISTORY_FULL_ASSEMBLY_MANIFEST.json')
    manifest['chapter_start_policy']='DIGITAL_CONTINUOUS_ANY_SIDE'
    manifest['cover']['back']={'status':'APPROVED_FOR_DIGITAL','file':read('content/BACK_COVER_MANIFEST.json')['digital']['file'],'include':True}
    for c in manifest['interior']:c['start_on_recto']=False
    write('content/BACK_COVER_ASSEMBLY_MANIFEST.json',manifest)
    n=1;folios=[]
    for c in baseline['components']:
        if c['kind'] not in ('chapter','editorial_toc','toc'):
            path=sources[c['id']]['file']
            if c['id'] in ('memoir_gloomy','feature_now','messages'):path=REL+'/'+c['id']+'.pdf'
            c['file']=path;c['sha256']=sha(ROOT/path);c['page_count']=len(PdfReader(ROOT/path).pages)
            for i in range(c['page_count']):
                old=footer(ROOT/path,i)
                if old is not None and old!=n+i:folios.append({'component_id':c['id'],'component_page':i+1,'old_folio':old,'new_folio':n+i})
        c.update(start_page=n,end_page=n+c['page_count']-1,start_side='RIGHT_HAND' if n%2 else 'LEFT_HAND')
        n+=c['page_count']
    odd=(n-1)%2==1
    baseline.update(interior_pages=n if odd else n-1,terminal_parity_blank=odd,parity_transitions=[],folio_rebase=folios,mode='DIGITAL_CONTINUOUS_WITH_APPROVED_BACK')
    write(REL+'/RESOLVED_BOOK_PLAN.json',baseline)
    config=read('content/HISTORY_FULL_BOOK.json');config.update(output=REL,output_version='BACK_RELEASE',source_plan='content/BACK_COVER_ASSEMBLY_MANIFEST.json',baseline=REL+'/RESOLVED_BOOK_PLAN.json',digital_continuous=True,digital_back=read('content/BACK_COVER_MANIFEST.json')['digital'],editorial_display='content/EDITORIAL_TOC_RELEASE_DISPLAY.json')
    write('content/BACK_COVER_BOOK.json',config)
    print('PASS continuous digital plan interior',baseline['interior_pages'],'blank parity',odd,'reader',baseline['interior_pages']+4)

def components():
    p=read(REL+'/RESOLVED_BOOK_PLAN.json');over=PdfReader(OUT/'FOLIO_ONLY_BACK_RELEASE.pdf');rows=[]
    (OUT/'components').mkdir(exist_ok=True)
    for c in p['components']:
        if c['kind'] in ('chapter','toc','editorial_toc'):continue
        src=ROOT/c['file'];reader=PdfReader(src);w=PdfWriter();w.append(reader)
        for x in [x for x in p['folio_rebase'] if x['component_id']==c['id']]:
            page=w.pages[x['component_page']-1];ops,matches=folio_blocks(page,w,x['old_folio']);assert len(matches)==1
            lo,hi=matches[0];s=ContentStream(page.get_contents(),w);s.operations=ops[:lo]+[o for o in ops[lo:hi+1] if o[1]!=b'Tj']+ops[hi+1:];page.replace_contents(s);page.merge_page(over.pages[x['new_folio']-1])
        path=REL+'/components/'+c['id']+'.pdf'
        with (ROOT/path).open('wb') as f:w.write(f)
        with fitz.open(src) as a,fitz.open(ROOT/path) as b:
            for ap,bp in zip(a,b):
                def body(page):return [(s['text'],tuple(round(v,2) for v in s['bbox'])) for bl in page.get_text('dict')['blocks'] if 'lines' in bl for ln in bl['lines'] for s in ln['spans'] if not ('Consolas' in s['font'] and s['bbox'][1]>700)]
                assert body(ap)==body(bp),c['id']
                assert Counter(x['digest'] for x in ap.get_image_info(hashes=True))==Counter(x['digest'] for x in bp.get_image_info(hashes=True)),c['id']
        rows.append({'id':c['id'],'file':path,'sha256':sha(ROOT/path),'source_sha256':c['sha256'],'page_count':c['page_count']})
    write(REL+'/PRINT_COMPONENT_INPUTS.json',{'status':'PASS','source_components_untouched':True,'components':rows,'body_and_image_identity_verified':True})
    config=read('content/BACK_COVER_BOOK.json');files={}
    for c in [c for c in p['components'] if c['kind'] not in ('chapter','toc','editorial_toc')]+rows+[{'file':config['approved_cover'],'sha256':p['approved_cover_sha256']},config['digital_back']]:
        f=ROOT/c['file'];assert sha(f)==c['sha256'];st=f.stat();files[c['file']]={'sha256':c['sha256'],'bytes':st.st_size,'modified_seconds':int(st.st_mtime)}
    small={name:sha(ROOT/name) for name in [REL+'/RESOLVED_BOOK_PLAN.json',REL+'/PRINT_COMPONENT_INPUTS.json','content/BACK_COVER_BOOK.json','content/BACK_COVER_MANIFEST.json','content/EDITORIAL_TOC_RELEASE_DISPLAY.json']}
    write(REL+'/ASSEMBLY_HOST_GUARD.json',{'status':'PASS','files':files,'small':small})
    print('PASS rebased components, unchanged text geometry and image pixels')

def finish():
    report=read(REL+'/FINAL_PRINT_REPORT.json');assert report['status']=='PASS' and report['back_cover']['status']=='PASS'
    src=PdfReader(OUT/'SHAN_REVIEW_BACK_RELEASE.pdf');w=PdfWriter()
    for p in src.pages[:-1]:w.add_page(p);w.pages[-1].cropbox=w.pages[-1].trimbox
    # Keep the accepted external PDF page as the final source of truth, avoiding
    # InDesign's different treatment of the source's clipped raster envelope.
    back=PdfReader(ROOT/read('content/BACK_COVER_MANIFEST.json')['digital']['file'])
    assert len(back.pages)==1
    w.add_page(back.pages[0]);w.pages[-1].cropbox=w.pages[-1].trimbox
    w.page_layout='/TwoPageRight';w.add_metadata({'/Title':'山 — 电子版（正式封底与留白修订）','/Subject':'Digital back approved; print candidate not approved'})
    dest=ROOT.parent/'交付文件/正式封底与留白修订_20261103';dest.mkdir(exist_ok=True)
    with (dest/'山_完整电子版_正式封底.pdf').open('wb') as f:w.write(f)
    print('PASS final electronic PDF',len(w.pages),'pages')

def reader_guard():
    guard=read(REL+'/ASSEMBLY_HOST_GUARD.json');path=OUT/'SHAN_INTERIOR_PRINT_BACK_RELEASE.pdf';st=path.stat();digest=sha(path);name=path.relative_to(ROOT).as_posix()
    guard['files'][name]={'sha256':digest,'bytes':st.st_size,'modified_seconds':int(st.st_mtime)}
    guard.update(interior_file=name,interior_sha256=digest,interior_pages=len(PdfReader(path).pages))
    write(REL+'/READER_RESUME_GUARD.json',guard)
    print('PASS saved interior resume guard')

if __name__=='__main__':{'artwork':artwork,'plan':plan,'components':components,'finish':finish,'reader-guard':reader_guard}[sys.argv[1]]()
