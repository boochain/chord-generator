# 和声生成乐理规则（v2.3）

本文档整理了和弦生成器所依据的乐理规则：资料来源、对资料的分析，以及每条规则在代码里的落点（`src/engine.js`）。
所有生成、随机化和扩展出来的进行，都必须通过 `validate()` 硬校验。没通过就换随机种子重来，最多 40 次，并改用严格声部配置（`validated()`）。
`test/engine.test.js` 跑了 2500 个随机 generate、834 次 regenerate 和 800 个种子扩展组合，断言 100% 合规。

---

## 一、分析

### 1. 资料共识

| # | 共识 | 主要出处 |
|---|------|----------|
| 1 | **功能和声的句法是 T → PD(S) → D → T**。属和弦回到主和弦是最强的收束；S→D 是"正向"运动，D→S 在古典语境中属于"倒退"。 | Open Music Theory（Phrase model / Harmonic syntax）、Kostka《Tonal Harmony》、Fundamentals, Function, and Form、Rohrmeier 2011 |
| 2 | **根音按下行五度（上行四度）运动最常见**。Beethoven 四重奏语料中下行五度占 23.9%。ii–V–I 是爵士里最典型的单元：在 688 首 iRealPro 标准曲里占和弦转移的 21.2%，占三和弦模式的 42% 以上。 | PMC6553690、Shanahan & Broze、Levine《Jazz Theory Book》 |
| 3 | **流行与摇滚高度集中于少数几个和弦**。Hooktheory 统计中 I 17.6%、IV 12%、V 11.6%、vi 7.5%；de Clercq & Temperley 的语料里 I、IV、V、♭VII、♭VI 共占 87%。IV 是 I 之前最常见的和弦，V→IV 的"倒退"在摇滚中很普遍。 | Hooktheory Trends / API、de Clercq & Temperley 2011、Biamonte 2010 |
| 4 | **乐句以 4 小节为单位**（超拍），常见 AABA/ABAC 重复，句末要有终止式（正格、半、变格、阻碍）。 | OMT Hypermeter、Puget Sound（AABA）、jazz phrase rhythm 研究 |
| 5 | **四部和声规则**：避免平行或反向五度、八度；导音上行解决到主音（内声部可以下行）；和弦七音下行级进解决；不重复导音和七音；相邻上方声部间距不超过八度；声部尽量保持共同音、做级进。 | UVM partwriting、Smith College、Macalester、Music in Theory and Practice |
| 6 | **副属和弦只能指向大三或小三和弦**（减和弦不能被调性化），并且须解决到目标和弦；三全音替代须下行半音解决。 | OMT Tonicization、Puget Sound、Wikipedia Tritone substitution |
| 7 | **借用和弦有固定的常用范围**：大调借 iv、♭VI、♭VII、♭III、ii°；小调借 IV、V、♭II（那不勒斯）。 | Clark Ross mixture、Macalester mode mixture、Wikipedia Borrowed chord |
| 8 | **流行音乐有一批经典四和弦图式**：doo-wop（I–vi–IV–V）、axis（I–V–vi–IV）、lament、Andalusian（i–♭VII–♭VI–V）、王道进行（IV–V–iii–vi）、丸サ、卡农、4536251。大部分歌曲是直接套用或变形这些图式，不是逐个和弦随机拼出来的。 | OMT Four-chord schemas、Royal Road（MTS mtad008）、music-color.jp、fx361、Produsso |

### 2. 各风格结论

- **流行 / 华语流行**：以四和弦图式为骨架（1564、6415、4536251、卡农、王道）。七和弦作为色彩，借用和弦很少用（主要是副歌前的 iv 或 ♭VII）。
- **摇滚**：I–IV–V–♭VII 为主，可以出现 V→IV 和双变格（♭VII–IV–I）。强力和弦的平行五度是本风格的惯用法（Biamonte），不算错误。
- **金属**：以小调和弗里几亚为主，♭II、♭VI、♭VII 常见（Lilja）。
- **爵士**：ii–V–I 是核心，可用三全音替代、backdoor（iv7–♭VII7–I）和副属链；全部使用七和弦以上的和弦。
- **布鲁斯**：12 小节固定曲式（可带 quick change）；I7、IV7、V7 属七和弦本身就是调性色彩。
- **R&B / 新灵魂 / 嘻哈**：两到四和弦循环（vamp），maj7、m9 常见；Just the Two of Us 进行（丸サ）。
- **电子 / Lo-fi**：小调四和弦循环（vi–IV–I–V、i–VI–III–VII），重复度高。
- **古典**：严格遵守 T–PD–D–T，禁止 V→IV，必须有正格终止和规范的声部进行。
- **国风 / 古风**：以五声音阶为基础，少用 4 级和 7 级偏音所构成的强功能和弦；多用 sus2/sus4/add9，弱化 V7 的导音解决（知猫 五声性和弦、cqvip 偏音论文、Produsso）。
- **拉丁 / 弗拉门戈**：安达卢西亚终止 i–♭VII–♭VI–V，bossa nova 用 ii–V 加七和弦扩展。
- **雷鬼**：I–IV、I–V 两和弦的反拍循环。
- **福音**：IV–I 变格、副属和 7–3–6 链。

