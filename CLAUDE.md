# 缝纫作业辅助工具 (Sewing Assistance Tool)

单文件静态网页应用，帮助缝纫爱好者根据成品尺寸自动计算裁剪方案（裁片尺寸、用料统计、示意图）。

## 项目结构

```
C:\flj\
  index.html         # 主应用文件，HTML + CSS + JS 全部内联
  manifest.json      # PWA 清单
  sw.js              # Service Worker（离线缓存）
  icon.svg           # PWA 图标（线轴+针线+剪刀图案）
  icon-192.png       # 192×192 PNG 图标
  icon-512.png       # 512×512 PNG 图标
  CLAUDE.md          # 本文件
```

零依赖，零构建步骤，部署到 GitHub Pages 即可通过 HTTPS 访问并安装到手机主屏幕。

## 技术栈

- HTML5（语义化标签、viewport 适配、PWA meta 标签）
- CSS3（Grid / Flexbox、渐变、动画、@media print、移动端响应式）
- 原生 JavaScript ES6
- Canvas 2D API（裁片示意图，支持矩形/梯形/圆形/圆角矩形 + 布纹方向箭头）

## 当前支持的产品类型（9 种）

| 类型 | key | 特点 |
|------|-----|------|
| 手提包 | bag | 提手+里布 |
| 托特包 | tote | 大尺寸+宽提手+里布 |
| 化妆包 | pouch | 无提手+里布 |
| 笔袋 | pencil | 梯形侧片，含拉链余量 |
| 束口袋 | drawstring | 圆形底部+穿绳袋身 |
| 杯套 | cupsleeve | 圆形底部，环绕包身 |
| 隔热垫 | potholder | 表布+里布+铺棉，圆角矩形 |
| 收纳盒 | box | 标准盒型 |
| 自定义 | custom | 自由增删裁片，自定义形状和尺寸 |

## 裁片形状

支持四种形状：矩形(rect)、梯形(trapezoid)、圆形(circle)、圆角矩形(rounded)。
Canvas 示意图按实际形状绘制，并标注布纹方向箭头（虚线经向指示）。

## 已实现功能

- 裁片计算（尺寸+缝份自动展开）
- 材料用量统计（总面积、裁片数、缝线长度、布料长度/利用率）
- 裁片详情列表 + Canvas 示意图
- 历史记录持久化（localStorage，最多20条，支持加载/删除）
- 用户偏好记忆（产品类型、尺寸参数自动恢复）
- 打印方案（@media print 自动隐藏输入卡片）
- 复制裁片清单到剪贴板
- PWA 离线支持（Service Worker + manifest.json）
- 添加到主屏幕按钮（Android 原生弹窗 / iOS 引导卡片）

---

## v2 开发计划

### 设计目标

将工具从"工业纸格式拆解"转变为"手作者视角的裁剪方案"：
1. 用户自由定义面料组合（撞色 2/3/4 种随意）
2. 每个裁片可归属任意一种面料
3. 输出每种面料各自的用料清单和排版参考图
4. 裁片符合实际手作习惯（连体片、侧片合并）
5. 所有产品类型均可自定义增删裁片

---

### 阶段一：数据模型升级

**目标**：引入面料分组概念，重构底层数据结构，为后续所有功能打基础。

**改动**：

1. **新增 `fabrics` 全局数组**
   ```js
   fabrics = [
     { id: 'fabric_a', name: '面料A', color: '#667eea' },
     { id: 'fabric_b', name: '面料B', color: '#43e97b' },
     { id: 'lining',   name: '里布',   color: '#999' },
   ]
   ```

2. **裁片对象增加 `fabricId` 字段**
   ```js
   piece = { name, count, width, height, color, shape, fabricId: 'fabric_a', ... }
   ```

3. **`PRODUCT_CONFIG` 增加默认面料分组**
   每种产品类型预设 2-4 组面料（表布A/表布B/里布），以及各裁片默认归属。

4. **新增函数**：
   - `groupByFabric(pieces)` — 按 fabricId 分组
   - `getFabricStats(fabricId, pieces)` — 单一面料的用量统计
   - `calculateFabricUsage(fabricId, pieces, fabricWidth)` — 单一面料的排版计算

5. **历史记录数据结构升级**
   - `history` 中增加 `fabrics` 快照，兼容旧版数据迁移

---

### 阶段二：面料管理 UI

