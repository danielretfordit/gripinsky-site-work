// Расчёт цен. Одна функция quoteSet для всего сайта: и пакет на странице направления
// («база + профессия + допы + формат»), и свой набор курсов из каталога.
// Чистые функции без зависимостей: одни и те же для острова в браузере и для /api/checkout на сервере.
//
// Правила (решения заказчицы 05.10.2026, docs/decisions.md):
// - цена курса в каталоге включает чат поддержки; без поддержки курс на треть дешевле (selfPrice);
// - поддержка выбирается одна на весь набор; у базы ей соответствует формат («Самостоятельный» или «Оптимальный»);
// - скидка за количество: 2 курса −15%, 3 курса −20%, 4 и больше −22% (ступени в настройках);
// - база считается в количество курсов, но сама не дешевеет (у неё своя цена);
// - «база + курс профессии» это пакет: курс профессии без скидки, зато с подарком профессии;
// - курсы, которые входят в базу, рядом с ней не продаются второй раз.

export type TariffId = 'lite' | 'opt' | 'mentor';
export type ProfId = 'int' | 'ext' | 'stock';
/** Поддержка для всего набора: без неё или с чатом поддержки */
export type Support = 'self' | 'chat';

export interface CatalogCourse { id: string; name: string; price: number | null }
/** Курс, который продаётся отдельно: цена с поддержкой и без */
export interface SetCourse { id: string; name: string; price: number; selfPrice: number }
/** Ступень скидки: от min курсов в наборе скидка pct % */
export interface Tier { min: number; pct: number }

export interface Catalog {
  base: {
    id: string;
    name: string;
    price: number;
    /** Курсы, из которых состоит база (честный якорь «по отдельности») */
    parts: string[];
    included: { id: string; name: string; value: number | null }[];
    gifts: { id: string; name: string; value: number | null }[];
  };
  tariffs: { id: TariffId; name: string; extra: number }[];
  professions: Record<ProfId, {
    title: string;
    courses: (CatalogCourse & { price: number; default: boolean })[];
    gift: { id: string; name: string; value: number | null };
    addons: CatalogCourse[];
  }>;
  /** Все курсы, которые можно купить отдельно и положить в набор */
  courses: Record<string, SetCourse>;
  /** Условия курса для отображения в корзине; не участвуют в расчёте цены. */
  termsById?: Record<string, { accessDuration?: string | null; supportDuration?: string | null }>;
  tiers: Tier[];
  installmentMonths: number;
}

export interface Selection {
  base: boolean;
  prof: ProfId;
  /** Явный выбор курсов профессии (если у профессии их несколько) */
  courses?: Record<string, boolean>;
  addons: string[];
  tariff: TariffId;
}

export type LineKind = 'item' | 'gift' | 'included' | 'format';
/** price: сколько платим; value: цена без скидки или стоимость подарка; note: «−20%» */
export interface Line { id: string; kind: LineKind; name: string; price: number; value?: number | null; note?: string }

export interface Quote {
  lines: Line[];
  total: number;
  monthly: number;
  savings: number;
  /** Формат (доплата за проверку работ) применяется только вместе с базой */
  tariffApplied: boolean;
  /** Идентификаторы всего, что уходит в заказ (курсы, подарки, формат) */
  items: string[];
}

export interface SetQuote extends Quote {
  support: Support;
  /** Сколько платных позиций в наборе (база считается одной) */
  count: number;
  /** Скидка за количество, % (0, если скидке не на что действовать) */
  pct: number;
  /** Сколько курсов добавить до следующей ступени */
  next: { need: number; pct: number } | null;
  /** Курсы, которые уже входят в базу или идут подарком, поэтому не оплачиваются */
  dropped: string[];
  /** Курсы базы куплены по отдельности: во сколько обойдётся база вместо них и что она добавит */
  baseHint: { diff: number; parts: string[]; adds: string[] } | null;
}

export interface SetInput {
  ids: string[];
  support: Support;
  /** Формат базы на странице направления (там есть и «Наставничество»); по умолчанию из поддержки */
  tariff?: TariffId;
}

export const supportOf = (t: TariffId): Support => (t === 'lite' ? 'self' : 'chat');
export const tariffOf = (s: Support): TariffId => (s === 'self' ? 'lite' : 'opt');

/** Цена без поддержки по умолчанию: на треть дешевле, округление до …900 ₽ (27 900 → 18 900) */
export const selfPriceRule = (price: number): number => Math.max(900, Math.round((price * 2 / 3 + 100) / 1000) * 1000 - 100);

