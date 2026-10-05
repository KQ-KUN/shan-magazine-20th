"""Native output preflight + actual physical spreads. No source text normalization."""
from pathlib import Path
import hashlib,json
from io import BytesIO
import pdfplumber
from pypdf import PdfReader,PdfWriter
from PIL import Image,ImageDraw,ImageChops

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'exports/print_v2'
report=json.loads((OUT/'FINAL_PRINT_REPORT.json').read_text('utf-8'))
baseline=json.loads((ROOT/'content/PRINT_BOOK_BASELINE.json').read_text('utf-8'))
sections=json.loads((ROOT/'spec/CONTENT_MANIFEST.json').read_text('utf-8'))['sections']
tokens=json.loads((ROOT/'spec/CHAPTER_ART_TOKENS.json').read_text('utf-8'))
assert report['status']=='PASS'
assert report['final_links_verified'] and len(report['finished_native_documents'])==2
assert report['pdf_finishing']['source_text_normalization']=='NONE'
assert report['interior_pages']==baseline['interior_pages']==71
assert report['total_reader_pdf_pages']==73 and report['c2_blank']
assert not report['overset'] and not report['missing_links'] and not report['focus']['active_page_is_parent']
assert report['first_interior_side']=='RIGHT_HAND' and report['last_interior_side']=='RIGHT_HAND'
assert [t['page'] for t in report['intentional_transition_pages']]==[6,26,62]
assert len(report['openers'])==7 and all(o['side']=='RIGHT_HAND' for o in report['openers'])
for page in report['physical_pages']:
    assert page['side']==('RIGHT_HAND' if page['interior_page']%2 else 'LEFT_HAND')
for c,old in zip(report['components'],baseline['components']):
    assert (c['id'],c['start_page'],c['end_page'],c['page_count'])==(old['id'],old['start_page'],old['end_page'],old['page_count'])
assert hashlib.sha256((ROOT/'assets/cover/SHAN_FRONT_COVER_FINAL.pdf').read_bytes()).hexdigest()==baseline['approved_cover_sha256']

for filename,count in [('SHAN_INTERIOR_PRINT_V2.pdf',71),('SHAN_REVIEW_V2.pdf',73)]:
    reader=PdfReader(OUT/filename);assert not reader.is_encrypted and len(reader.pages)==count
    if filename=='SHAN_REVIEW_V2.pdf':assert reader.page_layout=='/TwoPageRight'
    for page in reader.pages:
        assert page.rotation==0
        assert abs(float(page.trimbox.width)*25.4/72-185)<.1 and abs(float(page.trimbox.height)*25.4/72-260)<.1
        assert abs(float(page.bleedbox.width)*25.4/72-191)<.1 and abs(float(page.bleedbox.height)*25.4/72-266)<.1
spread_reader=PdfReader(OUT/'SHAN_REVIEW_SPREADS_V2.pdf')
assert len(spread_reader.pages)==37
assert abs(float(spread_reader.pages[1].trimbox.width)*25.4/72-370)<.1

def embedded_fonts(reader):
    seen=set();names=set()
    def resources(r):
        if not r:return
        r=r.get_object()
        for ref in r.get('/Font',{}).values():
            font=ref.get_object();identity=id(font)
            if identity in seen:continue
            seen.add(identity)
            names.add(str(font.get('/BaseFont','Type3')))
            descendants=font.get('/DescendantFonts',[font])
            for child in descendants:
                child=child.get_object()
                if child.get('/Subtype')=='/Type3':continue
                descriptor=child.get('/FontDescriptor')
                assert descriptor, 'Unembedded font '+str(child.get('/BaseFont'))
                descriptor=descriptor.get_object()
                assert any(k in descriptor for k in ('/FontFile','/FontFile2','/FontFile3')), 'Missing embedded font stream'
        for ref in r.get('/XObject',{}).values():
            obj=ref.get_object();identity=id(obj)
            if identity in seen:continue
            seen.add(identity)
            if obj.get('/Subtype')=='/Form':resources(obj.get('/Resources'))
    for page in reader.pages:resources(page.get('/Resources'))
    return sorted(names)
font_names=embedded_fonts(PdfReader(OUT/'SHAN_REVIEW_V2.pdf'))