### 3. 研究发现 → 算法规则 / 权重

| 发现 | 代码实现 |
|------|----------|
| 共识 8（图式为主） | `PROG_LIB`：按风格、大小调整理的真实进行库（罗马数字），`pickTpl()` 优先从中选；Markov 只在 B 段以约 15% 的概率参与 |
| 共识 3（语料频率） | `MARKOV` 级数转移矩阵：大调 I→V .31、IV→I .36、IV→V .36、V→I .45、V→vi .30、vi→IV .45、ii→V .66；小调 i→iv/VI/VII 各 .25、V→i .75、VII→i .40、VII→III .35；再乘以风格级数权重的平方根 |
| 共识 4（乐句） | `FORMS`：4 小节一句，AA / AABA 等形式；`endPhrase()` 让 B 段结束在半终止、末句用正格或变格终止，`buildProg` 强制最后一个和弦为主和弦 |
| 共识 1（功能句法） | `chordIssues`：古典风格禁止 V→IV；`validate`：非末段段尾须落在 T 或 D，全曲末和弦为主和弦，倒数第二个和弦须为 D、S、调式特征或 ♭VII |
| 共识 6（副属） | `repairSecondary` 和 `chordIssues`：副属须解决到下五度的大三或小三和弦，三全音替代须下行半音；复杂度 ≥ 2 才允许出现副属 |
| 共识 7（借用） | `BORROW_OK` 白名单：大调为 iv(5m)、♭VI(8)、♭VII(10)、♭III(3)、ii°(2dim)、v(7m)…，小调为 IV、V、♭II…；复杂度 0 时不借用，复杂度 1 时借用概率 × 0.2，且每句最多 n/4 个色彩和弦 |
| 减和弦解决 | `chordIssues`：减和弦须上行半音或上行四度（即下五度）解决 |
| 共识 5（声部进行） | `vlIssues()`：平行或反向五度、八度（包括与低音之间），导音不解决，七音不下行解决；`voiceAll()` 用 Viterbi 动态规划为全曲选择配置（违规罚 80 分，严格模式罚 1000 分），单声部移动超过 7 个半音罚 500 分 |
| 排列与音域 | 上方声部用密集排列，限定在 MIDI 52–79（E3–G5），跨度不超过 12 个半音；低音在 40–52（E2–E3），以原位为主，转位只在低音级进时使用；属和弦不用三音作低音 |
| 不重复导音和七音 | `upperPcs()`：超过 4 个音时先省略五音、再省略根音，每个音级只出现一次 |
| 复杂度与色彩 | 默认复杂度 0–1（三和弦或七和弦）；扩展音权重偏向普通七和弦；同一和弦在全曲中保持同一性质（`applyComplexity` 中的 memo） |
| 小调属 | 和声小调 V 被视为合规（`和声小调属`）；七和弦性质取自真正包含该根音的音阶（修复了 Dbdim7 一类错误） |
| 调式 | 调式（多利亚、混合利底亚等）的权重 × 0.35；在调式中，段尾 `cadV` 使用自然的 v，而不是硬借大三和弦的 V |
| 连续重复 | `legalize`：同一和弦连续出现 3 次时用同功能和弦替换（vamp 风格例外） |
| 国风 | 国风模板使用五声和 sus 色彩，规避强 V7 |
| 拍号 | 风格允许时默认 4/4（测试要求 ≥ 90%） |
| 旋律 | `melodyFor`：每个和弦的起点落在和弦音上，以级进为主（测试要求 ≥ 80%），音域 64–79 |

**例外，有意为之**：用户输入的种子和弦属于用户给定的素材，跳过借用白名单和解决检查，但声部规则照样检查。固定曲式风格（布鲁斯）跳过借用白名单。播放用的 drive（强力和弦）伴奏型产生的平行五度属于风格惯用法，不在校验范围内。

### 4. 旧版为什么"诡异"

在 1500 首默认设置的歌曲上做的统计：

- 20.6% 的和弦是调外和弦（副属 1069 个、借用 1546 个）；
- 约 43% 的歌曲复杂度 ≥ 2，充斥 9、11、13、alt 和弦；
- 25% 的歌曲不是 4/4 拍；
- 约 1/3 用的是调式；
- 和弦逐个随机拼接，没有乐句重复，也没有终止式；
- 声部最高到 MIDI 81，跨度超过 14 个半音的情况有 3132 处，单声部跳进最大 15 个半音；
- 旋律随机跳进。

