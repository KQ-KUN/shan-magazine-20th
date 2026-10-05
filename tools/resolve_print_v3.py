"""Recalculate component ranges from approved counts + the new native article."""
from pathlib import Path
import hashlib,json
from pypdf import PdfReader
from pypdf.generic import ContentStream

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'exports/print_v3'

def folio_blocks(page,reader,expected):
    """Recognize only the verified numeric Consolas footer BT/ET object."""
    operations=ContentStream(page.get_contents(),reader).operations
    fonts=page['/Resources'].get('/Font',{})
    matches=[]
    for start,(args,op) in enumerate(operations):
        if op!=b'BT':continue
        end=next(j for j in range(start+1,len(operations)) if operations[j][1]==b'ET')
        block=operations[start:end+1]
        matrices=[a for a,o in block if o==b'Tm']
        shows=[a for a,o in block if o==b'Tj']
        resources=[a[0] for a,o in block if o==b'Tf']
        if not matrices or float(matrices[-1][-1])>=45:continue
        if len(shows)!=1 or len(resources)!=1:continue
        font=fonts[resources[0]].get_object()
        if 'Consolas' not in str(font.get('/BaseFont')):continue
        text=str(shows[0][0])
        assert text==str(expected),f'Unexpected footer text {text!r}, expected {expected}'
        # Exact confirmed furniture geometry, never remove arbitrary body text.
        assert abs(float(matrices[-1][-1])-36.3765)<.05
        matches.append((start,end))
    assert len(matches)<=1,'More than one source footer'
    return operations,matches

def resolve():
    old=json.loads((ROOT/'content/PRINT_BOOK_BASELINE.json').read_text('utf-8'))
    manifest=json.loads((ROOT/'content/ASSEMBLY_V0_MANIFEST.json').read_text('utf-8'))
    native=json.loads((OUT/'MONDAY_CUP_RUNTIME.json').read_text('utf-8-sig'))
    assert native['status']=='PASS' and native['integrity']['paragraph_equality'] and not native['overset']
    by_id={c['id']:c for c in old['components']};components=[];transitions=[];folios=[];next_page=1
    for c in manifest['interior']:
        if c.get('start_on_recto') and next_page%2==0:
            transitions.append({'page':next_page,'before':c['id'],'reason':'Recto chapter start'});next_page+=1
        if c['id']=='feature_monday_cup_backstage':
            file='exports/print_v3/feature_monday_cup_backstage.pdf'
            entry={'id':c['id'],'kind':'feature','status':'COMPLETED','page_count':native['page_count'],
                'file':file,'sha256':hashlib.sha256((ROOT/file).read_bytes()).hexdigest(),'source':c['source'],'overset':False}
            assert len(PdfReader(ROOT/file).pages)==entry['page_count']
            assert next_page==native['start_page'],'Standalone must render with actual starting parity'
        else:
            entry=dict(by_id[c['id']]);entry['original_start_page']=entry['start_page']
            assert hashlib.sha256((ROOT/entry['file']).read_bytes()).hexdigest()==entry['sha256']
            if c['kind']!='chapter':
                # A recto chapter absorbs any odd article delta. Never mirror or
                # reflow approved bodies just to change absolute numbering.
                assert next_page%2==entry['start_page']%2,'Approved body page side changed'
                reader=PdfReader(ROOT/entry['file'])
                for i,page in enumerate(reader.pages):
                    if next_page!=entry['start_page']:
                        _,matches=folio_blocks(page,reader,entry['start_page']+i)
                        if matches:folios.append({'component_id':c['id'],'component_page':i+1,
                            'old_folio':entry['start_page']+i,'new_folio':next_page+i})
        entry.update(start_page=next_page,end_page=next_page+entry['page_count']-1,
            start_side='RIGHT_HAND' if next_page%2 else 'LEFT_HAND')
        components.append(entry);next_page+=entry['page_count']
    result={'baseline_commit':old['baseline_commit'],'approved_cover_sha256':old['approved_cover_sha256'],
        'interior_pages':next_page-1,'components':components,'parity_transitions':transitions,
        'folio_rebase':folios,'source_baseline':'content/PRINT_BOOK_BASELINE.json'}
    (OUT/'RESOLVED_BOOK_PLAN.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('PASS resolved plan:',next_page-1,'interior pages;',len(folios),'existing numeric folios to rebase')
    return result

if __name__=='__main__':resolve()
