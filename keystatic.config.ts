import { config, collection, singleton, fields } from '@keystatic/core';
import { createElement, Fragment } from 'react';

// Админка контента: /keystatic. Локально правки пишутся в файлы проекта; на боевом сервере (KEYSTATIC_STORAGE=github)
// каждое сохранение становится коммитом в репозиторий, после чего сайт собирается и выкладывается (docs/admin-guide.md).
// Поля повторяют схемы из src/content.config.ts: если поменять одно, поменяйте и другое,
// иначе `npm run build` остановится с понятной ошибкой.

const workImage = (label: string) => fields.image({ label, directory: 'src/assets/works', publicPath: '../../assets/works/' });
const workImageRequired = (label: string) => fields.image({ label, directory: 'src/assets/works', publicPath: '../../assets/works/', description: 'JPG или WebP до 3 МБ, длинная сторона 1600–2400 px.', validation: { isRequired: true } });
/** Адрес страницы сайта: с «/» в начале, без слэша на конце и без домена */
const pagePath = (label: string, isRequired = false) => fields.text({ label, description: 'Например /interiorpro. Без домена и без «/» на конце.', validation: { isRequired, pattern: { regex: /^\/[\w\-/]*[\w-]$|^\/$/, message: 'Адрес начинается с «/» и не заканчивается «/»' } } });


/** Ссылка: адрес страницы сайта, якорь (#quiz) или внешний адрес https */
const linkFields = (label: string) => fields.object({
  label: fields.text({ label: 'Текст ссылки', validation: { isRequired: true, length: { max: 60 } } }),
  href: fields.text({ label: 'Куда ведёт', description: 'Адрес страницы (/courses), якорь (#quiz) или полный адрес https://…', validation: { isRequired: true } }),
}, { label });
/** Даты показа: пусто = без ограничения; границы по Москве (с начала первого дня до конца последнего) */
const windowFields = {
  start: fields.date({ label: 'Показывать с', description: 'Пусто: сразу после публикации.' }),
  end: fields.date({ label: 'Показывать до (включительно)', description: 'Пусто: без срока. После этой даты исчезает сам.' }),
  active: fields.checkbox({ label: 'Включено', defaultValue: true }),
};

/** Знак в шапке админки плюс фирменная тема поверх Keystar UI (переменные --kui-*). Без внешних шрифтов и CDN. */
const ADMIN_THEME = `
:root, .kui-theme { --kui-typography-font-family-base: Inter, system-ui, sans-serif !important; }
/* Акцент Keystar (индиго) заменяем фирменным лаймом; текст на лайме тёмный */
:root, .kui-theme, .kui-scheme--light, .kui-scheme--dark {
  --kui-color-scale-indigo8: #C9CA35 !important;
  --kui-color-scale-indigo9: #E7E845 !important;
  --kui-color-scale-indigo10: #D6D73C !important;
  --kui-color-foreground-on-emphasis: #111313 !important;
  --kui-color-alias-focus-ring: #E7E845 !important;
}
.kui-scheme--light, .kui-scheme--light .kui-theme { --kui-color-scale-indigo11: #5F600C !important; }
.kui-scheme--dark, .kui-scheme--dark .kui-theme { --kui-color-scale-indigo11: #E7E845 !important; }
/* Тёмная схема: графит сайта вместо серо-синего */
.kui-scheme--dark, .kui-scheme--dark .kui-theme {
  --kui-color-scale-slate1: #111313 !important;
  --kui-color-scale-slate2: #161A1A !important;
  --kui-color-scale-slate3: #191D1D !important;
  --kui-color-scale-slate4: #202525 !important;
  --kui-color-scale-slate5: #272D2D !important;
}
.gr-admin-mark { display: inline-grid; width: 28px; height: 28px; place-items: center; border-radius: 4px; background: #111313; }
.gr-admin-mark img { width: 22px; height: 22px; }
`;
function BrandMark() {
  return createElement(Fragment, null,
    createElement('style', null, ADMIN_THEME),
    createElement('span', { className: 'gr-admin-mark' }, createElement('img', { src: '/favicon.svg', alt: '' })));
}

