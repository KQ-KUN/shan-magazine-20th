"""V8 ebook inputs/finishing: no color conversion, immutable approved streams."""
from pathlib import Path
import argparse, copy, hashlib, json, shutil, subprocess
from pypdf import PdfReader, PdfWriter
from monday_cup_source import paragraphs

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'exports/ebook_v8'
BASE='a6825d5dfe13752cf2576714750fe96aa534ba06'

def read(path): return json.loads((ROOT/path).read_text('utf-8-sig'))
def write(path,value):
    path=ROOT/path;path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def digest(path): return hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
def git(*args): return subprocess.check_output(['git','-c',f'safe.directory={ROOT.as_posix()}',*args],cwd=ROOT)

def prepare():
    OUT.mkdir(parents=True,exist_ok=True)
    old=json.loads(git('show',BASE+':content/XINGYUE.json'))
    current=read('content/XINGYUE.json')
    assert [{k:v for k,v in p.items() if k!='block'} for p in old['paragraphs']]==[{k:v for k,v in p.items() if k!='block'} for p in current['paragraphs']]
    assert json.loads(git('show',BASE+':spec/CONTENT_MANIFEST.json'))==read('spec/CONTENT_MANIFEST.json')
    manifest=read('content/ASSEMBLY_V0_MANIFEST.json');info=read('content/FICTION_WORK_INFO.json');name=read('content/INTERVIEW_NAME_CORRECTION_MAP.json')
    fixtures={};sources={}
    for c in manifest['interior']:
        if c['kind'] in ('interview','fiction','memoir','feature','front_note'):
            source=name['layout_source'] if c['id']=='interview_xiao' else c.get('layout_source',c['source'])
            rows=paragraphs(ROOT/source)
            if c['kind']=='feature':
                for item in read(c['media_manifest'])['media']:rows=[p.replace('[['+item['slot']+']]','') for p in rows]
            if c['kind']=='fiction':
                # Authorized pre-existing work-info overlay, immediately after Author.
                rows.insert(2,info[c['id']])
            fixtures[c['id']]=rows
        if c.get('source'):sources[c['source']]=digest(c['source'])
    fixture={'paragraphs':fixtures,'sources':sources,'normalization':['Remove U+FFFC anchored-object control characters only; counts match placed graphics.','Remove paragraph-ending CR; retain source empty paragraphs.','Ignore one leading U+FEFF Word import encoding marker when source does not contain it.','No trimming, Unicode/space/punctuation normalization.'],'baseline_commit':BASE}
    write('exports/ebook_v8/SOURCE_FIXTURE.json',fixture)
    protected={}
    status=read('workflow/MODULE_STATUS.json')
    for module in status.values():
        if module.get('status')=='FROZEN':
            for path in module['scope']:protected[path]=digest(path)
    for path in git('ls-files','-z').decode('utf-8').split('\0'):
        if path and (path.lower().endswith('.docx') or 'history' in path.lower() or path in ('spec/CONTENT_MANIFEST.json','content/ASSEMBLY_V0_MANIFEST.json','content/TOC_MANIFEST.json','assets/cover/SHAN_FRONT_COVER_FINAL.pdf','spec/CHAPTER_ART_TOKENS.json','modules/chapter_art.jsx')):
            protected[path]=digest(path)
    for path,hash_ in protected.items():
        assert hash_==hashlib.sha256(git('show',BASE+':'+path)).hexdigest() or (ROOT/path).read_text('utf-8-sig') .replace('\r\n','\n')==git('show',BASE+':'+path).decode('utf-8-sig').replace('\r\n','\n'), 'Protected baseline changed: '+path
    write('exports/ebook_v8/PROTECTED_HASHES.json',protected)
    assert digest('assets/ebook_v8/ASSOCIATION_EMBLEM_USER_SUPPLIED.png')=='730f6ddb131faa4ad5019d0eb788854845d980182573c029963b4e0ca1851a82'
    print('PASS V8 source: approved XingYue 28 paragraphs; DOCX/History/cover/intros protected;',len(fixtures),'article fixtures')

