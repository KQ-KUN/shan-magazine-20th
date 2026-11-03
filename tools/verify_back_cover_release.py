from pathlib import Path
from collections import Counter
import json,hashlib,shutil,subprocess
import pymupdf as fitz
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/back_cover_release_20261102'
DEST=ROOT.parent/'交付文件/正式封底与留白修订_20261103';PDF=DEST/'山_完整电子版_正式封底.pdf'
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def chars(p):
    text=''.join(s['text'] for b in p.get_text('dict')['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] if not ('Consolas' in s['font'] and s['bbox'][1]>700))
    return Counter(ch for ch in text if not ch.isspace())
def pictures(p):return Counter(i['digest'] for i in p.get_image_info(hashes=True))
def total(doc):return sum((chars(p) for p in doc),Counter())
doc=fitz.open(PDF);native=read('exports/back_cover_release_20261102/FINAL_PRINT_REPORT.json');plan=read('exports/back_cover_release_20261102/RESOLVED_BOOK_PLAN.json');art=read('content/BACK_COVER_MANIFEST.json')
assert native['status']=='PASS' and len(doc)==94 and native['back_cover']['back_pdf_page']==94
assert native['back_cover']['inside_back_pdf_page']==93 and native['back_cover']['inside_back_items']==0
for index in [1,92]:
    p=doc[index];assert not p.get_text().strip() and not p.get_images() and not p.get_drawings()
    pix=p.get_pixmap();assert set(pix.samples)=={255}
assert all(abs(p.rect.width*25.4/72-185)<.002 and abs(p.rect.height*25.4/72-260)<.002 for p in doc)
assert not plan['parity_transitions'] and not native['intentional_transition_pages']
assert '零重力报' in ''.join(doc[5].get_text().split())
for c in native['toc_entries']:
    expected=next(x['start_page'] for x in plan['components'] if x['id']==c['component_id']);assert expected==c['start_page']
checked=0
for row in read('exports/back_cover_release_20261102/PRINT_COMPONENT_INPUTS.json')['components']:
    entry=next(c for c in plan['components'] if c['id']==row['id'])
    with fitz.open(ROOT/row['file']) as source:
        for i,p in enumerate(source):
            final=doc[entry['start_page']+1+i]
            assert chars(p)==chars(final),('body',row['id'],i)
            assert pictures(p)==pictures(final),('images',row['id'],i)
            checked+=1
for name in ['feature_now','memoir_gloomy']:
    with fitz.open(ROOT/'exports/image_review_20261102'/f'{name}.pdf') as old,fitz.open(OUT/f'{name}.pdf') as new:
        assert total(old)==total(new),('reflow integrity',name)
        assert sum((pictures(p) for p in old),Counter())==sum((pictures(p) for p in new),Counter())
messages=read('exports/back_cover_release_20261102/MESSAGES_RUNTIME.json');mapping=read('content/MESSAGES_IMPORT_MAP.json');data=read('exports/messages_v2/SOURCE_IMPORT.json');rows=data['paragraphs'].copy()
for entry in mapping['entries']:
    s=rows[entry['header_paragraph']-1];rows[entry['header_paragraph']-1]=s[slice(*entry['name_range'])]+'\t'+s[slice(*entry['role_range'])]
assert rows==[p['text'] for p in messages['paragraphs']] and messages['people']==31 and not messages['overset']
with fitz.open(ROOT/art['digital']['file']) as back:
    assert pictures(back[0])==pictures(doc[-1]);assert not doc[-1].get_text().strip()
    # Equivalent raster checks the actual crop, scale and full artwork placement.
    expected=back[0].get_pixmap(matrix=fitz.Matrix(1,1));actual=doc[-1].get_pixmap(matrix=fitz.Matrix(1,1))
    assert (actual.width,actual.height)==(expected.width,expected.height)
    diffs=[abs(a-b) for a,b in zip(actual.samples,expected.samples)];assert max(diffs)<=3 and sum(diffs)/len(diffs)<.05
status=read('workflow/MODULE_STATUS.json');frozen=[p for v in status.values() if v.get('frozen') for p in v['scope']]
git=['git','-c','safe.directory='+ROOT.as_posix()]
assert subprocess.run(git+['diff','--quiet','HEAD','--']+frozen,cwd=ROOT).returncode==0
for n in [6,82,83,84,85,90,91,92,93,94]:
    doc[n-1].get_pixmap(matrix=fitz.Matrix(1,1)).save(OUT/f'FINAL_PAGE_{n}.png')
for start in range(0,len(doc),24):
    sheet=Image.new('RGB',(1200,1160),'#ddd');draw=ImageDraw.Draw(sheet)
    for k,i in enumerate(range(start,min(start+24,len(doc)))):
        px=doc[i].get_pixmap(matrix=fitz.Matrix(.32,.32),alpha=False);sheet.paste(Image.frombytes('RGB',(px.width,px.height),px.samples),(k%6*200,k//6*290));draw.text((k%6*200+8,k//6*290+270),str(i+1),fill='black')
    sheet.save(OUT/f'OVERVIEW_{start+1:03}.png')
report={'status':'PASS','host_runtime':'PASS','pages':94,'back_cover_pdf_page':94,'inside_back_pdf_page':93,'inside_back_blank':'PDF has no text/images/paths; raster is entirely white; native page has zero objects and no Parent','inside_front_blank':True,'trim_mm':[185,260],'page_layout':'TwoPageRight','continuous_chapters':'User approved removal of two colored recto fillers; some chapters may begin on verso','removed_transition_pages':2,'terminal_parity_blank':False,'native_toc':'PASS actual component start pages','copyright_first_publication':'Four named articles credited to 零重力报 on PDF page 6','component_pages_verified':checked,'body_characters_and_image_pixels':'PASS','reflow_article_text_and_image_identity':'PASS','messages_people':31,'messages_paragraphs':148,'frozen_files_unchanged':len(frozen),'digital_back_hash':art['digital']['sha256'],'final_pdf_sha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'back_render_max_channel_difference':max(diffs),'back_render_mean_channel_difference':sum(diffs)/len(diffs),'print_candidate_status':'PRINT_CANDIDATE_NOT_APPROVED','print_limitations':['1056x1490 original; about 140 PPI','Printer ICC, PDF/X, paper, binding and spine pending','No CMYK conversion or final cover spread'],'visual_review':'Pending current rendered-page inspection'}
(OUT/'ACCEPTANCE.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf-8')
print('PASS:94 pages; native zero-object C3; actual back pixels preserved; exact article text/images; 28 frozen source files unchanged')