export default config({
  storage: process.env.KEYSTATIC_STORAGE === 'github'
    ? { kind: 'github', repo: { owner: 'gripinskya-bit', name: 'gripinsky-site' }, branchPrefix: 'admin/' }
    : { kind: 'local' },
  ui: {
    // Админка в стиле сайта: знак «3D», графит, лаймовый сигнал на главных кнопках и фокусе
    brand: { name: 'GRIPINSKY: админка', mark: BrandMark },
    navigation: {
      'Витрина': ['home', 'heroSlides', 'banners', 'promotions'],
      'Продажи': ['courses', 'tariffs', 'professions', 'gameProfessions'],
      'Доказательства': ['works', 'awards', 'stories', 'reviews', 'people'],
      'Тексты': ['faq', 'blog', 'legal', 'cookie'],
      'Сайт': ['navigation', 'settings', 'integrations', 'styleGuide'],
      'SEO страниц': ['pageSeo'],
    },
  },
  singletons: {
    home: singleton({
      label: 'Главная страница',
      path: 'src/content/home',
      format: { data: 'json' },
      schema: {
        hero: fields.object({
          kicker: fields.text({ label: 'Надзаголовок', validation: { isRequired: true, length: { max: 60 } } }),
          title: fields.text({ label: 'Заголовок, первая строка', validation: { isRequired: true, length: { max: 60 } } }),
          accent: fields.text({ label: 'Заголовок, вторая строка (серая)', validation: { length: { max: 60 } } }),
          lead: fields.text({ label: 'Подзаголовок', multiline: true, validation: { isRequired: true, length: { max: 260 } } }),
          primary: linkFields('Главная кнопка (лаймовая)'),
          secondary: linkFields('Вторая кнопка'),
        }, { label: 'Первый экран' }),
        statLabels: fields.object({
          graduates: fields.text({ label: 'Подпись к числу выпускников' }),
          years: fields.text({ label: 'Подпись к годам' }),
          videos: fields.text({ label: 'Подпись к видеоурокам' }),
          rating: fields.text({ label: 'Подпись к оценке' }),
          subscribers: fields.text({ label: 'Подпись к подписчикам' }),
        }, { label: 'Подписи к цифрам (сами цифры в «Настройках сайта»)' }),
        directions: fields.array(fields.object({
          title: fields.text({ label: 'Название', validation: { isRequired: true } }),
          text: fields.text({ label: 'Описание', multiline: true, validation: { isRequired: true, length: { max: 200 } } }),
          meta: fields.text({ label: 'Метка (например «3 профессии»)' }),
          cta: fields.text({ label: 'Текст действия', validation: { isRequired: true } }),
          href: fields.text({ label: 'Адрес страницы', validation: { isRequired: true } }),
          work: fields.relationship({ label: 'Картинка: работа ученика', collection: 'works' }),
        }), { label: 'Карточки направлений', itemLabel: (p) => p.fields.title.value, validation: { length: { min: 1, max: 4 } } }),
        faq: fields.array(fields.relationship({ label: 'Вопрос', collection: 'faq' }), { label: 'Вопросы на главной', itemLabel: (p) => p.value ?? '', validation: { length: { max: 8 } } }),
        trustReviews: fields.array(fields.relationship({ label: 'Отзыв', collection: 'reviews' }), { label: 'Отзывы в блоке доверия', itemLabel: (p) => p.value ?? '', validation: { length: { max: 6 } } }),
        ai: fields.object({
          eyebrow: fields.text({ label: 'Надзаголовок' }), title: fields.text({ label: 'Заголовок' }), accent: fields.text({ label: 'Вторая строка' }),
          quote: fields.text({ label: 'Цитата', multiline: true }), body: fields.text({ label: 'Текст', multiline: true }), cta: fields.text({ label: 'Кнопка' }),
        }, { label: 'Блок «ИИ в 3D»' }),
        community: fields.object({
          eyebrow: fields.text({ label: 'Надзаголовок' }), title: fields.text({ label: 'Заголовок' }), accent: fields.text({ label: 'Вторая строка' }),
          lead: fields.text({ label: 'Текст', multiline: true }), cta: fields.text({ label: 'Кнопка' }),
          topics: fields.array(fields.object({ title: fields.text({ label: 'Заголовок' }), text: fields.text({ label: 'Текст', multiline: true }) }), { label: 'Темы', itemLabel: (p) => p.fields.title.value, validation: { length: { min: 1, max: 4 } } }),
        }, { label: 'Блок «Сообщество»' }),
      },
    }),
    navigation: singleton({
      label: 'Меню и подвал',
      path: 'src/content/navigation',
      format: { data: 'json' },
      schema: {
        header: fields.array(linkFields('Пункт меню'), { label: 'Меню в шапке', description: 'До 6 пунктов помещаются в строку на компьютере; на телефоне меню раскрывается.', itemLabel: (p) => p.fields.label.value, validation: { length: { min: 1, max: 8 } } }),
        consultLabel: fields.text({ label: 'Кнопка консультации', validation: { isRequired: true, length: { max: 40 } } }),
        consultShort: fields.text({ label: 'Кнопка консультации на телефоне', validation: { isRequired: true, length: { max: 20 } } }),
        footerTagline: fields.text({ label: 'Подпись под логотипом в подвале', multiline: true }),
        footerColumns: fields.array(fields.object({
          title: fields.text({ label: 'Заголовок колонки', validation: { isRequired: true } }),
          links: fields.array(linkFields('Ссылка'), { label: 'Ссылки', itemLabel: (p) => p.fields.label.value }),
        }), { label: 'Колонки подвала', description: 'Колонка «Связь» собирается из «Настроек сайта».', itemLabel: (p) => p.fields.title.value, validation: { length: { max: 5 } } }),
      },
    }),
    integrations: singleton({
      label: 'Интеграции',
      path: 'src/content/integrations',
      format: { data: 'json' },
      schema: {
        getcourse: fields.object({
          account: fields.text({ label: 'Аккаунт GetCourse', description: 'Имя аккаунта из адреса ИМЯ.getcourse.ru. Ключ API хранится только на сервере (GETCOURSE_API_KEY), сюда его не писать.' }),
          group: fields.text({ label: 'Группа для покупателей с сайта', description: 'Необязательно: название группы в GetCourse.' }),
        }, { label: 'GetCourse', description: 'Коды предложений задаются в карточках курсов и форматов обучения.' }),
        bitrix24: fields.object({
          entity: fields.select({ label: 'Куда создавать заявки', options: [{ label: 'Лид', value: 'lead' }, { label: 'Сделка (CRM без лидов)', value: 'deal' }], defaultValue: 'lead' }),
          categoryId: fields.integer({ label: 'Воронка сделок (CATEGORY_ID)', description: 'Только для сделок. Пусто: общая воронка.' }),
          stageId: fields.text({ label: 'Стадия (STAGE_ID / STATUS_ID)', description: 'Пусто: первая стадия.' }),
          assignedById: fields.integer({ label: 'Ответственный (ID пользователя)' }),
          sourceId: fields.text({ label: 'Источник (SOURCE_ID)', defaultValue: 'WEB' }),
          titleTemplate: fields.text({ label: 'Название заявки', description: '{context} заменится на место заявки, например «Главная».', defaultValue: 'Заявка с сайта: {context}' }),
        }, { label: 'Bitrix24', description: 'Адрес входящего вебхука с ключом хранится только на сервере (B24_WEBHOOK_URL).' }),
        robokassa: fields.object({
          sno: fields.select({ label: 'Система налогообложения (чек 54-ФЗ)', options: [
            { label: 'УСН доходы', value: 'usn_income' }, { label: 'УСН доходы минус расходы', value: 'usn_income_outcome' }, { label: 'ОСН', value: 'osn' }, { label: 'Патент', value: 'patent' }, { label: 'ЕСХН', value: 'esn' },
          ], defaultValue: 'usn_income' }),
          tax: fields.select({ label: 'НДС', options: [{ label: 'Без НДС', value: 'none' }, { label: '0%', value: 'vat0' }, { label: '10%', value: 'vat10' }, { label: '20%', value: 'vat20' }], defaultValue: 'none' }),
          paymentMethod: fields.select({ label: 'Признак способа расчёта', options: [{ label: 'Полный расчёт', value: 'full_payment' }, { label: 'Предоплата 100%', value: 'full_prepayment' }], defaultValue: 'full_payment' }),
          paymentObject: fields.select({ label: 'Предмет расчёта', options: [{ label: 'Услуга', value: 'service' }, { label: 'Результат интеллектуальной деятельности', value: 'intellectual_activity' }], defaultValue: 'service' }),
        }, { label: 'Robokassa', description: 'Логин и пароли магазина хранятся только на сервере (ROBOKASSA_*).' }),
        checkout: fields.object({
          successPath: fields.text({ label: 'Страница после оплаты', defaultValue: '/oplata/uspeh' }),
          failPath: fields.text({ label: 'Страница при ошибке оплаты', defaultValue: '/oplata/oshibka' }),
        }, { label: 'Оформление' }),
      },
    }),
    styleGuide: singleton({
      label: 'Стиль сайта',
      path: 'src/content/style-guide',
      format: { data: 'json' },
      schema: {
        notes: fields.text({
          label: 'Заметки для дизайнера',
          multiline: true,
          description: 'Правила оформления: docs/design/guidelines.md, живая витрина компонентов: /styleguide. Цвета, шрифты и размеры здесь не меняются: так дизайн остаётся цельным. Для баннеров выбирается тон «Спокойный» или «Сигнал».',
        }),
      },
    }),
    cookie: singleton({
      label: 'Баннер cookie',
      path: 'src/content/cookie',
      format: { data: 'json' },
      schema: {
        text: fields.text({ label: 'Текст', multiline: true, validation: { isRequired: true, length: { max: 400 } } }),
        accept: fields.text({ label: 'Кнопка согласия', validation: { isRequired: true, length: { max: 24 } } }),
        necessary: fields.text({ label: 'Кнопка «только необходимые»', validation: { isRequired: true, length: { max: 24 } } }),
      },
    }),
    settings: singleton({
      label: 'Настройки сайта',
      path: 'src/content/settings',
      format: { data: 'json' },
      schema: {
        brand: fields.text({ label: 'Название' }),
        telegramBot: fields.url({ label: 'Telegram-бот для вопросов', validation: { isRequired: true } }),
        telegramChannel: fields.url({ label: 'Telegram-канал' }),
        youtube: fields.url({ label: 'YouTube' }),
        vk: fields.url({ label: 'ВКонтакте' }),
        vkVideo: fields.url({ label: 'VK Видео' }),
        yandexMaps: fields.url({ label: 'Отзывы на Яндекс Картах', validation: { isRequired: true } }),
        email: fields.text({ label: 'Почта' }),
        phone: fields.text({ label: 'Телефон' }),
        stats: fields.object({
          graduates: fields.text({ label: 'Выпускников' }),
          years: fields.text({ label: 'Лет системе' }),
          videos: fields.text({ label: 'Видеоуроков' }),
          rating: fields.text({ label: 'Оценка на Яндекс Картах' }),
          ratingCount: fields.text({ label: 'Число отзывов на Яндекс Картах' }),
          subscribers: fields.text({ label: 'Подписчиков YouTube' }),
        }, { label: 'Цифры на первом экране' }),
        installment: fields.object({
          months: fields.integer({ label: 'Срок рассрочки, мес.', defaultValue: 12, validation: { isRequired: true, min: 1 } }),
          note: fields.text({ label: 'Условия рассрочки', multiline: true }),
        }, { label: 'Рассрочка' }),
        accessMonths: fields.integer({ label: 'Доступ к урокам, мес.', defaultValue: 12, validation: { isRequired: true, min: 1 } }),
        bundle: fields.object({
          tiers: fields.array(fields.object({
            min: fields.integer({ label: 'От курсов в наборе', validation: { isRequired: true, min: 2 } }),
            pct: fields.integer({ label: 'Скидка, %', validation: { isRequired: true, min: 0, max: 50 } }),
          }), { label: 'Ступени скидки', itemLabel: (p) => `${p.fields.min.value} курса: ${p.fields.pct.value}%`, validation: { length: { min: 1 } } }),
        }, { label: 'Скидка за набор курсов' }),
        requisites: fields.text({ label: 'Реквизиты в подвале' }),
        certificateNote: fields.text({ label: 'Примечание о сертификате' }),
        publish: fields.object({
          requireConsent: fields.checkbox({ label: 'Показывать только людей с согласием на публикацию', defaultValue: false }),
        }, { label: 'Публикация' }),
      },
    }),
  },
  collections: {
    banners: collection({
      label: 'Баннеры и объявления',
      path: 'src/content/banners/*',
      format: { data: 'json' },
      slugField: 'title',
      columns: ['placement', 'start', 'end'],
      schema: {
        title: fields.slug({ name: { label: 'Внутреннее название', description: 'Видно только в админке.' } }),
        text: fields.text({ label: 'Текст', multiline: true, validation: { isRequired: true, length: { max: 160 } } }),
        linkLabel: fields.text({ label: 'Текст ссылки', description: 'Пусто: «Подробнее».', validation: { length: { max: 40 } } }),
        href: fields.text({ label: 'Куда ведёт', description: 'Адрес страницы (/ai), якорь или https://…' }),
        placement: fields.select({ label: 'Где показывать', options: [
          { label: 'Полоса над шапкой (все страницы)', value: 'announcement-bar' },
          { label: 'Главная, под первым экраном', value: 'home-below-hero' },
          { label: 'Каталог, сверху', value: 'catalog-top' },
          { label: 'Страница курса, под первым экраном', value: 'course-aside' },
        ], defaultValue: 'announcement-bar' }),
        pages: fields.array(fields.text({ label: 'Адрес' }), { label: 'Только на страницах', description: 'Пусто: на всех страницах места. Раздел целиком: /courses-page/*', itemLabel: (p) => p.value }),
        tone: fields.select({ label: 'Тон', description: '«Сигнал» добавляет лаймовую метку. Лаймовой заливки нет по правилам бренда.', options: [{ label: 'Спокойный', value: 'neutral' }, { label: 'Сигнал', value: 'signal' }], defaultValue: 'neutral' }),
        dismissible: fields.checkbox({ label: 'Можно закрыть', defaultValue: true }),
        priority: fields.integer({ label: 'Приоритет', description: 'Если на месте несколько баннеров, показывается с большим числом.', defaultValue: 0 }),
        ...windowFields,
      },
    }),
    promotions: collection({
      label: 'Акции',
      path: 'src/content/promotions/*',
      format: { data: 'json' },
      slugField: 'title',
      columns: ['start', 'end', 'active'],
      schema: {
        title: fields.slug({ name: { label: 'Название акции' } }),
        label: fields.text({ label: 'Метка на карточке', defaultValue: 'Акция', validation: { length: { max: 24 } } }),
        description: fields.text({ label: 'Описание', multiline: true }),
        terms: fields.text({ label: 'Условия', multiline: true }),
        items: fields.array(fields.object({
          course: fields.relationship({ label: 'Курс', collection: 'courses', validation: { isRequired: true } }),
          price: fields.integer({ label: 'Цена по акции, ₽', description: 'Должна быть ниже цены в каталоге. Зачёркивается настоящая цена курса.', validation: { isRequired: true, min: 1 } }),
        }), { label: 'Курсы и цены', itemLabel: (p) => `${p.fields.course.value ?? ''}: ${p.fields.price.value ?? ''} ₽`, validation: { length: { min: 1 } } }),
        start: fields.date({ label: 'Начало', validation: { isRequired: true } }),
        end: fields.date({ label: 'Окончание (включительно)', description: 'На сайте пишется «до …». Таймеры обратного отсчёта не используем.', validation: { isRequired: true } }),
        active: fields.checkbox({ label: 'Включено', defaultValue: true }),
      },
    }),
    heroSlides: collection({
      label: 'Слайды первого экрана',
      path: 'src/content/hero-slides/*',
      format: { data: 'json' },
      slugField: 'title',
      columns: ['work', 'order'],
      schema: {
        title: fields.slug({ name: { label: 'Название слайда', description: 'Для списка в админке, например «Главная 05».' } }),
        work: fields.relationship({ label: 'Работа ученика', collection: 'works', validation: { isRequired: true } }),
        pages: fields.multiselect({ label: 'На каких страницах', options: [{ label: 'Главная', value: 'home' }, { label: '3D-визуализация', value: 'viz' }, { label: '3D для игр', value: 'games' }], defaultValue: ['home'] }),
        label: fields.text({ label: 'Метка над подписью', defaultValue: 'Работа ученика', validation: { length: { max: 40 } } }),
        caption: fields.text({ label: 'Своя подпись', description: 'Пусто: «Автор, название. Награда» из карточки работы.', validation: { length: { max: 160 } } }),
        mobileFocus: fields.text({ label: 'Кадр на телефоне', description: 'Точка, которая остаётся в кадре на узком экране: «50% 60%» (по горизонтали и вертикали).' }),
        order: fields.integer({ label: 'Порядок', description: 'Меньше: раньше. Первый слайд виден при загрузке.', defaultValue: 100 }),
        ...windowFields,
      },
    }),
    pageSeo: collection({
      label: 'SEO страниц',
      path: 'src/content/page-seo/*',
      format: { data: 'json' },
      slugField: 'title',
      columns: ['route', 'title', 'noindex'],
      schema: {
        title: fields.slug({ name: { label: 'Title страницы' }, slug: { label: 'Ключ записи' } }),
        route: fields.text({ label: 'Путь страницы', description: 'Точный адрес, например /courses или /courses-page/blender. Без домена и слеша в конце.', validation: { isRequired: true } }),
        description: fields.text({ label: 'Description', description: 'Краткое описание страницы для поисковой выдачи, обычно 120–160 знаков.', multiline: true }),
        canonical: fields.text({ label: 'Canonical URL', description: 'Оставьте пустым, чтобы каноническим был адрес страницы. Заполняйте только при осознанном объединении дублей.' }),
        noindex: fields.checkbox({ label: 'Закрыть страницу от индексации', defaultValue: false }),
        ogImage: fields.text({ label: 'Изображение для соцсетей', description: 'Пусто — используется изображение шаблона. Иначе укажите путь вида /og/catalog.jpg или полный URL.' }),
      },
    }),
    courses: collection({
      label: 'Курсы и пакеты',
      path: 'src/content/courses/*',
      format: { data: 'json' },
      slugField: 'title',
      columns: ['title', 'price'],
      schema: {
        title: fields.slug({ name: { label: 'Название' }, slug: { label: 'Идентификатор (имя файла)' } }),
        short: fields.text({ label: 'Коротко', multiline: true }),
        legacyPath: fields.text({ label: 'Адрес страницы (как на Tilda, например /interiorpro)', validation: { isRequired: true } }),
        landing: fields.text({ label: 'Продаётся на другой странице (адрес)' }),
        status: fields.select({ label: 'Статус', options: [{ label: 'Продаётся', value: 'active' }, { label: 'Скрыт', value: 'hidden' }, { label: 'Архив', value: 'archive' }], defaultValue: 'active' }),
        type: fields.select({ label: 'Тип', options: [{ label: 'Курс', value: 'course' }, { label: 'Пакет', value: 'package' }, { label: 'Плагин', value: 'plugin' }, { label: 'Услуга', value: 'service' }, { label: 'Бесплатный', value: 'free' }], defaultValue: 'course' }),
        price: fields.integer({ label: 'Цена, ₽', validation: { isRequired: true, min: 0 } }),
        pricePending: fields.checkbox({ label: 'Стоимость уточняется', description: 'Показывать консультацию вместо цены и покупки. Снимите отметку после задания цены.', defaultValue: false }),
        selfPrice: fields.integer({ label: 'Цена без чата поддержки, ₽', description: 'Пусто: рассчитывается по правилу цены без поддержки.', validation: { min: 1 } }),
        oldPrice: fields.integer({ label: 'Прежняя цена, ₽ (только если реально была)' }),
        professions: fields.array(fields.text({ label: 'Профессия' }), { label: 'Профессии', itemLabel: (p) => p.value }),
        software: fields.array(fields.text({ label: 'Программа' }), { label: 'Программы', itemLabel: (p) => p.value }),
        level: fields.text({ label: 'Уровень' }),
        cover: fields.image({ label: 'Обложка', directory: 'src/assets/courses', publicPath: '../../assets/courses/' }),
        isNew: fields.checkbox({ label: 'Метка «Новый курс»', defaultValue: false }),
        publishedAt: fields.date({ label: 'Дата выхода курса', description: 'Фактическая дата для сортировки по новизне. Не дата переноса сайта.' }),
        popularityRank: fields.integer({ label: 'Позиция по популярности', description: '1 = наиболее популярный. По первому числу покупок в отчёте за август 2025 – август 2026. Равные продажи = равная позиция. Суммы и количество покупок сюда не записывать.', validation: { min: 1 } }),
        lessons: fields.integer({ label: 'Видеоуроков' }),
        meta: fields.text({ label: 'Состав одной строкой (блоки, видео, проекты)' }),
        studyDuration: fields.text({ label: 'Время прохождения', description: 'Ориентировочный срок, например «2–3 мес.». Темп обучения индивидуальный.' }),
        accessDuration: fields.text({ label: 'Срок доступа к курсу', description: 'Точный срок доступа, например «12 мес.». Если в исходной таблице указан диапазон, используйте наибольшее значение: «9–12 мес.» записывайте как «12 мес.».' }),
        supportDuration: fields.text({ label: 'Срок поддержки', description: 'Точный срок для формата с чатом поддержки, например «9 мес.». Из диапазона используйте наибольшее значение: «6–9 мес.» записывайте как «9 мес.». Самостоятельное обучение не включает поддержку.' }),
        description: fields.text({ label: 'Описание', multiline: true }),
        forWhom: fields.array(fields.text({ label: 'Для кого' }), { label: 'Для кого', itemLabel: (p) => p.value }),
        outcomes: fields.array(fields.text({ label: 'Результат' }), { label: 'Результаты', itemLabel: (p) => p.value }),
        blocks: fields.array(fields.text({ label: 'Блок' }), { label: 'Программа', itemLabel: (p) => p.value }),
        finalProject: fields.text({ label: 'Итоговый проект', multiline: true }),
        benefits: fields.array(fields.object({ title: fields.text({ label: 'Задача или польза', validation: { isRequired: true } }), text: fields.text({ label: 'Как курс помогает', multiline: true }) }), { label: 'Какие задачи решает курс', itemLabel: (p) => p.fields.title.value }),
        prerequisites: fields.array(fields.text({ label: 'Навык до старта' }), { label: 'Что нужно знать до начала', itemLabel: (p) => p.value }),
        modules: fields.array(fields.object({
          title: fields.text({ label: 'Название модуля', validation: { isRequired: true } }),
          description: fields.text({ label: 'Что делаем на этапе', multiline: true }),
          tools: fields.array(fields.text({ label: 'Инструмент' }), { label: 'Инструменты этапа', itemLabel: (p) => p.value }),
          topics: fields.array(fields.text({ label: 'Тема' }), { label: 'Темы', itemLabel: (p) => p.value }),
          practice: fields.text({ label: 'Практическое задание', multiline: true }),
          result: fields.text({ label: 'Результат модуля', multiline: true }),
        }), { label: 'Подробная программа', itemLabel: (p) => p.fields.title.value }),
        projects: fields.array(fields.object({
          title: fields.text({ label: 'Название проекта', validation: { isRequired: true } }),
          description: fields.text({ label: 'Что создаёт ученик', multiline: true }),
          deliverable: fields.text({ label: 'Что будет готово', multiline: true }),
          image: fields.image({ label: 'Изображение учебного проекта', directory: 'src/assets/courses', publicPath: '../../assets/courses/' }),
        }), { label: 'Учебные проекты', itemLabel: (p) => p.fields.title.value }),
        learning: fields.array(fields.object({ title: fields.text({ label: 'Заголовок', validation: { isRequired: true } }), text: fields.text({ label: 'Подтверждённые условия', multiline: true }) }), { label: 'Как проходит обучение', itemLabel: (p) => p.fields.title.value }),
        included: fields.array(fields.text({ label: 'Включено' }), { label: 'Что входит в стоимость', itemLabel: (p) => p.value }),
        requirements: fields.array(fields.text({ label: 'Требование' }), { label: 'Компьютер и программы', itemLabel: (p) => p.value }),
        courseFaq: fields.array(fields.object({ question: fields.text({ label: 'Вопрос', validation: { isRequired: true } }), answer: fields.text({ label: 'Ответ', multiline: true }) }), { label: 'Вопросы о курсе', itemLabel: (p) => p.fields.question.value }),
        trialDescription: fields.text({ label: 'Что попробовать в бесплатном уроке', multiline: true }),
        studentWorks: fields.array(fields.relationship({ label: 'Работа именно этого курса', collection: 'works' }), { label: 'Работы учеников курса', itemLabel: (p) => p.value ?? '' }),
        reviews: fields.array(fields.relationship({ label: 'Отзыв', collection: 'reviews' }), { label: 'Отзывы для страницы курса', description: 'Блок «Работы учеников и отзывы». Пусто: показываются отзывы об этом курсе или общие отзывы академии.', itemLabel: (p) => p.value ?? '' }),
        badges: fields.array(fields.object({
          text: fields.text({ label: 'Текст плашки', description: 'До 24 знаков: «Рекомендуем», «Высокий рейтинг», «Лучшие отзывы». «На скидке» только при реальной скидке.', validation: { isRequired: true, length: { min: 1, max: 24 } } }),
          tone: fields.select({ label: 'Цвет', options: [{ label: 'Лайм', value: 'lime' }, { label: 'Светлая', value: 'light' }, { label: 'Тёмная', value: 'dark' }], defaultValue: 'lime' }),
        }), { label: 'Плашки на карточке', itemLabel: (p) => p.fields.text.value || 'Плашка' }),
        testimonials: fields.array(fields.object({ author: fields.text({ label: 'Имя автора' }), text: fields.text({ label: 'Дословный отзыв', multiline: true }), context: fields.text({ label: 'Как связан с курсом' }), consent: fields.checkbox({ label: 'Получено разрешение на публикацию', defaultValue: false }) }), { label: 'Отзывы об этом курсе', itemLabel: (p) => p.fields.author.value }),

        includes: fields.array(fields.relationship({ label: 'Курс', collection: 'courses' }), { label: 'Входит в пакет', itemLabel: (p) => p.value ?? '' }),
        gifts: fields.array(fields.object({
          id: fields.text({ label: 'Идентификатор' }),
          name: fields.text({ label: 'Название' }),
          value: fields.integer({ label: 'Реальная цена, ₽ (если есть)' }),
        }), { label: 'Подарки не из каталога', itemLabel: (p) => p.fields.name.value }),
        related: fields.array(fields.relationship({ label: 'Курс', collection: 'courses' }), { label: 'Похожие курсы', itemLabel: (p) => p.value ?? '' }),
        teachers: fields.array(fields.relationship({ label: 'Педагог', collection: 'people' }), { label: 'Педагоги', itemLabel: (p) => p.value ?? '' }),
        trial: fields.text({ label: 'Бесплатные уроки (адрес)' }),
        seo: fields.object({ title: fields.text({ label: 'Title', description: '50–70 знаков, в конце | GRIPINSKY' }), description: fields.text({ label: 'Description', description: '140–160 знаков. {price} подставит текущую цену курса', multiline: true }) }, { label: 'SEO' }),
        getcourse: fields.object({ offerCode: fields.text({ label: 'Код предложения GetCourse' }) }, { label: 'GetCourse' }),
        tildaUid: fields.text({ label: 'ID товара в Tilda' }),
      },
    }),
    tariffs: collection({
      label: 'Форматы обучения',
      path: 'src/content/tariffs/*',
      format: { data: 'json' },
      slugField: 'name',
      schema: {
        name: fields.slug({ name: { label: 'Название' } }),
        sub: fields.text({ label: 'Подпись' }),
        short: fields.text({ label: 'Коротко' }),
        extra: fields.integer({ label: 'Доплата к базе, ₽', validation: { isRequired: true, min: 0 } }),
        features: fields.array(fields.object({ ok: fields.checkbox({ label: 'Входит' }), text: fields.text({ label: 'Текст' }) }), { label: 'Что входит', itemLabel: (p) => p.fields.text.value }),
        badge: fields.text({ label: 'Бейдж' }),
        order: fields.integer({ label: 'Порядок', validation: { isRequired: true } }),
        getcourse: fields.object({ offerCode: fields.text({ label: 'Код предложения GetCourse' }) }, { label: 'GetCourse' }),
      },
    }),
    professions: collection({
      label: 'Профессии',
      path: 'src/content/professions/*',
      format: { data: 'json' },
      slugField: 'title',
      schema: {
        title: fields.slug({ name: { label: 'Название' } }),
        short: fields.text({ label: 'Коротко' }),
        lead: fields.text({ label: 'Описание', multiline: true }),
        income: fields.text({ label: 'Доход (только подтверждённые данные)' }),
        image: workImageRequired('Картинка'),
        imageAlt: fields.text({ label: 'Описание картинки' }),
        imageFit: fields.select({ label: 'Картинка', options: [{ label: 'Заполнить', value: 'cover' }, { label: 'Вписать', value: 'contain' }], defaultValue: 'cover' }),
        imagePos: fields.text({ label: 'Фокус картинки', defaultValue: '50% 50%' }),
        path: fields.text({ label: 'Адрес страницы' }),
        courses: fields.array(fields.object({
          course: fields.relationship({ label: 'Курс', collection: 'courses' }),
          default: fields.checkbox({ label: 'В пакете по умолчанию' }),
          meta: fields.text({ label: 'Состав' }),
          description: fields.text({ label: 'Описание', multiline: true }),
          final: fields.text({ label: 'Итог' }),
          blocks: fields.array(fields.text({ label: 'Блок' }), { label: 'Программа', itemLabel: (p) => p.value }),
        }), { label: 'Курсы профессии', itemLabel: (p) => p.fields.course.value ?? '' }),
        gift: fields.object({ course: fields.relationship({ label: 'Курс в подарок', collection: 'courses' }), text: fields.text({ label: 'Зачем' }) }, { label: 'Подарок' }),
        fullPack: fields.array(fields.relationship({ label: 'Курс', collection: 'courses' }), { label: 'Полный набор профессии с базой', itemLabel: (p) => p.value ?? '' }),
        addons: fields.array(fields.object({ course: fields.relationship({ label: 'Курс', collection: 'courses' }), text: fields.text({ label: 'Зачем' }) }), { label: 'Усилить по желанию', itemLabel: (p) => p.fields.course.value ?? '' }),
        portfolio: fields.text({ label: 'Портфолио по итогам' }),
        seo: fields.object({ title: fields.text({ label: 'Title' }), description: fields.text({ label: 'Description', multiline: true }), h1: fields.text({ label: 'H1' }) }, { label: 'SEO' }),
        order: fields.integer({ label: 'Порядок', validation: { isRequired: true } }),
      },
    }),
    gameProfessions: collection({
      label: 'Профессии для игр',
      path: 'src/content/game-professions/*',
      format: { data: 'json' },
      slugField: 'title',
      schema: {
        title: fields.slug({ name: { label: 'Название' } }),
        short: fields.text({ label: 'Профессия по-русски' }),
        lead: fields.text({ label: 'Описание', multiline: true }),
        courses: fields.array(fields.relationship({ label: 'Курс', collection: 'courses' }), { label: 'Основные курсы', itemLabel: p => p.value ?? '' }),
        trials: fields.array(fields.relationship({ label: 'Бесплатный курс', collection: 'courses' }), { label: 'Бесплатные уроки', itemLabel: p => p.value ?? '' }),
        addons: fields.array(fields.object({
          course: fields.relationship({ label: 'Курс', collection: 'courses' }),
          text: fields.text({ label: 'Зачем', multiline: true }),
          alternative: fields.relationship({ label: 'Альтернативная подборка', collection: 'courses' }),
        }), { label: 'Дополнительные курсы', itemLabel: p => p.fields.course.value ?? '' }),
        order: fields.integer({ label: 'Порядок', validation: { isRequired: true } }),
      },
    }),
    works: collection({
      label: 'Работы',
      path: 'src/content/works/*',
      format: { data: 'json' },
      slugField: 'title',
      columns: ['title', 'author'],
      schema: {
        title: fields.slug({ name: { label: 'Название работы' } }),
        author: fields.relationship({ label: 'Автор', collection: 'people', validation: { isRequired: true } }),
        image: workImageRequired('Рендер'),
        beforeImage: workImage('Та же сцена в сером материале (для слайдера до/после)'),
        reviewText: fields.text({ label: 'Отзыв об этой работе', multiline: true }),
        reviewQuote: fields.text({ label: 'Точная цитата об академии из отзыва', multiline: true }),
        processImages: fields.array(workImage('Сермат из проекта'), { label: 'Дополнительные серматы', itemLabel: () => 'Сермат' }),
        videos: fields.array(fields.text({ label: 'Локальный адрес видео' }), { label: 'Видео работы', itemLabel: () => 'Видео' }),
        alt: fields.text({ label: 'Что на картинке (для незрячих и поиска)', validation: { length: { min: 3 } } }),
        categories: fields.multiselect({ label: 'Категории', options: [
          { label: 'Интерьеры', value: 'int' }, { label: 'Экстерьеры', value: 'ext' }, { label: 'Модели', value: 'model' },
          { label: 'С наставником', value: 'mentor' }, { label: 'Работы педагогов', value: 'teach' },
        ] }),
        awards: fields.multiselect({ label: 'Награды', options: [
          { label: '«Рендер дня»', value: 'render-dnya' }, { label: '«Царь горы»', value: 'tsar-gory' }, { label: '3DDD Award', value: '3ddd-award' },
        ] }),
        sourceUrl: fields.url({ label: 'Ссылка на 3DDD' }),
        focus: fields.text({ label: 'Фокус картинки (например 50% 40%)' }),
        isProcessImage: fields.checkbox({ label: 'Это промежуточный кадр процесса (сермат, этап)', description: 'Такие кадры не показываются как самостоятельные работы.', defaultValue: false }),
        inGallery: fields.checkbox({ label: 'Показывать в галерее', defaultValue: true }),
        order: fields.integer({ label: 'Порядок', defaultValue: 100 }),
      },
    }),
    awards: collection({
      label: 'Награды («Царь горы»)',
      path: 'src/content/awards/*',
      format: { data: 'json' },
      slugField: 'title',
      schema: {
        title: fields.slug({ name: { label: 'Награда' } }),
        person: fields.relationship({ label: 'Кто', collection: 'people', validation: { isRequired: true } }),
        text: fields.text({ label: 'За что', multiline: true }),
        kind: fields.select({ label: 'Тип', options: [{ label: 'Ученик', value: 'student' }, { label: 'Голосование педагогов', value: 'teacher-vote' }], defaultValue: 'student' }),
        place: fields.integer({ label: 'Место (для голосования)' }),
        work: fields.relationship({ label: 'Работа', collection: 'works' }),
        date: fields.text({ label: 'Когда (месяц и год)' }),
        order: fields.integer({ label: 'Порядок', defaultValue: 100 }),
      },
    }),
    stories: collection({
      label: 'Истории выпускников',
      path: 'src/content/stories/*',
      format: { contentField: 'body' },
      slugField: 'headline',
      schema: {
        headline: fields.slug({ name: { label: 'Заголовок' } }),
        person: fields.relationship({ label: 'Кто', collection: 'people', validation: { isRequired: true } }),
        tag: fields.text({ label: 'Метка (например «Начинала с нуля»)' }),
        subtitle: fields.text({ label: 'Подзаголовок' }),
        before: fields.text({ label: 'Было' }),
        after: fields.text({ label: 'Стало' }),
        quote: fields.text({ label: 'Цитата' }),
        highlights: fields.array(fields.text({ label: 'Деталь' }), { label: 'Детали работы', itemLabel: (p) => p.value }),
        courses: fields.text({ label: 'Какие курсы прошёл' }),
        works: fields.array(fields.relationship({ label: 'Работа', collection: 'works' }), { label: 'Работы', itemLabel: (p) => p.value ?? '' }),
        extraWorks: fields.array(fields.relationship({ label: 'Работа', collection: 'works' }), { label: 'Дополнительные работы', itemLabel: (p) => p.value ?? '' }),
        extraNote: fields.text({ label: 'Подпись к дополнительным работам', multiline: true }),
        links: fields.array(fields.object({ label: fields.text({ label: 'Текст' }), url: fields.url({ label: 'Ссылка' }) }), { label: 'Ссылки', itemLabel: (p) => p.fields.label.value }),
        size: fields.select({ label: 'Размер карточки', options: [{ label: 'Большая', value: 'large' }, { label: 'Средняя', value: 'medium' }, { label: 'Маленькая', value: 'small' }], defaultValue: 'small' }),
        order: fields.integer({ label: 'Порядок', defaultValue: 100 }),
        body: fields.markdoc({ label: 'История целиком' }),
      },
    }),
    reviews: collection({
      label: 'Отзывы',
      path: 'src/content/reviews/*',
      format: { data: 'json' },
      slugField: 'author',
      schema: {
        author: fields.slug({ name: { label: 'Автор (без контактов)' } }),
        person: fields.relationship({ label: 'Автор в списке людей', collection: 'people' }),
        works: fields.array(fields.relationship({ label: 'Работа', collection: 'works' }), { label: 'Работы к отзыву', itemLabel: (props) => props.value || 'Работа' }),
        role: fields.text({ label: 'Кто он' }),
        source: fields.select({ label: 'Откуда', options: [{ label: 'Telegram', value: 'telegram' }, { label: 'Яндекс Карты', value: 'yandex' }, { label: 'ВКонтакте', value: 'vk' }, { label: 'Сайт', value: 'site' }, { label: 'Азбука курсов', value: 'azbuka' }], defaultValue: 'telegram' }),
        sourceUrl: fields.url({ label: 'Ссылка на исходный отзыв' }),
        text: fields.text({ label: 'Текст отзыва', multiline: true }),
        quote: fields.text({ label: 'Точная цитата об академии', multiline: true }),
        topic: fields.select({ label: 'Тема', options: [{ label: 'Деньги', value: 'money' }, { label: 'Навык', value: 'skill' }, { label: 'Карьера', value: 'career' }, { label: 'Общее', value: 'general' }], defaultValue: 'general' }),
        order: fields.integer({ label: 'Порядок', defaultValue: 100 }),
      },
    }),
    people: collection({
      label: 'Люди',
      path: 'src/content/people/*',
      format: { data: 'json' },
      slugField: 'name',
      columns: ['name', 'consent'],
      schema: {
        name: fields.slug({ name: { label: 'Имя и фамилия' } }),
        roles: fields.multiselect({ label: 'Роли', options: [{ label: 'Ученик', value: 'student' }, { label: 'Выпускник', value: 'graduate' }, { label: 'Педагог', value: 'teacher' }, { label: 'Автор', value: 'author' }] }),
        photo: fields.image({ label: 'Фото', directory: 'src/assets/people', publicPath: '../../assets/people/' }),
        bio: fields.text({ label: 'О человеке', multiline: true }),
        teaches: fields.array(fields.text({ label: 'Направление' }), { label: 'Специализации педагога', description: 'Короткие подписи на странице педагогов. Какие курсы ведёт педагог, задаётся в карточке курса: «Продажи → Курсы → Педагоги».', itemLabel: (p) => p.value }),
        teacherPage: fields.object({
          show: fields.checkbox({ label: 'Показывать на странице «Педагоги»', defaultValue: true }),
          order: fields.integer({ label: 'Порядок (меньше выше)', defaultValue: 100 }),
        }, { label: 'Страница педагогов' }),
        consent: fields.select({ label: 'Согласие на публикацию', options: [{ label: 'Есть', value: 'yes' }, { label: 'Ждём', value: 'pending' }, { label: 'Отказ', value: 'no' }], defaultValue: 'pending' }),
      },
    }),
    faq: collection({
      label: 'Вопросы и ответы',
      path: 'src/content/faq/*',
      format: { contentField: 'answer' },
      slugField: 'question',
      schema: {
        question: fields.slug({ name: { label: 'Вопрос' } }),
        group: fields.select({ label: 'Группа', options: [{ label: 'Деньги', value: 'money' }, { label: 'Перед стартом', value: 'start' }, { label: 'Учёба', value: 'study' }, { label: 'После курса', value: 'after' }], defaultValue: 'start' }),
        pages: fields.multiselect({ label: 'Где показывать', options: [{ label: 'Направление «3D-визуализация»', value: 'viz' }, { label: 'Главная', value: 'home' }], defaultValue: ['viz'] }),
        order: fields.integer({ label: 'Порядок', defaultValue: 100 }),
        answer: fields.markdoc({ label: 'Ответ' }),
      },
    }),
    blog: collection({
      label: 'Блог',
      path: 'src/content/blog/*',
      format: { contentField: 'body' },
      slugField: 'title',
      schema: {
        title: fields.slug({ name: { label: 'Заголовок' } }),
        description: fields.text({ label: 'Коротко (для поиска и соцсетей)', multiline: true }),
        date: fields.date({ label: 'Дата', defaultValue: { kind: 'today' }, validation: { isRequired: true } }),
        cover: fields.image({ label: 'Обложка', directory: 'src/assets/blog', publicPath: '../../assets/blog/' }),
        coverAlt: fields.text({ label: 'Описание обложки' }),
        related: fields.array(fields.relationship({ label: 'Курс', collection: 'courses' }), { label: 'Курсы по теме', itemLabel: (p) => p.value ?? '' }),
        legacyPath: fields.text({ label: 'Адрес на старом сайте', description: 'Только для статей, перенесённых с Tilda (/tpost/…). У новых статей пусто.' }),
        draft: fields.checkbox({ label: 'Черновик', defaultValue: false }),
        kind: fields.select({ label: 'Тип записи', description: 'Новости и анонсы попадают ещё и в ленту /news.', options: [{ label: 'Статья', value: 'article' }, { label: 'Новость', value: 'news' }, { label: 'Анонс', value: 'announcement' }], defaultValue: 'article' }),
        tags: fields.array(fields.text({ label: 'Тег' }), { label: 'Теги', itemLabel: (p) => p.value }),
        body: fields.markdoc({ label: 'Текст' }),
      },
    }),
    legal: collection({
      label: 'Документы',
      path: 'src/content/legal/*',
      format: { contentField: 'body' },
      slugField: 'title',
      schema: {
        title: fields.slug({ name: { label: 'Название' } }),
        path: pagePath('Адрес страницы', true),
        updated: fields.text({ label: 'Дата редакции' }),
        body: fields.markdoc({ label: 'Текст' }),
      },
    }),
  },
});
