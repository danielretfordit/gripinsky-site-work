import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { SITE } from '../lib/seo';
import { isListed, courseHref } from '../lib/categories';
import { sp } from '../lib/format';

// Справка о школе для ИИ-поиска (llms.txt): только факты из данных сайта, цены берутся из курсов.
// Спорные цифры (стаж школы, срок доступа) сюда не пишем, пока заказчица их не подтвердит.
export const GET: APIRoute = async () => {
  const site = (await getEntry('settings', 'site'))!.data;
  const base = (await getEntry('courses', 'baza'))!.data;
  const profs = (await getCollection('professions')).sort((a, b) => a.data.order - b.data.order);
  const courses = (await getCollection('courses', (c) => isListed(c.data) && c.data.type !== 'service' && !c.data.landing))
    .sort((a, b) => a.data.title.localeCompare(b.data.title, 'ru'));
  const url = (path: string) => SITE + path;
  const line = (c: (typeof courses)[number]) => `- [${c.data.title}](${url(courseHref(c.id, c.data))}): ${c.data.pricePending ? 'стоимость уточняется' : c.data.price > 0 ? `${sp(c.data.price)} ₽` : 'бесплатно'}`;
  const paid = courses.filter((c) => c.data.pricePending || c.data.price > 0);
  const free = courses.filter((c) => !c.data.pricePending && c.data.price === 0);

  const body = [
    `# ${site.brand}`,
    '',
    '> Онлайн-школа 3D-графики Евгения Грипинского: 3D-визуализация интерьеров и экстерьеров в 3ds Max и Corona, моделирование, 3D для игр. Офис в Москве: Новый Арбат, 34.',
    '',
    `Обучение онлайн, по видеоурокам и заданиям, в своём темпе. ${site.certificateNote}`,
    '',
    '## Направление «3D-визуализация»',
    `- [Курсы 3D-визуализации с нуля](${url('/courses-page/visualization')}): база (3ds Max, Corona, ИИ в 3D) от ${sp(base.price)} ₽, затем курс профессии`,
    ...profs.map((p) => `- [${p.data.title}](${url(p.data.path)}): ${p.data.seo.description}`),
    '',
    '## Курсы и цены',
    ...paid.map(line),
    '',
    '## Бесплатные мини-курсы',
    ...free.map(line),
    '',
    '## Разделы сайта',
    `- [Каталог курсов](${url('/courses')})`,
    `- [Работы учеников](${url('/gallery')})`,
    `- [Отзывы и истории выпускников](${url('/otzyvy')})`,
    `- [Блог](${url('/blog')})`,
    `- [Корпоративное обучение](${url('/yur')})`,
    '',
    '## Контакты',
    `- Telegram: ${site.telegramBot}`,
    ...(site.email ? [`- Почта: ${site.email}`] : []),
    `- ВКонтакте: ${site.vk}`,
    `- YouTube: ${site.youtube}`,
    `- Яндекс Карты: ${site.yandexMaps.replace(/reviews\/?$/, '')}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
