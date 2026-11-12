export const STORAGE_KEY = "foods";

export const DEFAULT_FOODS: readonly string[] = [
  "馄饨",
  "拉面",
  "烩面",
  "热干面",
  "刀削面",
  "油泼面",
  "炸酱面",
  "炒面",
  "重庆小面",
  "板面",
  "牛肉面",
  "番茄鸡蛋面",
  "葱油拌面",
  "担担面",
  "凉面",
  "焖面",
  "意大利面",
  "乌冬面",
  "米线",
  "酸辣粉",
  "土豆粉",
  "螺蛳粉",
  "炒米粉",
  "炒河粉",
  "过桥米线",
  "桂林米粉",
  "牛肉粉",
  "肠粉",
  "凉皮儿",
  "麻辣烫",
  "肉夹馍",
  "羊肉汤",
  "羊肉泡馍",
  "砂锅粥",
  "皮蛋瘦肉粥配包子",
  "炒饭",
  "大盘鸡拌面",
  "盖浇饭",
  "卤肉饭",
  "烤肉饭",
  "黄焖鸡米饭",
  "煲仔饭",
  "猪脚饭",
  "咖喱饭",
  "照烧鸡腿饭",
  "海南鸡饭",
  "石锅拌饭",
  "鳗鱼饭",
  "手抓饭",
  "蛋包饭",
  "番茄炒蛋盖饭",
  "宫保鸡丁盖饭",
  "鱼香肉丝盖饭",
  "土豆牛肉盖饭",
  "地三鲜盖饭",
  "麻婆豆腐盖饭",
  "小炒肉盖饭",
  "驴肉火烧",
  "川菜",
  "麻辣香锅",
  "火锅",
  "酸菜鱼",
  "烤串",
  "披萨",
  "烤鸭",
  "汉堡",
  "炸鸡",
  "寿司",
  "三明治",
  "鸡肉沙拉",
  "蔬菜沙拉配面包",
  "小笼包",
  "蟹黄包",
  "煎饼果子",
  "生煎",
  "炒年糕",
  "饺子",
  "锅贴",
  "馅饼",
  "饭团",
];

export function normalizeFoods(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((food) => typeof food === "string")) {
    throw new Error("菜单必须是菜名列表");
  }
  return [...new Set(value.map((food) => food.trim()).filter(Boolean))];
}

export function parseFoods(value: string | null): readonly string[] {
  return value === null ? DEFAULT_FOODS : normalizeFoods(JSON.parse(value));
}

export function random(foods: readonly string[]): string | undefined {
  return foods[Math.floor(Math.random() * foods.length)];
}