export function coursePrice(cat: Catalog, id: string, support: Support): number {
  const c = cat.courses[id];
  if (!c) throw new Error(`Нет курса ${id}`);
  return support === 'self' ? c.selfPrice : c.price;
}

export function tierPct(tiers: Tier[], count: number): number {
  return tiers.reduce((m, t) => (count >= t.min ? Math.max(m, t.pct) : m), 0);
}

export function profOf(cat: Catalog, id: string): ProfId | null {
  for (const [p, v] of Object.entries(cat.professions)) if (v.courses.some((c) => c.id === id)) return p as ProfId;
  return null;
}

export function basePrice(cat: Catalog, tariff: TariffId): number {
  return cat.base.price + (cat.tariffs.find((t) => t.id === tariff)?.extra ?? 0);
}

/** Курсы базы по отдельности с той же поддержкой (честный якорь) */
export function baseSeparately(cat: Catalog, support: Support): number {
  return cat.base.parts.reduce((s, id) => s + coursePrice(cat, id, support), 0);
}

export function quoteSet(cat: Catalog, input: SetInput): SetQuote {
  const { support } = input;
  const tariff = input.tariff ?? tariffOf(support);
  const uniq = [...new Set(input.ids)].filter((id) => id === cat.base.id || Object.hasOwn(cat.courses, id));
  const hasBase = uniq.includes(cat.base.id);
  const inBase = new Set(hasBase ? [...cat.base.parts, ...cat.base.included.map((i) => i.id), ...cat.base.gifts.map((i) => i.id)] : []);
  const dropped = uniq.filter((id) => inBase.has(id));
  const rest = uniq.filter((id) => id !== cat.base.id && !inBase.has(id));
  const fixed = hasBase ? rest.filter((id) => profOf(cat, id)) : [];
  // Подарок профессии, который человек положил в набор сам, не оплачивается
  const giftIds = new Set(fixed.map((id) => cat.professions[profOf(cat, id)!].gift.id));
  const asGift = rest.filter((id) => giftIds.has(id));
  dropped.push(...asGift);
  const discounted = rest.filter((id) => !fixed.includes(id) && !giftIds.has(id));
  const count = (hasBase ? 1 : 0) + fixed.length + discounted.length;
  const pct = discounted.length ? tierPct(cat.tiers, count) : 0;

  const lines: Line[] = [];
  const items: string[] = [];
  let total = 0;
  let savings = 0;

  if (hasBase) {
    lines.push({ id: cat.base.id, kind: 'item', name: cat.base.name, price: cat.base.price });
    items.push(cat.base.id);
    total += cat.base.price;
    savings += Math.max(0, baseSeparately(cat, support) - basePrice(cat, tariff));
    for (const inc of cat.base.included) {
      lines.push({ id: inc.id, kind: 'included', name: inc.name, price: 0, value: inc.value });
      savings += inc.value ?? 0;
    }
    for (const g of cat.base.gifts) {
      lines.push({ id: g.id, kind: 'gift', name: g.name, price: 0, value: g.value });
      items.push(g.id);
      savings += g.value ?? 0;
    }
  }

  for (const id of fixed) {
    const price = coursePrice(cat, id, support);
    lines.push({ id, kind: 'item', name: cat.courses[id].name, price });
    items.push(id);
    total += price;
  }
  // Подарок профессии: один на профессию и только вместе с базой
  const gifts = new Set<string>();
  for (const id of fixed) {
    const g = cat.professions[profOf(cat, id)!].gift;
    if (gifts.has(g.id)) continue;
    gifts.add(g.id);
    lines.push({ id: g.id, kind: 'gift', name: g.name, price: 0, value: g.value });
    items.push(g.id);
    savings += g.value ?? 0;
  }

  for (const id of discounted) {
    const list = coursePrice(cat, id, support);
    const price = Math.round(list * (1 - pct / 100));
    lines.push({ id, kind: 'item', name: cat.courses[id].name, price, ...(pct ? { value: list, note: `−${pct}%` } : {}) });
    items.push(id);
    total += price;
    savings += list - price;
  }

  if (hasBase || (tariff === 'mentor' && count > 0)) {
    const t = cat.tariffs.find((x) => x.id === tariff) ?? cat.tariffs[0];
    lines.push({ id: `tariff:${t.id}`, kind: 'format', name: `Формат: ${t.name}`, price: t.extra });
    items.push(`tariff:${t.id}`);
    total += t.extra;
  }

  const nt = cat.tiers.filter((t) => t.min > count).sort((a, b) => a.min - b.min)[0];
  const next = nt ? { need: nt.min - count, pct: nt.pct } : null;

  let baseHint: SetQuote['baseHint'] = null;
  const parts = hasBase ? [] : rest.filter((id) => cat.base.parts.includes(id));
  if (parts.length >= 2) {
    const alt = quoteSet(cat, { ids: [cat.base.id, ...rest.filter((id) => !cat.base.parts.includes(id))], support });
    const have = new Set(lines.map((l) => l.id));
    const adds = alt.lines.filter((l) => (l.kind === 'included' || l.kind === 'gift' || l.kind === 'format') && !have.has(l.id) && (l.kind !== 'format' || l.price > 0)).map((l) => l.kind === 'format' ? 'проверка работ' : l.name);
    baseHint = { diff: alt.total - total, parts, adds };
  }

  return { lines, total, monthly: Math.ceil(total / cat.installmentMonths), savings, tariffApplied: hasBase || (tariff === 'mentor' && count > 0), items, support, count, pct, next, dropped, baseHint };
}

