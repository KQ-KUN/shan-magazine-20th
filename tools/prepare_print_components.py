"""Production copies only: preserve layout/assets; map the approved C_TEXT to 100K."""
from pathlib import Path
import hashlib
import json
from collections import Counter
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, FloatObject

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'exports/print_v2/components'
OUT.mkdir(parents=True,exist_ok=True)
baseline=json.loads((ROOT/'content/PRINT_BOOK_BASELINE.json').read_text('utf-8'))
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
    if c['kind']=='chapter':continue
    source=ROOT/c['file']
    assert digest(source)==c['sha256'], f"Approved component changed: {c['id']}"
    reader=PdfReader(source);writer=PdfWriter();writer.append(reader)
    counts={'fill':0,'stroke':0};seen=set()

    def convert(stream):
        parsed=ContentStream(stream,writer)
        changes=0
        for index,(args,op) in enumerate(parsed.operations):
            # 0.122 is InDesign's exported value of #1F1F1F. Restrict this to
            # exact approved vector ink; do not color-convert images or palettes.
            if op in (b'rg',b'RG') and len(args)==3 and all(abs(float(v)-.122)<.00001 for v in args):
                parsed.operations[index]=([FloatObject(v) for v in (0,0,0,1)],b'k' if op==b'rg' else b'K')
                counts['fill' if op==b'rg' else 'stroke']+=1;changes+=1
        return parsed if changes else None

    def forms(resources):
        if not resources:return
        for ref in resources.get('/XObject',{}).values():
            obj=ref.get_object()
            if obj.get('/Subtype')!='/Form':continue
            identity=id(obj)
            if identity in seen:continue
            seen.add(identity)
            changed=convert(obj)
            if changed is not None:obj.set_data(changed.get_data())
            forms(obj.get('/Resources'))

    for page in writer.pages:
        changed=convert(page.get_contents())
        if changed is not None:page.replace_contents(changed)
        forms(page.get('/Resources'))
    dest=OUT/(c['id']+'.pdf')
    with dest.open('wb') as output:writer.write(output)
    result=PdfReader(dest)
    assert len(result.pages)==c['page_count']
    for old,new in zip(reader.pages,result.pages):
        assert list(old.trimbox)==list(new.trimbox) and list(old.bleedbox)==list(new.bleedbox)
        assert old.extract_text()==new.extract_text(), f"PDF text changed: {c['id']}"
        assert image_fingerprints(old)==image_fingerprints(new), f"Image pixel streams changed: {c['id']}"
    rows.append({'id':c['id'],'file':dest.relative_to(ROOT).as_posix(),'sha256':digest(dest),
                 'source_sha256':c['sha256'],'page_count':c['page_count'],'text_geometry_preserved':True,
                 'black_conversion':counts,'images_converted':False,'decoded_image_streams_identical':True})

report={'status':'PASS','conversion':'Only exact exported C_TEXT RGB .122/.122/.122 -> DeviceCMYK 0/0/0/1',
        'source_components_untouched':True,'components':rows}
(OUT.parent/'PRINT_COMPONENT_INPUTS.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('PASS production copies:',len(rows),'components; exact text and boxes; image streams unchanged; 100K vector text')