thumbs=[]
with pdfplumber.open(OUT/'SHAN_REVIEW_V2.pdf') as pdf:
    c2=pdf.pages[1]
    assert not c2.chars and not c2.images and not c2.rects and not c2.curves and not c2.lines, 'C2 printed object'
    # pdfplumber pads CropBox -> MediaBox with a black canvas. For the ink
    # audit only, expose the full MediaBox in an in-memory clone; no page
    # stream/resources are changed and no white mask/object is introduced.
    blank_audit=PdfWriter();blank_audit.add_page(PdfReader(OUT/'SHAN_REVIEW_V2.pdf').pages[1])
    blank_audit.pages[0].cropbox=blank_audit.pages[0].mediabox
    blank_bytes=BytesIO();blank_audit.write(blank_bytes);blank_bytes.seek(0)
    with pdfplumber.open(blank_bytes) as full_blank:
        white=full_blank.pages[0].to_image(resolution=100).original.convert('RGB')
    assert ImageChops.difference(white,Image.new('RGB',white.size,'white')).getbbox() is None, 'C2 not entirely white'
    white.save(OUT/'COVER_INSIDE_FRONT_BLANK.png')
    for i,page in enumerate(pdf.pages):
        im=page.crop(page.trimbox).to_image(resolution=34).original.convert('RGB')
        if i!=1:assert ImageChops.difference(im,Image.new('RGB',im.size,'white')).getbbox(), f'Unexpected blank reader {i+1}'
        thumbs.append(im)
    # Native chapter text was individually compared exactly; PDF strings are
    # checked after removal of extraction line breaks only, not rewritten copy.
    for section,opener in zip(sections,report['openers']):
        page=pdf.pages[int(opener['page'])+1]
        # The PDF, not only the DOM swatch, must retain Process CMYK ink.
        expected=tokens['sections'][section['id']]['cmyk']
        full=[r for r in page.rects if r['width']>=540 and r['height']>=753]
        assert full, 'Missing 3mm full-bleed field '+section['id']
        color=full[0]['non_stroking_color']
        assert len(color)==4 and all(abs(v*100-e)<.15 for v,e in zip(color,expected)), 'PDF CMYK conversion '+section['id']
        assert sum(color)*100<=tokens['max_artwork_tac_percent']+.1
        text=''.join((page.extract_text() or '').split())
        for key in ['cn','en','intro']:
            assert ''.join(section[key].split()) in text, section['id']+' '+key
        if section['display_index']:assert section['display_index'] in text
    images=[pdf.pages[i].crop(pdf.pages[i].trimbox).to_image(resolution=80).original.convert('RGB') for i in range(3)]
    w,h=images[0].size;first=Image.new('RGB',(w*3,h),'white')
    for i,im in enumerate(images):first.paste(im,(i*w,0))
    first.save(OUT/'SHAN_COVER_C2_INTERIOR_SIMULATION.png')
    spreads=[]
    for opener in report['openers']:
        folio=int(opener['page'])
        left=pdf.pages[folio].crop(pdf.pages[folio].trimbox).to_image(resolution=70).original.convert('RGB')
        right=pdf.pages[folio+1].crop(pdf.pages[folio+1].trimbox).to_image(resolution=70).original.convert('RGB')
        w,h=right.size;image=Image.new('RGB',(w*2,h),'white');image.paste(left,(0,0));image.paste(right,(w,0))
        image.save(OUT/('SPREAD_'+opener['section']+'.png'));spreads.append((opener['section'],folio,image))
    cw,ch=thumbs[0].size
    cover=thumbs[0].resize((cw,ch))
    rows=[('FRONT COVER | independent approved artwork',cover,None)]
    for name,folio,im in spreads:
        trans=any(t['page']==folio-1 for t in report['intentional_transition_pages'])
        label='blank C2' if name=='prologue' else ('parity transition' if trans else 'existing preceding verso; no added page')
        rows.append((name+' | '+label,im.resize((cw*2,ch)),None))
    contact=Image.new('RGB',(cw*2+24,len(rows)*(ch+27)),'#ddd');draw=ImageDraw.Draw(contact)
    for i,(name,im,_) in enumerate(rows):
        y=i*(ch+27);draw.text((8,y+5),name,fill='black');contact.paste(im,(8,y+23))
    contact.save(OUT/'SHAN_PRINT_SPREAD_CONTACT_SHEET.png')

# Confirm conservation against each approved body component, including glyph
# positions and sizes, not just a few source keywords or total page counts.
glyphs_checked=0;black_glyphs_checked=0
with pdfplumber.open(OUT/'SHAN_INTERIOR_PRINT_V2.pdf') as interior:
    for c in baseline['components']:
        if c['kind']=='chapter':continue
        with pdfplumber.open(ROOT/c['file']) as source:
            for offset,old in enumerate(source.pages):
                new=interior.pages[c['start_page']-1+offset]
                a=old.crop(old.trimbox).chars;b=new.crop(new.trimbox).chars
                assert len(a)==len(b), 'Body glyph count '+c['id']+' '+str(offset+1)
                for oldchar,newchar in zip(a,b):
                    assert oldchar['text']==newchar['text'], 'Body glyph sequence '+c['id']
                    for key in ('x0','x1','top','bottom','size'):
                        assert abs(oldchar[key]-newchar[key])<.04, 'Body glyph geometry '+c['id']+' '+key
                    color=oldchar['non_stroking_color']
                    if isinstance(color,tuple) and len(color)==3 and all(abs(v-.122)<.00001 for v in color):
                        assert newchar['non_stroking_color']==(0,0,0,1), 'Body text is not 100K '+c['id']
                        black_glyphs_checked+=1
                    glyphs_checked+=1
                assert len(old.crop(old.trimbox).images)==len(new.crop(new.trimbox).images), 'Body image count '+c['id']
for start in range(0,len(thumbs),12):
    w,h=thumbs[0].size;sheet=Image.new('RGB',(4*(w+8),3*(h+22)),'#ddd');draw=ImageDraw.Draw(sheet)
    for j,im in enumerate(thumbs[start:start+12]):
        x=j%4*(w+8);y=j//4*(h+22);sheet.paste(im,(x,y+18));draw.text((x+2,y+2),str(start+j+1),fill='black')
    sheet.save(OUT/f'REVIEW_CONTACT_{start//12+1:02}.png')
result={'status':'PASS','interior_pages':71,'reader_pages':73,'reader_spreads':37,'c2_zero_printed_objects_and_white_pixels':True,
        'all_pages_rendered':73,'all_chapters_recto':True,'only_existing_transitions':[6,26,62],
        'binding_mode':'UNCONFIRMED','print_release':'PENDING_PRINTER_COLOR_PROFILE_BINDING_AND_CONTENT',
        'approved_body_glyphs_and_geometry_checked':glyphs_checked,'body_100k_glyphs_checked':black_glyphs_checked,
        'embedded_fonts':font_names,
        'chapter_pdf_cmyk_and_full_bleed':True,
        'visual_review':'PENDING_AGENT_SPREAD_INSPECTION'}
(OUT/'PDF_PREFLIGHT.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result))
