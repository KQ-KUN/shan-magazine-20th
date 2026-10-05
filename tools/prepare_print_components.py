"""Production copies only: preserve layout/assets; map the approved C_TEXT to 100K."""
from pathlib import Path
import hashlib
import json
import argparse
from collections import Counter
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, FloatObject

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser()
versions=parser.add_mutually_exclusive_group();versions.add_argument('--v3',action='store_true');versions.add_argument('--v4',action='store_true');versions.add_argument('--v5',action='store_true');versions.add_argument('--v6',action='store_true')
options=parser.parse_args()
OUT=ROOT/('exports/print_v6/components' if options.v6 else 'exports/print_v5/components' if options.v5 else 'exports/print_v4/components' if options.v4 else 'exports/print_v3/components' if options.v3 else 'exports/print_v2/components')
OUT.mkdir(parents=True,exist_ok=True)
baseline=json.loads((ROOT/('exports/print_v6/RESOLVED_BOOK_PLAN.json' if options.v6 else 'exports/print_v5/RESOLVED_BOOK_PLAN.json' if options.v5 else 'exports/print_v4/RESOLVED_BOOK_PLAN.json' if options.v4 else 'exports/print_v3/RESOLVED_BOOK_PLAN.json' if options.v3 else 'content/PRINT_BOOK_BASELINE.json')).read_text('utf-8'))
if options.v3 or options.v4 or options.v5 or options.v6:
    from resolve_print_v3 import folio_blocks
    folio_reader=PdfReader(ROOT/('exports/print_v6/FOLIO_ONLY_V6.pdf' if options.v6 else 'exports/print_v5/FOLIO_ONLY_V5.pdf' if options.v5 else 'exports/print_v4/FOLIO_ONLY_V4.pdf' if options.v4 else 'exports/print_v3/FOLIO_ONLY_V3.pdf'))
    folio_map={(r['component_id'],r['component_page']):r for r in baseline['folio_rebase']}
rows=[]

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def image_fingerprints(page):
    found=[];seen=set()
    def visit(resources):
        if not resources:return
        resources=resources.get_object()
        objects=resources.get('/XObject',{})
        if hasattr(objects,'get_object'):objects=objects.get_object()
        for ref in objects.values():
            obj=ref.get_object();identity=id(obj)
            if identity in seen:continue
            seen.add(identity)
            if obj.get('/Subtype')=='/Image':
                found.append((obj.get('/Width'),obj.get('/Height'),obj.get('/BitsPerComponent'),
                              hashlib.sha256(obj.get_data()).hexdigest()))
            elif obj.get('/Subtype')=='/Form':visit(obj.get('/Resources'))
    visit(page.get('/Resources'))
    return Counter(found)