**目标**：用户可以自由增删面料组、自定义名称和颜色、给每个裁片分配面料。

**新增 HTML**：在"缝纫参数设置"卡片和"自定义裁片编辑器"之间插入"面料管理"卡片。

**UI 元素**：
- `fabricList` — 面料列表，每个面料一行：颜色球 + 名称输入框 + 删除按钮
- `addFabricBtn` — "+ 添加面料"按钮
- 每个裁片的模板中增加面料下拉选择器

**JS 函数**：
- `renderFabricManager()` — 渲染面料管理面板
- `addFabric()` / `removeFabric(id)`
- `updateFabric(id, field, value)`
- `getFabricById(id)` / `getFabricOptions()` — 生成 `<select>` 选项

**CSS**：面料管理卡片样式，面料行横向布局，颜色球用 `<input type="color">`

---

### 阶段三：里布补全 + 侧片合并开关

**目标**：修复里布裁片缺失，增加侧片合并功能。

**3A. 里布补全**
- 修改 `calculatePieces`：侧片里布、底片里布自动生成
- 表布里布一一对应：每个表布裁片自动生成对应里布裁片（fabricId='lining'）
- 所有产品类型统一此规则

**3B. 侧片合并开关**
- 参数卡新增 toggle："合并侧片"（`mergeSides`，默认 true）
- 合并逻辑：
  - 前片新宽 = 原前片宽 + 侧片宽 × 2（左右合并）
  - 后片同前片
  - 移除独立的左侧片、右侧片
  - 示意图中为连体片，标注折叠线
- 新增形状 `notched`：矩形主体 + 对称凹槽，参数为 `notchDepth`（凹槽深）、`notchHeight`（凹槽高）、`notchTop`（凹槽距顶）
- Canvas 绘制 `notched` 形状（路径绘制）

---

### 阶段四：面料分组统计面板

**目标**：统计区域从 6 个固定卡片改为按面料分组动态生成。

**改动**：
- `displayResults` 重构：按 fabricId 分组遍历，每组生成一组统计卡片
- 每组卡片内容：面料名称、该面料裁片数、总面积、所需布长、利用率
- 卡片标题用面料颜色做左边框
- 裁片详情列表中每个裁片显示面料标签

**DOM 结构**：
```
<div class="fabric-group" data-fabric="fabric_a">
  <h3 style="border-color:#667eea">面料A</h3>
  <div class="fabric-stats">...</div>
  <div class="fabric-pieces">...</div>
  <canvas class="fabric-layout" />
</div>
```

---

### 阶段五：按面料分组的排版参考图

**目标**：每种面料一张排版 Canvas，展示该面料上的裁片排布。

**JS 函数**：
- `drawFabricLayout(fabricId, pieces, fabricWidth)` — 单一面料的排版 Canvas
  - 复用 `layoutPieces`（shelf packing 算法）
  - 过滤出 `fabricId` 匹配的裁片
  - Canvas 上绘制裁片排列 + 尺寸标注 + 布纹方向
  - 标注所需布料长度和利用率

**剩余面料推荐**：
- `suggestScraps(fabricId, pieces, fabricWidth)` 
- 计算剩余面积（布幅 × 剩余长度）
- 按阈值匹配推荐：>200cm² 卡包、>600cm² 零钱包、>1500cm² 大肠发圈

**打印**：打印时每种面料的排版图各自一行。

---

### 阶段六：所有产品类型开放裁片编辑

**目标**：任何产品类型都可以编辑裁片列表，不再是只有"自定义"才可以。

**改动**：
- 裁片编辑器卡片始终可见（去掉 `isCustom` 隐藏逻辑）
- 切换产品类型时：加载默认裁片 → 存入 `customPieces` → 渲染编辑器
- 新增"重置为默认"按钮：恢复该产品类型的原始裁片配置
- `calculatePieces` 简化：始终从 `customPieces` 读取（非自定义类型初始值 = 默认裁片）
- 裁片编辑器增加"复制当前裁片"功能：快速创建变体（改个面料归属就是新裁片）

---

### 阶段七：notched 异形裁片 + 连体片

**目标**：支持带凹槽的连体裁片和更多异形。

**7A. notched 形状参数**
```
{ shape: 'notched', 
  notchLeft: { depth: 6, height: 10, top: 24 },
  notchRight: { depth: 6, height: 10, top: 24 }
}
// depth = 向内凹进深度, height = 凹槽高度, top = 距顶部距离
```

