# 《山》InDesign设计规格 v0.1

## DOCUMENT

Trim Size: 185 mm × 260 mm
Facing Pages: true
Bleed: 3 mm all sides

Margins:
- Top 17 mm
- Bottom 20 mm
- Inside 18 mm
- Outside 15 mm

Grid: 6-column modular grid per page
Column Gutter: 6 mm

正文通常使用：2-column text layout；每栏占3个模块列。
不得自行增加第三栏正文。

---

# DESIGN LANGUAGE

整体：文学纪念刊、档案感、克制、低装饰度、高一致性。

视觉母题：
1. 等高线
2. 地质层
3. 星图
4. 年代坐标
5. 档案编号

这些元素必须以细线、低干扰方式使用，不得用其填满正文背景。

---

# COLOR

当前仅建立逻辑色板，不擅自决定最终CMYK数值。

建立：
C_PAPER
C_TEXT
C_MUTED
C_SDU_RED
C_LINE
C_ARCHIVE
C_SPECIAL_BLUE

C_SPECIAL_BLUE: #81C7D4

仅用于《四叠半》等少量特殊页面，不得作为全刊主色。
最终山大红CMYK值将在后续人工确认后填写。

---

# TYPOGRAPHY

正文中文：宋体类字体
标题及信息：黑体类字体
数字、档案编号：Mono字体

如指定字体缺失：不得自行寻找风格明显不同的替代字体；应输出警告，并继续建立样式名称。

正文建议参数：
BODY_CN
9–9.5 pt
Leading 15 pt

最终字号可人工微调，因此所有文字必须通过Paragraph Styles控制。
禁止局部直接格式化。

---

# MASTER / PARENT PAGES

A-TEXT：普通正文
B-INTERVIEW：人物采访
C-HISTORY：会史与时间线
D-FICTION：科幻小说
E-MEMOIR：个人回忆
F-GALLERY：照片与档案
G-MESSAGE：寄语、祝福语
H-CHAPTER：章节扉页
I-FRONT：刊首、目录、版权

所有Parent Page保持可扩展。

---

# PARAGRAPH STYLES

P_Body_CN
P_Body_EN
P_Article_Title
P_Article_Subtitle
P_Author
P_Section_Title_CN
P_Section_Title_EN
P_Chapter_Number
P_Chapter_Intro
P_Interview_Q
P_Interview_A
P_History_Year
P_History_Event
P_Caption
P_Quote
P_Fiction_Chapter
P_Memoir_Title
P_Message_Name
P_Message_Body
P_TOC_Level1
P_TOC_Level2
P_Page_Folio
P_Metadata

禁止使用无样式正文。

---

# CHARACTER STYLES

C_Emphasis
C_Book_Title
C_English
C_Number
C_Metadata
C_Quote
C_SmallCaps

---

# OBJECT STYLES

O_Image
O_Image_FullBleed
O_Image_Archive
O_Caption
O_Text_Main
O_Text_Side
O_Quote_Box
O_Archive_Item
O_Chapter_Line

---

# PAGE NUMBER

页码放置于外侧下方。
章节扉页可以隐藏页码。
禁止将页码置于装订侧。

---

# IMAGE RULE

图片宽度原则上只能：2模块、3模块、6模块。
特殊满版图片除外。
禁止随意拖动形成无网格尺寸。
历史照片尽量保留原始比例。
不得过度美化历史图片。

---

# CHAPTER PAGE

每章使用H-CHAPTER。
内容包括：章节序号、中文章节名、英文章节名、章节前言。
章节前言约80—150中文字。
章节页以留白为主。
允许出现等高线、地层或星图线条。
禁止大面积普通宇宙背景。
