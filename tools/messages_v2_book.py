"""Resolve Messages into the existing book; retain every unrelated approved PDF page."""
from pathlib import Path
import json, copy, argparse, hashlib
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'exports/messages_v2'
READER = ROOT / 'exports/cover_emblem_r1/SHAN_EBOOK_V8_COVER_R1.pdf'
def read(p): return json.loads((ROOT/p).read_text('utf-8-sig'))
def write(p, data):
    p=ROOT/p; p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
def digest(p): return hashlib.sha256((ROOT/p).read_bytes()).hexdigest()

def start():
    manifest=read('content/ASSEMBLY_V0_MANIFEST.json')
    old=read('exports/ebook_v8_r1/RESOLVED_BOOK_PLAN.json')
    assert old['components'][-1]['id']=='messages_pending'
    assert manifest['interior'][-1]['id']=='messages'
    write('exports/messages_v2/ASSEMBLY_START.json', {'start_page':old['components'][-1]['start_page']})
    (OUT/'components').mkdir(exist_ok=True)
    print('PASS Assembly Messages starts at logical page', old['components'][-1]['start_page'])

def resolve():
    runtime=read('exports/messages_v2/COMPONENT_RUNTIME.json')
    assert runtime['status']=='PASS' and not runtime['overset']
    plan=copy.deepcopy(read('exports/ebook_v8_r1/RESOLVED_BOOK_PLAN.json'))
    manifest=read('content/ASSEMBLY_V0_MANIFEST.json')
    prior={c['id']:c for c in plan['components']}
    components=[]; inputs=[]; transitions=[]; next_page=1
    for c in manifest['interior']:
        if c.get('start_on_recto') and next_page%2==0:
            transitions.append({'page':next_page,'before':c['id'],'reason':'Recto chapter start'})
            next_page+=1
        if c['id']=='messages':
            assert runtime['first_page']==next_page
            file='exports/messages_v2/components/SHAN_MESSAGES_COMPONENT_V2.pdf'
            entry=dict(id='messages',kind='messages',title=c['title'],status='COMPLETED',file=file,
                       sha256=digest(file),page_count=runtime['pages'],overset=False)
        else:
            entry=copy.deepcopy(prior[c['id']])
            assert next_page==entry['start_page'], 'Unrelated folio changed: '+c['id']
        entry.update(start_page=next_page,end_page=next_page+entry['page_count']-1,
                     start_side='RIGHT_HAND' if next_page%2 else 'LEFT_HAND')
        if c['kind'] not in ('chapter','editorial_toc'):
            assert digest(entry['file'])==entry['sha256']
            inputs.append(dict(id=c['id'],file=entry['file'],sha256=entry['sha256'],source_sha256=entry['sha256'],
                               page_count=entry['page_count'],color_conversion='NONE'))
        components.append(entry); next_page+=entry['page_count']
    plan.update(components=components,interior_pages=next_page-1,parity_transitions=transitions,
                approved_cover_sha256=digest(manifest['cover']['front']['file']),
                mode='MESSAGES_V2_ONLY_EXISTING_CONTENT_UNCHANGED')
    write('exports/messages_v2/RESOLVED_BOOK_PLAN.json',plan)
    write('exports/messages_v2/PRINT_COMPONENT_INPUTS.json',dict(status='PASS',source_components_untouched=True,components=inputs,color_conversion='NONE'))
    print('PASS resolved', next_page-1, 'interior pages; earlier article and chapter starts unchanged')

def finish():
    report=read('exports/messages_v2/FINAL_PRINT_REPORT.json'); assert report['status']=='PASS'
    plan=read('exports/messages_v2/RESOLVED_BOOK_PLAN.json')
    old=read('exports/ebook_v8_r1/RESOLVED_BOOK_PLAN.json')
    baseline=PdfReader(READER)
    native=PdfReader(OUT/'SHAN_REVIEW_V8_MESSAGES_V2.pdf')
    entry=plan['components'][-1]
    component=PdfReader(ROOT/entry['file'])
    assert old['components'][-1]['page_count']==1 and old['components'][-1]['id']=='messages_pending'
    assert len(baseline.pages)==old['interior_pages']+2
    assert len(component.pages)==entry['page_count']
    prefix=entry['start_page']+1
    assert prefix==len(baseline.pages)-1
    toc=report['toc_page']['review_pdf_page']-1
    writer=PdfWriter()
    for i in range(prefix): writer.add_page(native.pages[i] if i==toc else baseline.pages[i])
    for page in component.pages: writer.add_page(page)
    for page in writer.pages: page.cropbox=page.trimbox
    writer.page_layout='/TwoPageRight'
    writer.add_metadata({'/Title':'山 — 电子版 Messages V2','/Subject':'寄语模块返工；其他已批准正文、封面及章节文字保持原样'})
    temp=OUT/'SHAN_MESSAGES_V2_FINISHED.tmp'
    with temp.open('wb') as f: writer.write(f)
    for name in ('SHAN_REVIEW_V8_MESSAGES_V2.pdf','SHAN_EBOOK_V8_MESSAGES_V2.pdf'):
        (OUT/name).write_bytes(temp.read_bytes())
    final=PdfReader(OUT/'SHAN_EBOOK_V8_MESSAGES_V2.pdf')
    preserved=[]
    for i in range(prefix):
        if i==toc: continue
        assert final.pages[i].get_contents().get_data()==baseline.pages[i].get_contents().get_data(), 'Protected PDF page '+str(i+1)
        preserved.append(i+1)
    assert len(final.pages)==report['total_reader_pdf_pages']
    report['pdf_finishing']={'status':'PASS','protected_reader':str(READER.relative_to(ROOT)),
        'unchanged_pages_exact_stream':preserved,'only_existing_page_replaced':toc+1,'pending_page_removed':True,
        'messages_range':[prefix+1,len(final.pages)],'color_conversion':'NONE','source_text_normalization':'NONE'}
    write('exports/messages_v2/FINAL_PRINT_REPORT.json',report)
    print('PASS reader',len(final.pages),'pages;',len(preserved),'unchanged pages exact; TOC regenerated; Messages inserted')

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['start','resolve','finish']);args=p.parse_args()
    {'start':start,'resolve':resolve,'finish':finish}[args.action]()
