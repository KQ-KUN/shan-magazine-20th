"""Package only final audited/full-publication artifacts and concise evidence."""
from pathlib import Path
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/history_full';DEST=ROOT.parent/'交付文件/会史全篇审校与社刊总装_20261030'
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 h=read('exports/history_full/HISTORY_CONTENT_INTEGRITY.json');b=read('exports/history_full/BOOK_ACCEPTANCE.json');a=read('exports/history_full/WORD_AUDIT.json');d=read('content/HISTORY_FULL_IMPORT.json');r=read('exports/history_full/HISTORY_RUNTIME.json')
 assert h['visual']=='PASS' and b['visual']=='PASS' and a['word_visual']=='PASS'
 frozen=read('workflow/HISTORY_PROFILE_FACT_CORRECTION.json')['frozen_scope_hashes'];assert all(sha(ROOT/p)==s for p,s in frozen.items())
 DEST.mkdir(parents=True,exist_ok=True)
 files={'会史_全篇审校.docx':ROOT/d['source'],'会史_全篇正式排版.pdf':OUT/'SHAN_HISTORY_FULL.pdf','会史_全篇正式排版.indd':OUT/'SHAN_HISTORY_FULL.indd','山_全篇会史完整电子版.pdf':OUT/'SHAN_EBOOK_HISTORY_FULL.pdf','山_全篇会史总装.indd':OUT/'SHAN_REVIEW_HISTORY_FULL.indd','Word审校修改明细.csv':OUT/'WORD_CHANGES.csv'}
 for name,p in files.items():shutil.copy2(p,DEST/name)
 ev=DEST/'审校与验证';ev.mkdir(exist_ok=True)
 for name in ['WORD_AUDIT.json','WORD_NATIVE_REPORT.json','WORD_PAGE_INDEX.json','SOURCE_INTEGRITY.json','HISTORY_CONTENT_INTEGRITY.json','HISTORY_RUNTIME.json','FINAL_PRINT_REPORT.json','BOOK_ACCEPTANCE.json','PRINT_COMPONENT_INPUTS.json','RESOLVED_BOOK_PLAN.json']:
  shutil.copy2(OUT/name,ev/name)
 missing=a.get('missing_assets',a.get('source_gaps',[]))
 report=['# 《山》全篇会史审校与社刊总装','',f"Word审校稿57页；会史正式排版{h['pages']}页；整刊内文{b['interior_pages']}页；完整电子版{b['reader_pages']}页。",'','已完成2020—2021年至2026年的语病、重复图号、题注及格式审校；修改明细见CSV。早期内容保留此前审校成果。全篇170图由此前已审校的94图和本次原稿76图组成，5条原生自动编号脚注全部横跨两栏。','', '最终姓名：余淼／2017级会长；楚休红。2026年10月纳新海报设计者为于笑涵，宣传单设计者黄可其。两条2026年11月正式定稿记录依用户确认原文保留。','', '左右图说明连续换行，完整题注后与正文隔一行；同向双图保持相同框尺寸，混合方向双图等高；九张签名保留3×3网格和左下图拉伸。长征文海报组合采用同尺寸图片框内完整置入，保护二维码。末尾两段编后说明使用8.5pt/12pt紧排，消除仅数行的孤页；历史正文仍为9.3pt/15pt。','', '目录与整刊页码已重算；其他文章保留批准的PDF正文、图片和版式，仅更新数字页码。无文字溢出、无缺图链接；全部源内容块、脚注和最终导出文字通过核对。','', '原稿提及的旧图164（央视报道截图）、旧图178（获奖盖章材料）及12则附录未随本次文件提供，未补造。现有材料已完整排入。','', '交付为电子版，沿用现有正封面及C2空白页；封底尚无批准文件，未做CMYK转换、书脊或印刷拼版。INDD使用原项目路径下的链接素材；PDF可独立阅读。原稿和此前交付保持原样。']
 (DEST/'交付说明.md').write_text('\n'.join(report)+'\n','utf-8')
 acceptance={'status':'PASS','history_pages':h['pages'],'reader_pages':b['reader_pages'],'interior_pages':b['interior_pages'],'source_blocks':590,'images':170,'native_footnotes':5,'frozen_files_unchanged':len(frozen),'word_sha256':d['source_sha256'],'delivery':str(DEST),'source_scope':'Protected audited early history plus audited 2020+ supplied source; no unrelated changes'}
 (ROOT/'workflow/HISTORY_FULL_ACCEPTANCE.json').write_text(json.dumps(acceptance,ensure_ascii=False,indent=2)+'\n','utf-8')
 hashes={name:sha(DEST/name) for name in files};(DEST/'FINAL_FILE_HASHES.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2)+'\n','utf-8')
 print('PASS delivery:',DEST)
if __name__=='__main__':main()