**7B. Canvas 绘制**
- `drawPieceDiagram` 新增 notched 分支
- 路径绘制：外轮廓 → 左凹槽 → 右凹槽 → 闭合
- 标注关键尺寸（总宽、凹槽深、凹槽高、中间窄处宽）

**7C. 面积计算**
- notched 裁片面积 = 外矩形面积 - 左右凹槽面积
- 确保排版算法使用正确的面积数据

---

### 阶段八：打包收尾

- 更新 `sw.js` 缓存版本
- 验证移动端 PWA 安装流程
- 确认打印样式适配新布局
- `convert-icons.html` 删除（一次性工具）
- 测试 Chrome DevTools Lighthouse PWA 评分

---

### 实施顺序

| 阶段 | 内容 | 预估改动行数 |
|------|------|-------------|
| 一 | 数据模型升级 | ~100 |
| 二 | 面料管理 UI | ~150 |
| 三 | 里布补全 + 侧片合并 | ~120 |
| 四 | 面料分组统计 | ~80 |
| 五 | 排版参考图 + 剩余推荐 | ~150 |
| 六 | 全类型裁片编辑 | ~60 |
| 七 | notched 异形裁片 | ~100 |
| 八 | 收尾 | ~30 |
| 额外 | 每种面料独立幅宽/长度管理 | ~80 |

## v2 开发状态：✅ 已完成（2026-06-15）

全部 8 阶段 + 面料宽长独立管理已完成。文件约 2453 行。

### v2 新增文件
- `icon.svg` — PWA 矢量图标（线轴+针线+剪刀设计）
- `icon-192.png` / `icon-512.png` — PNG 备选图标

### v2 已删除文件
- `convert-icons.html` — 一次性 SVG→PNG 转换工具（已删除）

---

## v3 开发：成品结构图 + 裁剪展开图

### 新增功能（2026-06-15）

- **成品结构图**：多视图Canvas（正面主视+横截面+背面/侧面/底部/顶部小图），750×560
  - 绑在 `hasHandles` 配置上——包包有提手就显示提手，束口袋显示束绳
- **裁剪展开图**：按面料分组的裁片网格展示，含形状绘制+尺寸标注+布纹箭头
- **非盒型产品fallback**：束口袋/杯套/笔袋/隔热垫自动降级为简单平铺图

### 已移除功能

- **成品部件配置面板**（2026-06-15 移除）：原计划通过UI自由增删口袋/花边/拉链等，但与裁剪计算无联动，仅影响示意图视觉效果，用户决定去掉

### 行为规范

**每次修改前**：
1. 先读 `CLAUDE.md` 了解项目上下文
2. 先读 `index.html` 相关段落确认当前状态
3. 使用 Git 了解最近改动：`git diff` 或 `git log`

**每次修改后**：
1. 验证 JS 语法：`node -e "new Function(html.match(/<script>([\s\S]*?)<\/script>/)[1])"`
2. 更新 `CLAUDE.md` 记录新增/修改的功能
3. 确保不破坏现有功能（排版参考图、缝纫提示、裁片详情等）

**代码规范**：
- 零依赖，纯 HTML+CSS+JS 单文件
- 使用 `var` 而非 `let/const` 以保证旧浏览器兼容
- Canvas 绘制前检查元素存在性
- 所有新功能需在 `displayResults` 中串联调用
- 新功能调用必须用 try-catch 包裹，防止单点故障导致后续渲染中断
- 函数签名修改后必须同步更新所有调用点，参数数量和顺序必须一致

### 已知问题与修复记录

**2026-06-15：drawMiniBag 参数错位导致页面渲染中断**
- `drawMiniBag` 函数签名有11个参数但调用点只传10个，`mc` 和 `groups` 互换导致 `lightenColor(object)` 报错
- 修复：移除无用 `tw` 参数，对齐为10参数 `(ctx, cx, cy, bw, bh, mc, groups, ms, view, Lorig, Horig)`
- `drawStructurePreview` 和 `drawCuttingLayout` 调用处加入 try-catch 防护

**2026-06-15：accessoryConfig 持久化兼容**
- `loadPreferences` 中使用深度合并而非直接覆盖，防止旧格式缺失字段导致 `renderAccessoryConfig` 崩溃
- `renderAccessoryConfig` 中 `accessoryConfig[key]` 访问加 `|| {}` 兜底
