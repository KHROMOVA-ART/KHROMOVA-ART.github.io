// Данные кейсов. Один объект — один кейс; страницы case.html и projects.html и окна баблов
// строятся из этого списка. Картинки лежат в assets/cases/<id>/.
// tags — направления (совпадают с data-section у баблов на главной).
window.CASE_TAGS = {
  env: "средовой дизайн",
  product: "продуктовый дизайн",
  motion: "арт-дирекшн анимации",
  brand: "брендинг",
  pres: "презентации",
  ai: "ии-креатив",
  vibe: "вайбкодинг",
  web: "веб-дизайн",
  type: "типографика",
};

window.CASES = [
  {
    id: "kinostudiya-moskva",
    title: "Брендинг ИИ-киностудии «Москва»",
    tags: ["brand"],
    discipline: "графический дизайн",
    stage: "анализ и проект",
    cover: "cover.jpg",
    intro: [
      "Основатели киностудии раньше занимались документальными фильмами. Новая ИИ-киностудия «Москва» работает с упором на премиальный сегмент.",
      "Отсюда возникла идея соединить историю, русский код и величие в образе печатки-герба — такие знаки власти мы встречаем в России на протяжении многих веков. Образ рыси и ворона родился из идеи стремления вперёд, точности и памяти истории, долголетия.",
    ],
    gallery: [
      { src: "cover.jpg", caption: "обложка брендбука" },
      { src: "emblem.jpg", caption: "круглая эмблема" },
      { src: "colors.jpg", caption: "три равные по качеству цветовые версии" },
      { src: "sign.jpg", caption: "знак без кольца" },
      { src: "palette.jpg", caption: "пять цветов" },
      { src: "fonts.jpg", caption: "шрифтовая система" },
      { src: "telegram.jpg", caption: "стикерпак для Telegram" },
      { src: "emoji.jpg", caption: "кастомный набор эмодзи" },
      { src: "titles.jpg", caption: "титры и экран" },
    ],
  },
  {
    id: "multimedia-book",
    title: "Визуальное исследование мультимедиа-искусства",
    tags: ["type"],
    discipline: "типографика",
    stage: "анализ и проект",
    cover: "cover.jpg",
    intro: [
      "Идея книжного издания родилась после прочтения статьи на deziiign.com «История развития мультимедиа как направления в искусстве».",
      "Квадратный формат 26 × 26, модульная сетка 3 × 3 и три шрифта: Source Code Variable, AG Avalanche C и Involve. Ключевая метафора — «погружение»: от первых телевизоров до интерактивных инсталляций, где зритель становится участником.",
    ],
    link: { href: "https://www.calameo.com/read/007646252862410d450e2", label: "полное издание" },
    gallery: [
      { src: "cover.jpg", caption: "обложка" },
      { src: "contents.jpg", caption: "содержание" },
      { src: "installations.jpg", caption: "разворот об интерактивных инсталляциях" },
      { src: "spread-garden.jpg", caption: "разворот" },
      { src: "flatplan.jpg", caption: "флэт-план" },
      { src: "chapter.jpg", caption: "I глава: история развития мультимедиа" },
      { src: "origins.jpg", caption: "1.1 истоки развития жанра" },
      { src: "screens.jpg", caption: "разворот" },
      { src: "pages.jpg", caption: "цифровая эпоха и участие зрителя" },
    ],
  },
];

window.caseImage = (item, file) => `./assets/cases/${item.id}/${file}`;