for c in baseline['components']:
    if c['kind'] in ('chapter','toc','editorial_toc'):continue
    source=ROOT/c['file']
    assert digest(source)==c['sha256'], f"Approved component changed: {c['id']}"
    reader=PdfReader(source);writer=PdfWriter();writer.append(reader)
    counts={'fill':0,'stroke':0};seen=set()
    rebased=[]
    if options.v3 or options.v4 or options.v5 or options.v6:
        for index,page in enumerate(writer.pages):
            row=folio_map.get((c['id'],index+1))
            if not row:continue
            operations,matches=folio_blocks(page,writer,row['old_folio'])
            assert len(matches)==1, 'Missing verified old footer'
            start,end=matches[0]
            parsed=ContentStream(page.get_contents(),writer)
            # Remove only the verified text-show operation. The footer's rg/Tf
            # state is inherited by later body text outside that BT/ET object;
            # deleting the whole object would silently change title/author ink.
            retained=[item for item in operations[start:end+1] if item[1]!=b'Tj']
            parsed.operations=operations[:start]+retained+operations[end+1:]
            page.replace_contents(parsed)
            overlay=folio_reader.pages[row['new_folio']-1]
            assert overlay.extract_text().strip()==str(row['new_folio'])
            page.merge_page(overlay)
            rebased.append(row)

    def convert(stream,resources):
        parsed=ContentStream(stream,writer)
        changes=0
        spaces=resources.get('/ColorSpace',{})
        if hasattr(spaces,'get_object'):spaces=spaces.get_object()
        current={b'cs':None,b'CS':None};stack=[]
        output=[]
        def rgb(name):
            if name=='/DeviceRGB':return True
            value=spaces.get(name)
            if value is None:return False
            value=value.get_object()
            return isinstance(value,list) and value[0]=='/ICCBased' and value[1].get_object().get('/N')==3
        for index,(args,op) in enumerate(parsed.operations):
            if op==b'q':stack.append(dict(current))
            elif op==b'Q':current=stack.pop() if stack else {b'cs':None,b'CS':None}
            elif op in (b'cs',b'CS'):current[op]=args[0]
            # 0.122 is InDesign's exported value of #1F1F1F. Restrict this to
            # exact approved vector ink; do not color-convert images or palettes.
            fill=op==b'rg' or op==b'scn' and rgb(current[b'cs'])
            stroke=op==b'RG' or op==b'SCN' and rgb(current[b'CS'])
            if (fill or stroke) and len(args)==3 and all(abs(float(v)-.122)<.00001 for v in args):
                output.append(([FloatObject(v) for v in (0,0,0,1)],b'k' if fill else b'K'))
                counts['fill' if fill else 'stroke']+=1;changes+=1
            else:
                # k/K selects DeviceCMYK. Before a subsequent unchanged RGB
                # scn/SCN, explicitly restore its original named RGB space.
                # Otherwise Adobe correctly rejects its three operands in CMYK.
                if op in (b'scn',b'SCN') and len(args)==3:
                    selector=b'cs' if op==b'scn' else b'CS'
                    if rgb(current[selector]):output.append(([current[selector]],selector))
                output.append((args,op))
        parsed.operations=output
        return parsed if changes else None

    def forms(resources):
        if not resources:return
        for ref in resources.get('/XObject',{}).values():
            obj=ref.get_object()
            if obj.get('/Subtype')!='/Form':continue
            identity=id(obj)
            if identity in seen:continue
            seen.add(identity)
            changed=convert(obj,obj.get('/Resources',{}))
            if changed is not None:obj.set_data(changed.get_data())
            forms(obj.get('/Resources'))

    for page in writer.pages:
        changed=convert(page.get_contents(),page.get('/Resources',{}))
        if changed is not None:page.replace_contents(changed)
        forms(page.get('/Resources'))
    dest=OUT/(c['id']+'.pdf')
    with dest.open('wb') as output:writer.write(output)
    result=PdfReader(dest)
    assert len(result.pages)==c['page_count']
    for old,new in zip(reader.pages,result.pages):
        assert list(old.trimbox)==list(new.trimbox) and list(old.bleedbox)==list(new.bleedbox)
        if not rebased:
            assert old.extract_text()==new.extract_text(), f"PDF text changed: {c['id']}"
        assert image_fingerprints(old)==image_fingerprints(new), f"Image pixel streams changed: {c['id']}"
    rows.append({'id':c['id'],'file':dest.relative_to(ROOT).as_posix(),'sha256':digest(dest),
                 'source_sha256':c['sha256'],'page_count':c['page_count'],'text_geometry_preserved':True,
                 'black_conversion':counts,'images_converted':False,'decoded_image_streams_identical':True,
                 'authorized_folio_rebase':rebased})

    if rebased:
        # Compare every body glyph including location/size. Exclusion is exactly
        # the independently verified numeric Consolas footer, never a body line.
        import pdfplumber
        with pdfplumber.open(source) as before, pdfplumber.open(dest) as after:
            for index,(old,new) in enumerate(zip(before.pages,after.pages)):
                footer=lambda ch:ch['top']>710 and 'Consolas' in ch['fontname']
                a=[ch for ch in old.chars if not footer(ch)]
                b=[ch for ch in new.chars if not footer(ch)]
                assert len(a)==len(b)
                for x,y in zip(a,b):
                    assert x['text']==y['text'], 'Non-folio character changed'
                    assert all(abs(x[k]-y[k])<.04 for k in ('x0','x1','top','bottom','size')), 'Non-folio geometry changed'
                    ink=x['non_stroking_color']
                    expected=(0,0,0,1) if ink==(.122,.122,.122) else ink
                    assert y['non_stroking_color']==expected,'Non-folio ink/state changed'
                row=folio_map.get((c['id'],index+1))
                if row:
                    chars=[ch for ch in new.chars if footer(ch)]
                    assert ''.join(ch['text'] for ch in chars)==str(row['new_folio'])
                    assert all(abs(ch['size']-7.5)<.01 and ch['non_stroking_color']==(0,0,0,1) for ch in chars)

report={'status':'PASS','conversion':'Only exact exported C_TEXT RGB .122/.122/.122 -> DeviceCMYK 0/0/0/1',
        'source_components_untouched':True,'components':rows}
(OUT.parent/'PRINT_COMPONENT_INPUTS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS production copies:',len(rows),'components; exact text and boxes; image streams unchanged; 100K vector text')