结果听起来"没有调、没有句子、没有落点"。现在调外和弦降到 11.5%（主要是合规的和声小调 V），4/4 占 97.7%，单声部最大移动 ≤ 7 个半音（平均 1.9），乐理校验 100% 通过。

---

## 二、资料来源

**教材与开放课程**
1. Open Music Theory 2e（LibreTexts）– Introduction to Harmony
2. Open Music Theory（Pressbooks）– The Phrase Model
3. Open Music Theory 1e – Harmonic Functions / Harmonic Syntax（GitHub 版）
4. Open Music Theory – Tonicization（Nebraska 版）
5. Open Music Theory – Four-chord Schemas in Pop
6. Open Music Theory – Classical Schemas
7. Open Music Theory – Modal Schemas
8. Open Music Theory – Harmonic Substitutions (jazz)
9. Open Music Theory – Hypermeter
10. Fundamentals, Function, and Form – Pre-dominant chords
11. Puget Sound, *Music Theory for the 21st-Century Classroom* – Tonicization、AABA form
12. OERTX *Survey of Music Theory*
13. musictheory.net 课程（Chord progressions、Voice leading）
14. musictheoryteacher.com – Chord progressions
15. Kostka & Payne,《Tonal Harmony》（各章摘要）
16. Clark Ross – Modal Mixture（PDF 讲义）
17. Music in Theory and Practice, ch. 9

**四部和声与声部进行**
18. University of Vermont – Part-writing rules
19. Smith College – Four-part writing guide
20. Macalester *Multimodal Musicianship* – SATB guidelines
21. Macalester – Secondary dominants
22. Macalester – Mode mixture

**语料统计与学术研究**
23. Hooktheory API 文档（和弦转移概率）
24. Hooktheory Trends
25. Hooktheory Blog – "I analyzed the chords of 1300 popular songs" Part 1
26. 同上 Part 2
27. 同上 Part 3
28. Hooktheory Blog – Chord inversions
29. de Clercq & Temperley (2011), "A corpus analysis of rock harmony", *Popular Music*
30. Temperley & de Clercq (2013), "Statistical analysis of harmony and melody in rock music", *JNMR*
31. Shaffer et al. – McGill Billboard 和弦簇分析（*Empirical Musicology Review*）
32. J. A. Burgoyne – McGill Billboard 博士论文
33. Biamonte (2010), "Triadic modal and pentatonic patterns in rock music", *Music Theory Spectrum*
34. Biamonte – 金属和声相关论文
35. Temperley – "The melodic-harmonic 'divorce' in rock"
36. Nobile – "Teleology in verse-prechorus-chorus form", *MTO* 28.3
37. Nobile, *Form as Harmony in Rock Music*（书评）
38. Doll – "Some practical issues with six-based minor", *MTO* 27.4
39. Doll, *Hearing Harmony*
40. Royal Road progression 论文（*Music Theory Spectrum*, mtad008）
41. Fink – *MTO* 32.2
42. Lehman, *Hollywood Harmony*
43. Lilja, *The Theory and Analysis of Classic Heavy Metal Harmony*
44. Rohrmeier (2011), "Towards a generative syntax of tonal harmony"
45. Rohrmeier (2020), 爵士和声句法
46. Beethoven 弦乐四重奏和声语料（PMC6553690）
47. Shanahan & Broze – iRealPro 爵士语料（Zenodo）
48. 爵士标准曲乐句节奏研究（688 首）
49. Jazz Harmony Treebank
50. Bunks – 爵士和声语料
51. AU Press – 爵士和弦进行网络分析

**爵士与风格指南**
52. Mark Levine, *The Jazz Theory Book*
53. Wikipedia – Tritone substitution
54. Anton Schwartz – Backdoor progression
55. Wikipedia – Andalusian cadence
56. John Moore – Flamenco harmony
57. chordprogressions.org – 12-bar blues
58. piano.org – Blues progressions
59. Premier Guitar – Blues / rock harmony
60. GuitarPlayer – Chord progression lessons
61. EDM Ghost Production – EDM chord progressions
62. Native Instruments Blog – Lo-fi chord progressions
63. orphiq – Reggae chord progressions
64. chordly – Bossa nova progressions
65. Motifkit / Flat – K-pop progressions
66. KCI – K-pop 和声论文
67. Ethan Hein Blog – Pop harmony
68. Popgrammar
69. Wikipedia – Borrowed chord

**中文与日文资料**
70. Produsso – 中国风编曲指南
71. Produsso – 古风和声指南
72. 维普（cqvip）– 五声调式偏音研究论文
73. 知猫 – 五声性和弦
74. Shawn Wang – 流行和声
75. fx361 – 从卡农到万能和弦
76. Produsso – 华语黄金八小节
77. music-color.jp – 定番コード進行
78. TabLogic – Just the Two of Us 进行