export function activeCourseIds(cat: Catalog, sel: Pick<Selection, 'prof' | 'courses'>): string[] {
  const p = cat.professions[sel.prof];
  const on = p.courses.filter((c) => sel.courses?.[c.id] ?? c.default).map((c) => c.id);
  return on.length ? on : [p.courses[0].id];
}

export function availableAddons(cat: Catalog, sel: Pick<Selection, 'prof' | 'base'>): CatalogCourse[] {
  const included = new Set(sel.base ? cat.base.included.map((i) => i.id) : []);
  return cat.professions[sel.prof].addons.filter((a) => a.price != null && cat.courses[a.id] && !included.has(a.id));
}

/** Пакет на странице направления: тот же расчёт набора, поддержка следует из формата */
export function quote(cat: Catalog, sel: Selection): SetQuote {
  const addons = new Set(availableAddons(cat, sel).map((a) => a.id));
  const ids = [...(sel.base ? [cat.base.id] : []), ...activeCourseIds(cat, sel), ...sel.addons.filter((id) => addons.has(id))];
  return quoteSet(cat, { ids, support: supportOf(sel.tariff), tariff: sel.tariff });
}

// ---------- Тест «С чего начать» ----------

export type QuizAnswers = [number, number, ProfId | 'unsure', TariffId];

export interface QuizResult {
  level: 'Новичок' | 'Есть пробелы' | 'Уверенный уровень';
  why: string;
  base: boolean;
  prof: ProfId;
  unsure: boolean;
  tariff: TariffId;
  courses: Record<string, boolean>;
}

export function quizResult(cat: Catalog, a: QuizAnswers): QuizResult {
  const skill = a[0] + a[1];
  const unsure = a[2] === 'unsure';
  const prof: ProfId = unsure ? 'int' : (a[2] as ProfId);
  // Тест рекомендует все курсы профессии (для экстерьеров это и «Масштабные ЖК»)
  const courses = Object.fromEntries(cat.professions[prof].courses.map((c) => [c.id, true]));
  const level = skill <= 1 ? 'Новичок' : skill <= 3 ? 'Есть пробелы' : 'Уверенный уровень';
  const why = {
    'Новичок': 'Начните с базы: она даст моделирование, свет, материалы и рендер. Без неё курсы профессии будут слишком сложными.',
    'Есть пробелы': 'Вы уже что-то умеете, но база закроет пробелы в топологии, свете и материалах. Именно от них зависит качество рендера.',
    'Уверенный уровень': 'Базу можно пропустить и сразу перейти к профессии и курсам PRO.',
  }[level];
  return { level, why, base: skill <= 3, prof, unsure, tariff: a[3], courses };
}

/** Только база с выбранным форматом (кнопка «Купить только базу») */
export function quoteBaseOnly(cat: Catalog, tariff: TariffId): SetQuote {
  return quoteSet(cat, { ids: [cat.base.id], support: supportOf(tariff), tariff });
}

/** Короткое описание заказа для заявки и CRM */
export function summarize(q: Quote): string {
  return q.lines.filter((l) => l.kind !== 'included').map((l) => l.name + (l.note ? ` (${l.note})` : '')).join(' + ') + `; итого ${q.total} ₽`;
}

/** Курс или пакет из каталога, который не входит в наборы (услуги, пакеты занятий) */
export function quoteCourse(course: { id: string; name: string; price: number }, months: number): Quote {
  return {
    lines: [{ id: course.id, kind: 'item', name: course.name, price: course.price }],
    total: course.price,
    monthly: Math.ceil(course.price / months),
    savings: 0,
    tariffApplied: false,
    items: [course.id],
  };
}
