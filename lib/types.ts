// 主播节点
export interface StreamerNode {
  id: string;
  name: string;
  platforms: string[];     // 支持多平台
  tags: StreamerTags;
  identityLevel: 1 | 2 | 3 | 4 | 5;  // 1=尾部, 5=头部
  customSize?: number;     // 手动覆盖大小
  customColor?: string;    // 手动覆盖颜色
  customAnnotation?: string; // 自定义标注文本
  groupId?: string;        // 主要分组
  groupIds?: string[];     // 多分组归属
  notes?: string;          // 备注
}

export interface StreamerTags {
  regions: string[];       // 地域: 四川、东北...
  categories: string[];    // 品类: 王者荣耀、和平精英...
  talents: string[];       // 才艺: 唱歌、搞笑、技术流...
  sections: string[];      // 板块: 游戏区、才艺区...
  custom: string[];        // 自定义标签
}

// 关系边
export interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  label?: string;          // 关系描述
  since?: string;          // 关系起始时间
}

export type RelationshipType =
  | 'mentor'      // 师徒
  | 'partner'     // 搭档
  | 'family'      // 同家族
  | 'guild'       // 同公会
  | 'cp'          // CP
  | 'friend'      // 好友
  | 'rival'       // 竞争
  | 'enemy'       // 结仇
  | 'betrayed'    // 反目
  | 'custom';     // 自定义

// 圈层分组
export interface StreamerGroup {
  id: string;
  name: string;
  type: 'family' | 'team' | 'circle' | 'guild' | 'custom';
  color: string;           // 圈层背景色
  memberIds: string[];
  collapsed?: boolean;     // 是否折叠
}

// 完整图数据
export interface GraphData {
  version: 1;
  nodes: StreamerNode[];
  edges: RelationshipEdge[];
  groups: StreamerGroup[];
  metadata: {
    name: string;
    createdAt: string;
    updatedAt: string;
    author: string;
  };
}

// 筛选状态
export interface FilterState {
  regions: string[];
  categories: string[];
  talents: string[];
  sections: string[];
  identityLevels: number[];
  customTags: string[];
}
