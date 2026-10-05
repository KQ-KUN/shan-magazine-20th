"""Resolve the current front matter and approved body counts; never reflow bodies."""
from pathlib import Path
import hashlib,json
from pypdf import PdfReader
from resolve_print_v3 import folio_blocks

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'exports/print_v5'
def digest(file):return hashlib.sha256((ROOT/file).read_bytes()).hexdigest()
def resolve():
    old=json.loads((ROOT/'content/PRINT_BOOK_BASELINE.json').read_text('utf-8'))
    manifest=json.loads((ROOT/'content/ASSEMBLY_V0_MANIFEST.json').read_text('utf-8'))
    approved=json.loads((ROOT/'exports/print_v3/RESOLVED_BOOK_PLAN.json').read_text('utf-8'))
    by_id={c['id']:c for c in old['components']}
    by_id['feature_monday_cup_backstage']=next(c for c in approved['components'] if c['id']=='feature_monday_cup_backstage')
    components=[];transitions=[];folios=[];next_page=1
    for c in manifest['interior']:
        if c.get('start_on_recto') and next_page%2==0:
            transitions.append({'page':next_page,'before':c['id'],'reason':'Recto chapter start'});next_page+=1
        if c['kind']=='editorial_toc':
            entry={'id':c['id'],'kind':c['kind'],'status':'COMPLETED','page_count':1,
                   'file':c['display'],'sha256':digest(c['display']),'source':c['source'],'overset':False}
            assert next_page==4
        else:
            entry=dict(by_id[c['id']]);entry['original_start_page']=entry['start_page']
            assert digest(entry['file'])==entry['sha256'],f"Approved input changed: {c['id']}"
            if c['kind']!='chapter':
                assert next_page%2==entry['start_page']%2,'Approved body side changed'
                reader=PdfReader(ROOT/entry['file'])
                if next_page!=entry['start_page']:
                    for i,page in enumerate(reader.pages):
                        _,matches=folio_blocks(page,reader,entry['start_page']+i)
                        if matches:folios.append({'component_id':c['id'],'component_page':i+1,
                            'old_folio':entry['start_page']+i,'new_folio':next_page+i})
        entry.update(start_page=next_page,end_page=next_page+entry['page_count']-1,
            start_side='RIGHT_HAND' if next_page%2 else 'LEFT_HAND')
        components.append(entry);next_page+=entry['page_count']
    result={'baseline_commit':old['baseline_commit'],'approved_cover_sha256':old['approved_cover_sha256'],
        'interior_pages':next_page-1,'components':components,'parity_transitions':transitions,
        'folio_rebase':folios,'source_baseline':'content/PRINT_BOOK_BASELINE.json',
        'front_matter':'Combined editorial/contents LEFT 4, one native page',
        'toc_page_numbers':'Resolved counts reserve capacity only; rendered numbers come from actual document pages'}
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'RESOLVED_BOOK_PLAN.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('PASS V5 resolved:',next_page-1,'interior; combined LEFT 4;',len(folios),'authorized numeric folios')
    return result
if __name__=='__main__':resolve()