def resolve():
    native=read('exports/ebook_v8/STANDALONE_RUNTIME.json');assert native['status']=='PASS'
    old=read('exports/print_v7/RESOLVED_BOOK_PLAN.json');inputs={c['id']:c for c in read('exports/print_v7/PRINT_COMPONENT_INPUTS.json')['components']}
    records={c['id']:c for c in native['components']};components=[];copies=[];transitions=[];next_page=1
    for old_entry in old['components']:
        entry=copy.deepcopy(old_entry);c=next(c for c in read('content/ASSEMBLY_V0_MANIFEST.json')['interior'] if c['id']==entry['id'])
        if c.get('start_on_recto') and next_page%2==0:transitions.append({'page':next_page,'before':c['id'],'reason':'Recto chapter start'});next_page+=1
        if c['id'] in records:
            record=records[c['id']];assert record['start_page']==next_page
            entry.update(file=record['file'],sha256=digest(record['file']),page_count=record['pages'],overset=False)
        elif c['kind'] not in ('chapter','editorial_toc'):
            assert c['id'] in ('history','messages_pending'), 'Unexpected passthrough '+c['id']
            source=inputs[c['id']];assert digest(source['file'])==source['sha256']
            entry.update(file=source['file'],sha256=source['sha256'])
            if c['id']=='history':assert next_page==old_entry['start_page'], 'History folio rule protected'
        entry.update(start_page=next_page,end_page=next_page+entry['page_count']-1,start_side='RIGHT_HAND' if next_page%2 else 'LEFT_HAND')
        if c['kind'] not in ('chapter','editorial_toc'):
            copies.append({'id':entry['id'],'file':entry['file'],'sha256':entry['sha256'],'source_sha256':entry['sha256'],'page_count':entry['page_count'],'images_converted':False,'color_conversion':'NONE'})
        components.append(entry);next_page+=entry['page_count']
    plan=copy.deepcopy(old);plan.update(baseline_commit=BASE,interior_pages=next_page-1,components=components,parity_transitions=transitions,folio_rebase=[],mode='EBOOK_NO_COLOR_CONVERSION')
    write('exports/ebook_v8/RESOLVED_BOOK_PLAN.json',plan)
    write('exports/ebook_v8/PRINT_COMPONENT_INPUTS.json',{'status':'PASS','source_components_untouched':True,'conversion':'NONE; native exports + exact V7 History passthrough','components':copies})
    print('PASS V8 resolve:',next_page-1,'interior;',len(transitions),'automatic transitions')

def finish():
    plan=read('exports/ebook_v8/RESOLVED_BOOK_PLAN.json');report=read('exports/ebook_v8/FINAL_PRINT_REPORT.json');assert report['status']=='PASS'
    native=PdfReader(OUT/'SHAN_INTERIOR_PRINT_V8.pdf');reader=PdfReader(OUT/'SHAN_REVIEW_V8.pdf');body={}
    for c in plan['components']:
        if c['kind'] in ('chapter','editorial_toc'):continue
        assert digest(c['file'])==c['sha256']
        source=PdfReader(ROOT/c['file']);assert len(source.pages)==c['page_count']
        for offset,page in enumerate(source.pages):body[c['start_page']-1+offset]=page
    writer=PdfWriter()
    for index,page in enumerate(native.pages):writer.add_page(body.get(index,page))
    writer.add_metadata({'/Title':'山 — 山东大学学生科幻协会二十周年纪念刊','/Subject':'\n'.join(report['editorial_toc']['full_copyright'])})
    interior=OUT/'SHAN_INTERIOR_PRINT_V8.pdf'
    with interior.with_suffix('.finish.tmp').open('wb') as f:writer.write(f)
    final=PdfReader(interior.with_suffix('.finish.tmp'))
    for index,page in body.items():assert page.get_contents().get_data()==final.pages[index].get_contents().get_data()
    interior.with_suffix('.finish.tmp').replace(interior)
    ebook=PdfWriter();cover=ROOT/'assets/cover/SHAN_FRONT_COVER_FINAL.pdf';assert digest(cover)==plan['approved_cover_sha256']
    ebook.add_page(PdfReader(cover).pages[0]);blank=reader.pages[1];assert not blank.extract_text() and not blank.get('/Resources',{}).get('/XObject');ebook.add_page(blank)
    for page in final.pages:ebook.add_page(page)
    for page in ebook.pages:page.cropbox=page.trimbox
    ebook.page_layout='/TwoPageRight';ebook.add_metadata({'/Title':'山 — 电子版 V8','/Subject':'\n'.join(report['editorial_toc']['full_copyright'])})
    for name in ('SHAN_REVIEW_V8.pdf','SHAN_EBOOK_V8.pdf'):
        with (OUT/name).open('wb') as f:ebook.write(f)
    report['pdf_finishing']={'status':'PASS','source_text_normalization':'NONE','color_conversion':'NONE','body_pages_exact_stream_passthrough':len(body),'cover_original_page_passthrough':True,'reader_layout':'TwoPageRight','ebook_crop':'TrimBox; full original MediaBox/BleedBox retained'}
    write('exports/ebook_v8/FINAL_PRINT_REPORT.json',report)
    print('PASS V8 ebook:',len(ebook.pages),'pages; no new CMYK conversion; exact original History and cover streams')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','resolve','finish']);args=p.parse_args()
    {'prepare':prepare,'resolve':resolve,'finish':finish}[args.action]()
