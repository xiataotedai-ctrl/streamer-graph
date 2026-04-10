import { RelationshipType } from './types';

// 关系类型配置：颜色、线型、标签
export const RELATIONSHIP_CONFIG: Record<RelationshipType, {
  label: string;
  color: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  width?: number;
}> = {
  mentor:    { label: '师徒', color: '#ffd54f', width: 2 },
  partner:   { label: '搭档', color: '#4fc3f7', width: 2 },
  family:    { label: '同家族', color: '#66bb6a', width: 2 },
  guild:     { label: '同公会', color: '#26c6da', width: 2 },
  cp:        { label: 'CP', color: '#f06292', width: 2 },
  friend:    { label: '好友', color: '#81c784', width: 1.5 },
  rival:     { label: '竞争', color: '#ff7043', width: 2, lineStyle: 'dashed' },
  enemy:     { label: '结仇', color: '#ef5350', width: 2.5 },
  betrayed:  { label: '反目', color: '#ef5350', width: 2, lineStyle: 'dashed' },
  custom:    { label: '自定义', color: '#ab47bc', width: 1.5 },
};

// 品类颜色映射 — 按直播互动 / 游戏两大类分色系
export const CATEGORY_COLORS: Record<string, string> = {
  // 直播与互动类 — 暖色系
  '传统文化': '#ff8a65',
  '剧情直播': '#ef5350',
  '团播':     '#e91e63',
  '大舞台':   '#f06292',
  '生活服务': '#ffd54f',
  '音乐':     '#ffb74d',
  '舞蹈':     '#ff7043',
  '电商':     '#d81b60',
  '宫格':     '#ce93d8',
  '弹幕':     '#ba68c8',
  '户外':     '#66bb6a',
  '故事分享': '#81c784',
  '版权直播': '#4db6ac',
  '知识分享': '#4fc3f7',
  '闲聊互动': '#aed581',
  '颜值':     '#f48fb1',
  // 游戏类 — 冷色系
  '射击':     '#42a5f5',
  '策略':     '#5c6bc0',
  '卡牌':     '#7e57c2',
  '综合游戏': '#26c6da',
  'MOBA':     '#1e88e5',
  '休闲小游戏': '#80deea',
  '棋牌':     '#9ccc65',
  'RPG':      '#ab47bc',
  '传奇':     '#8d6e63',
  '单机':     '#78909c',
  '主机':     '#546e7a',
};

// 默认品类颜色
export const DEFAULT_CATEGORY_COLOR = '#78909c';

// 品类分组（用于 UI 分组展示）
export const CATEGORY_GROUPS = [
  {
    label: '直播与互动',
    categories: [
      ['传统文化', '剧情直播', '团播', '大舞台'],
      ['生活服务', '音乐', '舞蹈', '电商', '宫格', '弹幕', '户外'],
      ['故事分享', '版权直播', '知识分享', '闲聊互动', '颜值'],
    ],
  },
  {
    label: '游戏',
    categories: [
      ['射击', '策略', '卡牌', '综合游戏', 'MOBA'],
      ['休闲小游戏', '棋牌', 'RPG', '传奇'],
      ['单机', '主机'],
    ],
  },
];

// 常用游戏名（用于板块标签，非品类）
export const GAMES = [
  '王者荣耀', '和平精英', '英雄联盟', '原神', '第五人格',
  '穿越火线', '永劫无间', 'DNF', '逆水寒',
  'LOL手游', '金铲铲之战', '蛋仔派对', '崩坏星穹铁道',
  '超自然行动组', '三角洲行动',
];

// 身份等级对应的节点大小
export const IDENTITY_SIZE: Record<number, number> = {
  1: 24,   // 尾部
  2: 30,   // 中下部
  3: 38,   // 腰部
  4: 48,   // 头部
  5: 60,   // 顶流
};

// 圈层分组可选颜色
export const GROUP_COLORS = [
  'rgba(229, 57, 53, 0.15)',
  'rgba(67, 160, 71, 0.15)',
  'rgba(30, 136, 229, 0.15)',
  'rgba(142, 36, 170, 0.15)',
  'rgba(251, 140, 0, 0.15)',
  'rgba(0, 172, 193, 0.15)',
  'rgba(244, 67, 54, 0.15)',
  'rgba(253, 216, 53, 0.15)',
];

// 圈层边框颜色（对应上方，不透明）
export const GROUP_BORDER_COLORS = [
  'rgba(229, 57, 53, 0.6)',
  'rgba(67, 160, 71, 0.6)',
  'rgba(30, 136, 229, 0.6)',
  'rgba(142, 36, 170, 0.6)',
  'rgba(251, 140, 0, 0.6)',
  'rgba(0, 172, 193, 0.6)',
  'rgba(244, 67, 54, 0.6)',
  'rgba(253, 216, 53, 0.6)',
];

// 预设平台
export const PLATFORMS = ['抖音', '快手', 'B站', '虎牙', '斗鱼', 'YY', '小红书', '其他'];

// 预设地域 — 覆盖全国 34 个省级行政区 + 常用地域标签
export const REGIONS = [
  // 直辖市
  '北京', '上海', '天津', '重庆',
  // 省
  '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南',
  '四川', '贵州', '云南', '陕西', '甘肃', '青海',
  '台湾',
  // 自治区
  '内蒙古', '广西', '西藏', '宁夏', '新疆',
  // 特别行政区
  '香港', '澳门',
  // 常用地域标签
  '东北', '港澳台', '海外',
];

// 预设才艺
export const TALENTS = ['唱歌', '跳舞', '搞笑', '技术流', '户外', '脱口秀', '绘画', '乐器', '配音', '其他'];
