// 剪辑表：120 BPM，一小节 2 秒。每种风格 2 小节（4 秒），转场以小节强拍为中心。
(function () {
  const STYLES = [
    [1, 'hand', '逐帧手绘', 'Frame-by-frame Hand-drawn'],
    [2, 'iso', '等轴 2.5D', 'Isometric 2.5D'],
    [3, 'flat', '扁平矢量', 'Flat Vector'],
    [4, 'line', '线条动画', 'Single-line Art'],
    [5, 'render3d', '3D 渲染', '3D Render'],
    [6, 'morph', '形变动画', 'Shape Morph'],
    [7, 'sticker', '贴纸风科普', 'Sticker Explainer'],
    [8, 'hud', '赛博朋克 HUD', 'Cyberpunk HUD'],
    [9, 'collage', '拼贴剪贴', 'Collage Cut-out'],
    [10, 'glass', '弥散玻璃拟态', 'Aurora Glassmorphism'],
    [11, 'bauhaus', '几何构成 · 包豪斯', 'Bauhaus Construction'],
    [12, 'synth', '复古 Synthwave', 'Retro Synthwave'],
    [13, 'pixel', '16-bit 像素风', '16-bit Pixel Art'],
    [14, 'liquid', '液态流动', 'Liquid Jelly'],
    [15, 'variety', '综艺花字', 'Variety-show Captions'],
    [16, 'ink', '水墨写意', 'Chinese Ink Wash'],
    [17, 'swiss', '瑞士动态排版', 'Swiss Kinetic Type'],
    [18, 'blueprint', '蓝图工程图', 'Blueprint'],
    [19, 'popart', '波普漫画', 'Pop-art Comic'],
    [20, 'riso', '孔版印刷', 'Risograph Print'],
    [21, 'papercut', '纸雕层叠', 'Layered Paper-cut'],
    [22, 'neon', '霓虹灯牌', 'Neon Sign'],
    [23, 'ascii', '字符画终端', 'ASCII Terminal'],
    [24, 'silent', '黑白默片', 'Silent Film'],
    [25, 'particles', '生成艺术 · 粒子', 'Generative Particles'],
  ].map(([n, key, zh, en]) => ({ n, key, zh, en }));

  // 进入每一段时用的转场（键 = 进入的段）。转场贴合目标风格的语言。
  const TRANS = {
    2: 'drop', 3: 'iris', 4: 'linewipe', 5: 'zoom', 6: 'blob', 7: 'whip', 8: 'glitch', 9: 'tear', 10: 'defocus',
    11: 'flip', 12: 'crt', 13: 'mosaic', 14: 'wave', 15: 'band', chapter: 'shutter',
    16: 'ink', 17: 'slats', 18: 'scan', 19: 'halftone', 20: 'misreg', 21: 'layers', 22: 'flicker', 23: 'rows', 24: 'irisblack', 25: 'dissolve',
  };
  const SEG = 4, INTRO = 4, CHAPTER = 4, OUTRO = 12;
  const segs = []; let t = 0;
  segs.push({ kind: 'intro', start: t, dur: INTRO }); t += INTRO;
  for (const s of STYLES) {
    if (s.n === 16) { segs.push({ kind: 'chapter', start: t, dur: CHAPTER, trans: TRANS.chapter }); t += CHAPTER; }
    segs.push({ kind: 'scene', n: s.n, start: t, dur: SEG, trans: s.n === 1 ? 'cut' : TRANS[s.n] }); t += SEG;
  }
  segs.push({ kind: 'outro', start: t, dur: OUTRO, trans: 'cut' }); t += OUTRO;
  const TRANS_DUR = { layers: 0.8, ink: 0.8, crt: 0.7, irisblack: 0.8, dissolve: 0.8, band: 0.7 };
  window.TL = { STYLES, segs, TOTAL: t, SEG, transDur: k => TRANS_DUR[k] || 0.6 };
})();
