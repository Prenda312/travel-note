const STORAGE_KEY = "mom-travel-helper-v2";

const defaultCategories = [
  {
    id: "carry-on",
    title: "随身包准备",
    items: [
      "护照",
      "证件，一共有4个：I-20、入关文件、行程单、解释信。解释信不是很必要，如果真的不知道他说了什么，可以把信给他，里面有我的信息。",
      "AI眼镜，等你一回家，咱俩视频激活她",
      "保暖衣物，飞机上很冷，得带厚袜子，最好有个连帽衫，能护住脖子、背、肚子、脚踝和膝盖",
      "眼罩防灯光晃",
      "U形枕",
      "一次性拖鞋，飞机上走动方便",
      "手机卡",
      "USB接口线，防止手机没电。充电宝得拿正规的，3C认证的，可以问问哥哥有没有。",
      "大水杯 500-600ml，飞机上接水不方便",
      "化妆包：小唇膏、护肤小样、补水喷雾。飞机上很干，买了个保湿口罩。",
      "常用药：心脏的、腿的。保健品这边都有。",
      "转换插头",
      "纸巾和湿巾，不是很必要",
      "iPhone手机",
    ].map(createItem),
  },
  {
    id: "suitcase",
    title: "行李箱准备",
    items: [
      "衣服",
      "洗漱用品：牙刷、牙膏、毛巾",
      "礼物：确认要不要给 Bolin",
      "驾照：国内驾照带上备用",
      "备用鞋",
      "充电器和备用数据线",
      "雨伞或轻便雨衣",
      "收纳袋和脏衣袋",
    ].map(createItem),
  },
  {
    id: "before-leaving",
    title: "出发前确认",
    items: [
      "确认航班时间和登机口",
      "检查签证或入境材料，不要拿什么生鲜肉啥的",
      "提前开通国际漫游或确认手机卡可用",
      "下载离线地图和翻译软件",
      "告诉家人航班号和到达时间",
      "确认银行卡，拿个 Visa 卡吧",
    ].map(createItem),
  },
];

let state = loadState();

const listsEl = document.querySelector("#lists");
const categorySelect = document.querySelector("#categorySelect");
const addForm = document.querySelector("#addForm");
const itemInput = document.querySelector("#itemInput");
const progressPercent = document.querySelector("#progressPercent");
const doneCount = document.querySelector("#doneCount");
const totalCount = document.querySelector("#totalCount");
const progressFill = document.querySelector("#progressFill");
const resetDoneBtn = document.querySelector("#resetDoneBtn");
const restoreBtn = document.querySelector("#restoreBtn");
const categoryTemplate = document.querySelector("#categoryTemplate");
const itemTemplate = document.querySelector("#itemTemplate");

render();

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addItem(categorySelect.value, itemInput.value);
  itemInput.value = "";
  itemInput.focus();
});

resetDoneBtn.addEventListener("click", () => {
  state.forEach((category) => {
    category.items.forEach((item) => {
      item.done = false;
    });
  });
  persistAndRender();
});

restoreBtn.addEventListener("click", () => {
  if (!window.confirm("恢复默认清单会覆盖当前修改，确定继续吗？")) return;
  state = cloneDefaults();
  persistAndRender();
});

function render() {
  renderCategoryOptions();
  renderLists();
  renderProgress();
}

function renderCategoryOptions() {
  categorySelect.innerHTML = "";
  state.forEach((category) => {
    const option = document.createElement("option");
    option.value = category.id;
    option.textContent = category.title;
    categorySelect.append(option);
  });
}

function renderLists() {
  listsEl.innerHTML = "";

  state.forEach((category) => {
    const categoryNode = categoryTemplate.content.firstElementChild.cloneNode(true);
    const title = categoryNode.querySelector("h2");
    const meta = categoryNode.querySelector(".category-meta");
    const list = categoryNode.querySelector(".checklist");
    const addHere = categoryNode.querySelector(".add-here");
    const done = category.items.filter((item) => item.done).length;

    title.textContent = category.title;
    meta.textContent = `${done}/${category.items.length} 已完成`;
    addHere.addEventListener("click", () => {
      categorySelect.value = category.id;
      itemInput.focus();
    });

    category.items.forEach((item) => {
      const itemNode = itemTemplate.content.firstElementChild.cloneNode(true);
      const checkbox = itemNode.querySelector("input");
      const text = itemNode.querySelector(".item-text");
      const editButton = itemNode.querySelector(".edit-item");
      const deleteButton = itemNode.querySelector(".delete-item");

      checkbox.checked = item.done;
      checkbox.addEventListener("change", () => {
        item.done = checkbox.checked;
        persistAndRender();
      });

      text.textContent = item.text;
      text.dataset.originalText = item.text;
      text.addEventListener("blur", () => {
        saveItemText(category.id, item, text);
      });

      text.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          saveItemText(category.id, item, text);
          text.blur();
        }

        if (event.key === "Escape") {
          event.preventDefault();
          text.textContent = text.dataset.originalText;
          text.setAttribute("contenteditable", "false");
          text.blur();
        }
      });

      text.addEventListener("click", () => startEditing(text));
      editButton.addEventListener("click", () => startEditing(text));
      deleteButton.addEventListener("click", () => removeItem(category.id, item.id));
      list.append(itemNode);
    });

    listsEl.append(categoryNode);
  });
}

function startEditing(text) {
  text.setAttribute("contenteditable", "true");
  text.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(text);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function saveItemText(categoryId, item, text) {
  if (text.getAttribute("contenteditable") !== "true") return;

  const nextText = text.textContent.trim();
  text.setAttribute("contenteditable", "false");

  if (!nextText) {
    removeItem(categoryId, item.id);
    return;
  }

  item.text = nextText;
  text.textContent = nextText;
  text.dataset.originalText = nextText;
  persist();
}

function renderProgress() {
  const items = state.flatMap((category) => category.items);
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  progressPercent.textContent = percent;
  doneCount.textContent = done;
  totalCount.textContent = total;
  progressFill.style.width = `${percent}%`;
}

function addItem(categoryId, rawText) {
  const text = rawText.trim();
  if (!text) return;

  const category = state.find((entry) => entry.id === categoryId);
  if (!category) return;

  category.items.push(createItem(text));
  persistAndRender();
}

function removeItem(categoryId, itemId) {
  const category = state.find((entry) => entry.id === categoryId);
  if (!category) return;

  category.items = category.items.filter((item) => item.id !== itemId);
  persistAndRender();
}

function createItem(text) {
  return {
    id: crypto.randomUUID(),
    text,
    done: false,
  };
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return cloneDefaults();

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return cloneDefaults();
    return parsed;
  } catch {
    return cloneDefaults();
  }
}

function cloneDefaults() {
  return defaultCategories.map((category) => ({
    ...category,
    items: category.items.map((item) => ({ ...item, id: crypto.randomUUID() })),
  }));
}

function persistAndRender() {
  persist();
  render();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
