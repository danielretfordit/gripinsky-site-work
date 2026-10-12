import { getCollection, getEntry } from 'astro:content';
import { selfPriceRule, type Catalog, type ProfId, type TariffId } from './pricing';
import { activePromoPrices } from './promotions';

/** Собирает данные для расчёта пакета из коллекций контента (только на сервере / при сборке) */
export async function getCatalog(): Promise<Catalog> {
  const site = (await getEntry('settings', 'site'))!.data;
  const courses = new Map((await getCollection('courses')).map((c) => [c.id, c.data]));
  const course = (id: string) => {
    const c = courses.get(id);
    if (!c) throw new Error(`Нет курса ${id}`);
    return c;
  };
  const base = course('baza');
  const includedIds = base.includes.map((r) => r.id);

  // Курсы, которые продаются по отдельности и собираются в набор: цена с чатом поддержки и без поддержки
  // Акции из админки: акционная цена вместо каталожной (даты проверяются в момент расчёта)
  const promos = await activePromoPrices();
  const setCourses = Object.fromEntries(
    [...courses].filter(([, c]) => c.type === 'course' && c.status === 'active' && !c.pricePending && c.price > 0)
      .map(([id, c]) => {
        const promo = promos.get(id)?.price;
        const price = promo ?? c.price;
        const selfPrice = Math.min(price, c.selfPrice ?? selfPriceRule(c.price), promo ? selfPriceRule(promo) : Infinity);
        return [id, { id, name: c.title, price, selfPrice }];
      }),
  );

  const tariffs = (await getCollection('tariffs'))
    .sort((a, b) => a.data.order - b.data.order)
    .map((t) => ({ id: t.id as TariffId, name: t.data.name, extra: t.data.extra }));

  const professions = Object.fromEntries(
    (await getCollection('professions')).map((p) => {
      const gift = course(p.data.gift.course.id);
      return [p.id as ProfId, {
        title: p.data.title,
        courses: p.data.courses.map((c) => ({ id: c.course.id, name: course(c.course.id).title, price: course(c.course.id).price, default: c.default })),
        gift: { id: p.data.gift.course.id, name: gift.title, value: gift.price || null },
        addons: p.data.addons.map((a) => {
          const c = course(a.course.id);
          return { id: a.course.id, name: c.title, price: c.status === 'active' && !c.pricePending && c.price > 0 ? c.price : null };
        }),
      }];
    }),
  ) as Catalog['professions'];

  return {
    base: {
      id: 'baza',
      name: base.title,
      price: base.price,
      // «ИИ в 3D» входит в базу бонусом; остальные курсы базы дают честный якорь «по отдельности»
      parts: includedIds.filter((id) => id !== 'ai'),
      included: includedIds.filter((id) => id === 'ai').map((id) => ({ id, name: course(id).title, value: course(id).price || null })),
      gifts: base.gifts,
    },
    tariffs,
    professions,
    courses: setCourses,
    termsById: Object.fromEntries([...courses]
      .filter(([, c]) => c.accessDuration || c.supportDuration)
      .map(([id, c]) => [id, { accessDuration: c.accessDuration, supportDuration: c.supportDuration }])),
    tiers: [...site.bundle.tiers].sort((a, b) => a.min - b.min),
    installmentMonths: site.installment.months,
  };
}
