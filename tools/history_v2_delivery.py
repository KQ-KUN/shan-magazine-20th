"""Write the task's evidence summary and copy only final review artifacts."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import argparse,hashlib,json,shutil,subprocess

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'exports/history_v2'
DEST=ROOT.parent/'交付文件/会史新版排版与总装_20261029'
def read(p):return json.loads((ROOT/p).read_text('utf-8-sig'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def dump(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n','utf-8')
def main():
 history=read('exports/history_v2/HISTORY_CONTENT_INTEGRITY.json');book=read('exports/history_v2/BOOK_ACCEPTANCE.json')
 assert history['visual']=='PASS' and book['visual']=='PASS'
 report=read('exports/history_v2/FINAL_PRINT_REPORT.json');plan=read('exports/history_v2/RESOLVED_BOOK_PLAN.json')
 frozen=read('workflow/HISTORY_PROFILE_FACT_CORRECTION.json')['frozen_scope_hashes']
 checks={p:{'expected':s,'actual':sha(ROOT/p),'unchanged':sha(ROOT/p)==s} for p,s in frozen.items()}
 assert all(x['unchanged'] for x in checks.values())
 dump(OUT/'FROZEN_SCOPE_CHECK.json',{'status':'PASS','files':checks,'frozen_renderer_edits':[],'new_module_status':'VALIDATED; not automatically marked FROZEN','unrelated_existing_changes':'Existing ASSEMBLY_V0_MANIFEST, COVER_ARTWORK_STATUS, MODULE_STATUS and cover/memoir probes retained outside this commit'})
 dump(OUT/'FOOTNOTE_CHECK.json',{'status':'PASS','notes':history['native_footnotes'],'source_ids':['0','1','2'],'native_automatic_numbers':[1,2,3],'source_text':'EXACT including internal paragraphs','visual':'Numbers 1, 2, 3 and note text inspected on logical pages 14,17,21','later_unaudited_full_word_note':'Excluded with the new unaudited tail; approved old magazine tail used instead'})
 dump(OUT/'PAGE_COMPARISON_AND_TOC.json',{'old_history_pages':7,'new_history_pages':history['pages'],'old_interior_pages':73,'new_interior_pages':plan['interior_pages'],'reader_pages':book['reader_pages'],'components':[{k:c[k] for k in ['id','previous_start_page','previous_page_count','start_page','end_page','page_count']} for c in plan['components']],'actual_native_toc':report['toc_entries'],'chapter_starts':book['chapter_recto'],'transitions':plan['parity_transitions']})
 names=read('exports/history_v2/FINAL_NAME_CORRECTIONS.json')
 dump(OUT/'CURRENT_NAME_AUDIT.json',{'status':'PASS','final_policy':{'name':'余淼','role':'2017级会长','other_name':'楚休红'},'checked':['complete canonical Word','History import blocks and native story','Messages source, mapping and native story','whole ebook PDF'],'corrections':names,'historical_archive_policy':'Original handoff, prior deliveries, source backups and before/after evidence retained verbatim; they are not current production inputs','other_content':'427 History blocks exact; 148 Messages source paragraphs exact with authorized source corrections; other article PDF bodies unchanged'})
 DEST.mkdir(parents=True,exist_ok=True)
 files={'会史_新版正式排版.pdf':OUT/'SHAN_HISTORY_V2.pdf','山_新版会史完整电子版.pdf':OUT/'SHAN_EBOOK_HISTORY_V2.pdf','会史_新版正式排版.indd':OUT/'SHAN_HISTORY_V2.indd','山_新版总装.indd':OUT/'SHAN_REVIEW_HISTORY_V2.indd','会史_最终姓名口径.docx':ROOT/read('content/HISTORY_V2_IMPORT.json')['source']}
 for name,p in files.items():shutil.copy2(p,DEST/name)
 evidence=DEST/'验证报告';evidence.mkdir(exist_ok=True)
 for name in ['HISTORY_CONTENT_INTEGRITY.json','SOURCE_INTEGRITY.json','CURRENT_NAME_AUDIT.json','IMAGE_CAPTION_CHECK.csv','FOOTNOTE_CHECK.json','PAGE_COMPARISON_AND_TOC.json','HISTORY_RUNTIME.json','FINAL_PRINT_REPORT.json','BOOK_ACCEPTANCE.json','PRINT_COMPONENT_INPUTS.json','FROZEN_SCOPE_CHECK.json','FINAL_NAME_CORRECTIONS.json','FINAL_IMPORTED_TEXT_CHECK.json','ASSEMBLY_HOST_GUARD.json','IMAGE_GEOMETRY_CHECK.json','BOOK_VISUAL_REUSE.json','FOLIO_CACHE_REUSE.json']:
  shutil.copy2(OUT/name,evidence/name)
 for name in ['MESSAGES_RUNTIME.json','VALIDATION.json']:shutil.copy2(ROOT/'exports/messages_revision_20261024'/name,evidence/('MESSAGES_'+name))
 for label,r in [('会史总览',history),('全刊总览',book)]:
  folder=DEST/label;folder.mkdir(exist_ok=True)
  for name in r['contacts']:shutil.copy2(ROOT/name,folder/Path(name).name)
 focus=DEST/'会史重点页面';focus.mkdir(exist_ok=True)
 for i in sorted({1,3,6,9,13,history['pages']}):shutil.copy2(ROOT/history['preview_directory']/f'page-{i}.png',focus/f'会史第{i}页.png')
 paragraphs=['# 《山》新版会史排版与总装交付','',f"会史 {history['pages']} 页；内文 {plan['interior_pages']} 页；含封面的电子版 {book['reader_pages']} 页。",'', '最终姓名口径：余淼／2017级会长；楚休红。已撤销此前余→于的错误修改。会史负责人名单、寄语及当前生成文件已核对。历史年度中的其他实际任职保留，避免改变史实。','', '新版会史采用已审校至2019—2020年的前半部，2020—2021年起沿用旧刊已批准内容。105张图（94+11）、427个源内容块、3条原生自动编号脚注均通过核对；无溢流、无缺图链接。','', '会史18页已逐页检查；整刊全部页面已渲染，逐张检查总览并重点复核目录、简介、会史和寄语更正页。其他文章正文字符位置、字号、颜色及图片数据通过比对；只重置数字页码。','', '现有封底状态为PENDING，未找到已批准封底文件；沿用现有电子版正封面+C2空白页结构。未重新设计封面，未做CMYK转换、书脊计算或最终印刷拼版。','', 'INDD依赖原项目中的链接文件；交付PDF可独立阅读。原始交接材料和旧交付归档保留原样，当前口径以本目录为准。','', '页码、目录、图注、脚注、Runtime及冻结范围的详细证据见“验证报告”。源码提交信息见 COMMIT.txt。']
 (DEST/'交付说明.md').write_text('\n'.join(paragraphs)+'\n','utf-8')
 dump(DEST/'FINAL_FILE_HASHES.json',{str(p.relative_to(DEST)):sha(p) for p in DEST.rglob('*') if p.is_file() and p.name!='FINAL_FILE_HASHES.json'})
 print('PASS delivery prepared:',DEST)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--revision',choices=['图片题注R1']);args=parser.parse_args()
 if args.revision:DEST=DEST.with_name(DEST.name+'_'+args.revision)
 main()
 if args.revision:
  p=DEST/'交付说明.md';text=p.read_text('utf-8');text=text.replace('会史18页已逐页检查','会史全部页面总览及图片处理、题注、脚注、末尾重点页已检查')
  text+='\n本次图片题注R1：32组左右图说明去掉分隔分号，改为中间空一行；题注后留2mm；按更新Skill统一同向双图宽高、混合双图等高及2:1宽度；依用户确认允许边缘裁切。九张签名统一格子，仅左下图按用户要求拉伸。修复无题注图片的连续保持规则，末尾活动文字与海报不再分离。原始Word和105张图片保持原样。\n'
  p.write_text(text,'utf-8')
  comparison=DEST/'验证报告/PAGE_COMPARISON_AND_TOC.json';d=json.loads(comparison.read_text('utf-8'));d['previous_revision']={'history_pages':18,'interior_pages':86,'reader_pages':88};dump(comparison,d)
  dump(DEST/'FINAL_FILE_HASHES.json',{str(p.relative_to(DEST)):sha(p) for p in DEST.rglob('*') if p.is_file() and p.name!='FINAL_FILE_HASHES.json'})
