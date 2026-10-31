from pathlib import Path
import json,hashlib,shutil

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'exports/history_reflow'
DEST=ROOT.parent/'交付文件/会史文字填白重排_20261031'

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
 a=json.loads((OUT/'ACCEPTANCE.json').read_text('utf-8'))
 assert a['status']=='PASS' and a['visual']=='PASS'
 DEST.mkdir(parents=True,exist_ok=True)
 for src,name in [('SHAN_HISTORY_REFLOW.pdf','会史_文字填白重排.pdf'),('SHAN_HISTORY_REFLOW.indd','会史_文字填白重排.indd')]:shutil.copy2(OUT/src,DEST/name)
 report=DEST/'排版说明与验证';report.mkdir(exist_ok=True)
 for name in ['ACCEPTANCE.json','REFLOW_DIAGNOSTIC.json','HISTORY_RUNTIME.json','IMAGE_BODY_MOVES.csv']:shutil.copy2(OUT/name,report/name)
 skill=Path('D:/Codex/skills/indesign-publication-production')
 files=['SKILL.md','references/image-placement.md','references/editorial-design-and-layout.md']
 for name in files:
  text=(skill/name).read_text('utf-8');assert 'text-first' in text.lower() or 'text first' in text.lower() or 'Word order of pictures' in text
 description='''# 会史文字填白重排

本次只交付会史。先更新了 InDesign Skill，明确 Word 的图片与正文交错位置不构成排版限制：允许后续正文先填充空栏，完整图片题注组随后安置。

会史由26页重排为25页，正文原文、时间顺序和全部590个内容块保持完整；170张图片、原有尺寸与裁切、九张签名网格及左下图拉伸均保留，5条原生自动编号脚注继续横跨两栏。姓名和用户最终确认的署名、11月记录保持不变。

解除正文、名单与图片之间不必要的保持关系，按内容ID调整66次图注组位置。正文顺序与图片身份、图注对应独立核对。非末页超过20毫米的栏末空白由15处降为0处，最大栏末余量由约61毫米降为约17毫米（按原生文字基线与脚注区计量）。末页已平衡两栏，内容结束后的留白保留，不删内容、不拉大正文。

已查看全部25页总览，并重点查看2007年、2008—2010年、2014年、九宫格及末页；无文字溢出、无缺图，题注与图片同页。原Word、旧交付、其他文章及整刊输出未修改。INDD继续链接原项目素材，PDF可独立阅读。

Skill修改记录见SKILL_CHANGE.json。内置quick_validate未能运行：当前Python缺少PyYAML，离线缓存也无该依赖；未联网安装。原有frontmatter未改，变更内容和链接已人工检查，实际会史脚本已通过InDesign原生运行与内容、几何核对。
'''
 (DEST/'排版说明.md').write_text(description,'utf-8')
 change={'files':{str(skill/name):sha(skill/name) for name in files},'policy':'Text-first gap filling; body order distinct from media/body interleaving; History-only scope','frontmatter':'Unchanged','quick_validate':'Unavailable: PyYAML absent and offline cache empty; no network install','native_publication_validation':'PASS'}
 (report/'SKILL_CHANGE.json').write_text(json.dumps(change,ensure_ascii=False,indent=2)+'\n','utf-8')
 acceptance={k:a[k] for k in ['status','pages','source_blocks','images','native_full_width_footnotes','media_moves','gaps','pdf_sha256','source_word_sha256']}
 acceptance['delivery']=str(DEST);acceptance['scope']='HISTORY_ONLY_NO_BOOK_REBUILD'
 (ROOT/'workflow/HISTORY_REFLOW_ACCEPTANCE.json').write_text(json.dumps(acceptance,ensure_ascii=False,indent=2)+'\n','utf-8')
 hashes={str(p.relative_to(DEST)):sha(p) for p in DEST.rglob('*') if p.is_file() and p.name!='FILE_HASHES.json'}
 (DEST/'FILE_HASHES.json').write_text(json.dumps(hashes,ensure_ascii=False,indent=2)+'\n','utf-8')
 print('PASS History-only delivery:',DEST)

if __name__=='__main__':main()
