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

// 品类颜色映射
export const CATEGORY_COLORS: Record<string, string> = {
  '王者荣耀': '#e53935',
  '和平精英': '#43a047',
  '英雄联盟': '#1e88e5',
  '原神': '#8e24aa',
  '第五人格': '#6d4c41',
  '穿越火线': '#fb8c00',
  '永劫无间': '#00acc1',
  'DNF': '#546e7a',
  '直播带货': '#d81b60',
  '才艺': '#fdd835',
};

// 默认品类颜色
export const DEFAULT_CATEGORY_COLOR = '#78909c';

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

// 预设地域
export const REGIONS = ['四川', '重庆', '广东', '东北', '北京', '上海', '浙江', '湖南', '湖北', '山东', '河南', '福建', '其他'];

// 预设才艺
export const TALENTS = ['唱歌', '跳舞', '搞笑', '技术流', '户外', '脱口秀', '绘画', '乐器', '配音', '其他'];
