// Архив: дизайн-инструменты, которые я сделала для себя. Файлы лежат в assets/tools/<id>/.
// files: [{ name: "reels-montage.zip", note: "скилл для Claude" }] — name совпадает с именем файла в папке.
window.TOOLS = [
  {
    id: "reels-montage",
    title: "агент монтажа рилсов",
    text: "Скилл для Claude Code: собирает рилс на Remotion из сырых видео. Расшифровывает речь через whisper и сверяет её со звуком, ставит поэтапные титры, вычищает паузы и междометия, добавляет моушн-врезки и фактуру, сводит звук и рендерит в одном из стилей — «коллаж», «архив», «крупный шрифт».",
    files: [{ name: "reels-montage.zip", note: "скилл: инструкции, скрипты, компоненты Remotion" }],
  },
  {
    id: "emoji-stickers",
    title: "генератор хромированных эмодзи и стикеров",
    text: "Python-движок, который превращает любую форму — глиф шрифта или нарисованную маску — в жидкий хром с отражениями в фирменных цветах. Собирает статичные PNG, анимированные WEBM и стикеры 512 px для Telegram, плюс контактные листы для проверки на тёмном и светлом фоне.",
    files: [
      { name: "chrome-emoji-generator.zip", note: "скрипты генератора и инструкция" },
      { name: "chrome-emoji-pack.zip", note: "готовый набор «Хром»: 31 эмодзи + 5 анимированных" },
    ],
  },
  {
    id: "covers",
    title: "агент обложек для соцсетей",
    text: "Помогает делать обложки для соцсетей в разы быстрее: держит стиль, шрифты и сетку.",
    files: [],
  },
  {
    id: "plugins",
    title: "плагины для браузера и figma",
    text: "Небольшие помощники, которые убирают рутину из ежедневной работы дизайнера.",
    files: [],
  },
];

(() => {
  const list = document.getElementById("tools");
  if (!list) return;
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  };

  for (const tool of window.TOOLS) {
    const item = el("li", "tools__item");
    const info = el("div", "tools__info");
    info.append(el("h2", "tools__title", tool.title), el("p", "tools__text", tool.text));
    if (tool.image) {
      const pic = el("img", "tools__image");
      pic.src = `./assets/tools/${tool.id}/${tool.image}`;
      pic.alt = `${tool.title}: пример`;
      pic.loading = "lazy";
      info.append(pic);
    }
    const files = el("ul", "tools__files");
    for (const f of tool.files) {
      const li = el("li");
      const a = el("a", "tools__file");
      a.href = `./assets/tools/${tool.id}/${f.name}`;
      a.download = f.name;
      a.append(el("span", "tools__file-name", f.name));
      if (f.note) a.append(el("span", "tools__file-note", f.note));
      a.append(el("span", "tools__file-icon", "↓"));
      li.append(a);
      files.append(li);
    }
    if (!tool.files.length) files.append(el("li", "tools__soon", "файлы скоро появятся"));
    item.append(info, files);
    list.append(item);
  }
})();
