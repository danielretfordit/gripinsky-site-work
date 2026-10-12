import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { CHECKOUT_MODE } from 'astro:env/server';
import { getCatalog } from '../../lib/catalog';
import { quoteSet, quote, quoteBaseOnly, quoteCourse, summarize, type Quote, type Selection, type TariffId, type ProfId } from '../../lib/pricing';
import { sendLead } from '../../lib/b24';
import { createGcOrder } from '../../lib/getcourse';
import { robokassaReady, robokassaUrl } from '../../lib/robokassa';
import { orderStore } from '../../lib/orders';
import { checkoutSchema, firstIssue } from '../../lib/api-schemas';
import { PayloadTooLarge, filledTooFast, json, readBody } from '../../lib/security';
import { errorText, log } from '../../lib/log';
import { ORDERS_DB } from 'astro:env/server';
import { API_MAX_BODY } from '../../middleware';

export const prerender = false;

const TARIFFS: TariffId[] = ['lite', 'opt', 'mentor'];
const PROFS: ProfId[] = ['int', 'ext', 'stock'];

export const POST: APIRoute = async ({ request, url }) => {
  let raw: unknown;
  try { raw = JSON.parse(await readBody(request, API_MAX_BODY)); }
  catch (e) { return e instanceof PayloadTooLarge ? json({ ok: false, error: 'too_large' }, 413) : json({ ok: false, error: 'bad_request' }, 400); }

  // Сумму из браузера не принимаем: только идентификаторы, итог считаем здесь
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return json({ ok: false, error: firstIssue(parsed.error) }, 422);
  const body = parsed.data;
  if (body.website || filledTooFast(body.started)) {
    log.warn('checkout:bot', { honeypot: Boolean(body.website) });
    return json({ ok: false, error: 'validation' }, 422);
  }
  const customer = body.customer;

  const cat = await getCatalog();
  const s = body.selection;
  const tariff: TariffId = s.tariff && TARIFFS.includes(s.tariff) ? s.tariff : 'opt';
  let q: Quote;
  if (body.kind === 'set') {
    if (!s.ids?.length || s.ids.some((id) => id !== cat.base.id && !Object.hasOwn(cat.courses, id)) || !s.support) return json({ ok: false, error: 'selection' }, 422);
    const setTariff = s.support === 'self' ? 'lite' : s.tariff === 'mentor' ? 'mentor' : 'opt';
    q = quoteSet(cat, { ids: s.ids, support: s.support, tariff: setTariff });
    if (!Number.isFinite(q.total) || q.total <= 0) return json({ ok: false, error: 'empty_cart' }, 422);
  } else if (body.kind === 'course') {
    const entry = (await getCollection('courses')).find((x) => x.id === String(s.id ?? ''));
    if (!entry || entry.data.status !== 'active' || entry.data.pricePending || entry.data.price <= 0 || entry.data.type === 'package') return json({ ok: false, error: 'course' }, 422);
    q = quoteCourse({ id: entry.id, name: entry.data.title, price: entry.data.price }, cat.installmentMonths);
  } else if (body.kind === 'base' || body.kind === 'package') q = body.kind === 'base'
    ? quoteBaseOnly(cat, tariff)
    : quote(cat, {
        base: s.base !== false,
        prof: s.prof && PROFS.includes(s.prof) ? s.prof : 'int',
        courses: s.courses ?? {},
        addons: s.addons ?? [],
        tariff,
      } satisfies Selection);
  else return json({ ok: false, error: 'kind' }, 422);
  const summary = summarize(q);
  const utmLast = (body.utm?.last ?? {}) as Record<string, string>;
  const page = body.page ?? url.pathname;

  if (CHECKOUT_MODE === 'getcourse') {
    const courses = new Map((await getCollection('courses')).map((x) => [x.id, x.data]));
    const tariffs = new Map((await getCollection('tariffs')).map((x) => [x.id, x.data]));
    const offers = q.lines
      .filter((l) => l.kind !== 'included')
      .map((l) => {
        const code = l.id.startsWith('tariff:') ? tariffs.get(l.id.slice(7))?.getcourse.offerCode : courses.get(l.id)?.getcourse.offerCode ?? '';
        return { code: code ?? '', cost: l.price, title: l.name };
      })
      .filter((o) => !(o.cost === 0 && !o.code));
    const r = await createGcOrder(customer, offers, `Сайт: ${summary}`, utmLast);
    if (r.ok && r.link) return json({ ok: true, mode: 'getcourse', total: q.total, redirect: r.link });
    log.error('checkout:getcourse_failed', { error: r.error });
    // Не теряем покупателя: заявка уходит в CRM
  }

  if (CHECKOUT_MODE === 'robokassa') {
    if (robokassaReady()) {
      try {
        // Номер счёта выдаёт хранилище заказов: по нему на Result URL сверяется сумма, повтор не создаёт второй оплаты
        const invId = orderStore(ORDERS_DB).create(q.total, summary, customer.email);
        const items = q.lines.filter((l) => l.price > 0).map((l) => ({ name: l.name, sum: l.price }));
        const receipt = (await getEntry('integrations', 'main'))!.data.robokassa;
        const redirect = robokassaUrl({ invId, total: q.total, description: 'Обучение в Академии 3D GRIPINSKY', email: customer.email, items, shp: { Shp_items: q.items.join(',').slice(0, 200) }, receipt });
        await sendLead({ name: customer.name, contact: customer.phone, context: `Переход к оплате Robokassa, счёт ${invId}`, page, packageSummary: `${summary}; ${customer.email}`, utm: body.utm as never });
        return json({ ok: true, mode: 'robokassa', total: q.total, redirect });
      } catch (e) {
        log.error('checkout:robokassa_failed', { error: errorText(e) });
      }
    } else log.error('checkout:robokassa_not_configured', { hint: 'ROBOKASSA_LOGIN, PASS1, PASS2 и явный ROBOKASSA_IS_TEST' });
  }

  const lead = await sendLead({ name: customer.name, contact: customer.phone, context: 'Оформление пакета', page, packageSummary: `${summary}; ${customer.email}`, utm: body.utm as never });
  return json({ ok: lead.ok, mode: 'demo', total: q.total }, lead.ok ? 200 : 502);
};
