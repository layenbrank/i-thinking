# Sortable.js TypeScript 使用指南

[![NPM版本](https://img.shields.io/npm/v/sortablejs.svg)](https://www.npmjs.com/package/sortablejs)
[![许可证](https://img.shields.io/npm/l/sortablejs.svg)](https://github.com/SortableJS/Sortable/blob/master/LICENSE)
[![周下载量](https://img.shields.io/npm/dw/sortablejs.svg)](https://www.npmjs.com/package/sortablejs)

## 目录

- [简介](#简介)
- [安装](#安装)
- [TypeScript 类型定义](#typescript-类型定义)
- [基本用法](#基本用法)
- [配置选项](#配置选项)
- [事件回调](#事件回调)
- [事件对象属性](#事件对象属性)
- [组选项](#组选项)
- [实例方法](#实例方法)
- [静态方法和属性](#静态方法和属性)
- [实用工具方法](#实用工具方法)
- [插件系统](#插件系统)
- [高级示例](#高级示例)
- [常见问题解决](#常见问题解决)
- [资源链接](#资源链接)

## 简介

Sortable.js 是一个功能强大的 JavaScript 库，用于创建可拖拽、可排序的列表和网格。它支持触摸设备，不依赖于 jQuery 或其他库，并且具有出色的性能和灵活性。

### 主要特点

- 支持拖放排序
- 支持嵌套列表
- 支持触摸设备和现代浏览器（包括 IE9）
- 支持多项拖拽
- 无依赖性
- 支持虚拟列表
- 可定制的拖拽处理
- 智能自动滚动
- 丰富的事件系统
- 平滑的过渡动画
- 支持 CSS 变换
- 支持多种框架（React、Vue、Angular 等）

## 安装

### 安装 Sortable.js

```bash
# 使用 npm
npm install sortablejs --save

# 使用 yarn
yarn add sortablejs
```

### 安装 TypeScript 类型定义

如果你使用的是较新版本的 Sortable.js，类型定义已经包含在 `@types/sortablejs` 包中：

```bash
# 使用 npm
npm install @types/sortablejs --save-dev

# 使用 yarn
yarn add @types/sortablejs --dev
```

## TypeScript 类型定义

Sortable.js 的 TypeScript 类型定义提供了完整的类型支持，包括：

- `Sortable` 类及其方法
- 配置选项接口 `Sortable.Options`
- 事件对象接口 `Sortable.SortableEvent` 和 `Sortable.MoveEvent`
- 组选项接口 `Sortable.GroupOptions`
- 实用工具方法接口 `Sortable.Utils`
- 插件系统接口

### 主要类型定义

```typescript
// Sortable 类
declare class Sortable {
  public options: Sortable.Options;
  public el: HTMLElement;

  constructor(element: HTMLElement, options: Sortable.Options);

  static active: Sortable | null;
  static utils: Sortable.Utils;
  static mount(...sortablePlugins: SortablePlugin[]): void;
  static create(element: HTMLElement, options?: Sortable.Options): Sortable;
  static dragged: HTMLElement | null;
  static ghost: HTMLElement | null;
  static clone: HTMLElement | null;
  static get(element: HTMLElement): Sortable | undefined;
  static readonly version: string;

  option<K extends keyof Sortable.Options>(
    name: K,
    value: Sortable.Options[K],
  ): void;
  option<K extends keyof Sortable.Options>(name: K): Sortable.Options[K];
  closest(element: HTMLElement, selector?: string): HTMLElement | null;
  sort(order: readonly string[], useAnimation?: boolean): void;
  save(): void;
  destroy(): void;
  toArray(): string[];
}

// 选项接口
namespace Sortable {
  interface Options
    extends SortableOptions,
      AutoScrollOptions,
      MultiDragOptions,
      OnSpillOptions,
      SwapOptions {}

  // 事件接口
  interface SortableEvent extends Event {
    clone: HTMLElement;
    from: HTMLElement;
    item: HTMLElement;
    items: HTMLElement[];
    newIndex: number | undefined;
    oldIndex: number | undefined;
    target: HTMLElement;
    to: HTMLElement;
    oldDraggableIndex: number | undefined;
    newDraggableIndex: number | undefined;
    pullMode: "clone" | boolean | undefined;
    // ... 更多属性
  }

  // 移动事件接口
  interface MoveEvent extends Event {
    dragged: HTMLElement;
    draggedRect: DOMRect;
    from: HTMLElement;
    related: HTMLElement;
    relatedRect: DOMRect;
    to: HTMLElement;
    willInsertAfter?: boolean | undefined;
  }

  // 组选项接口
  interface GroupOptions {
    name: string;
    pull?:
      | PullResult
      | ((
          to: Sortable,
          from: Sortable,
          dragEl: HTMLElement,
          event: SortableEvent,
        ) => PullResult)
      | undefined;
    put?:
      | PutResult
      | ((
          to: Sortable,
          from: Sortable,
          dragEl: HTMLElement,
          event: SortableEvent,
        ) => PutResult)
      | undefined;
    // ... 更多属性
  }

  // 工具方法接口
  interface Utils {
    on(
      element: HTMLElement,
      event: string,
      fn: EventListenerOrEventListenerObject,
    ): void;
    off(
      element: HTMLElement,
      event: string,
      fn: EventListenerOrEventListenerObject,
    ): void;
    css(element: HTMLElement): CSSStyleDeclaration;
    css<K extends keyof CSSStyleDeclaration>(
      element: HTMLElement,
      prop: K,
    ): CSSStyleDeclaration[K];
    css<K extends keyof CSSStyleDeclaration>(
      element: HTMLElement,
      prop: K,
      value: CSSStyleDeclaration[K],
    ): void;
    // ... 更多方法
  }
}
```

## 基本用法

### 导入 Sortable

```typescript
// 导入 Sortable
import Sortable from "sortablejs";
```

### 基本初始化

```typescript
// HTML 结构
// <ul id="items">
//   <li>项目 1</li>
//   <li>项目 2</li>
//   <li>项目 3</li>
// </ul>

// TypeScript 代码
const el: HTMLElement = document.getElementById("items") as HTMLElement;
const sortable: Sortable = Sortable.create(el, {
  animation: 150,
  ghostClass: "sortable-ghost",
});
```

### 带类型的完整示例

```typescript
import Sortable from "sortablejs";

// 创建一个带有类型的初始化函数
function initSortable(elementId: string): Sortable {
  const element: HTMLElement | null = document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  const options: Sortable.Options = {
    animation: 150,
    ghostClass: "sortable-ghost",
    chosenClass: "sortable-chosen",
    dragClass: "sortable-drag",

    // 事件回调
    onStart(evt: Sortable.SortableEvent) {
      console.log(`开始拖动索引: ${evt.oldIndex}`);
    },

    onEnd(evt: Sortable.SortableEvent) {
      console.log(`从索引 ${evt.oldIndex} 移动到索引 ${evt.newIndex}`);
    },
  };

  return Sortable.create(element, options);
}

// 使用函数
document.addEventListener("DOMContentLoaded", () => {
  const sortable = initSortable("items");

  // 可以使用实例方法
  const currentOrder: string[] = sortable.toArray();
  console.log("当前顺序:", currentOrder);
});
```

## 配置选项

Sortable.js 提供了丰富的配置选项，以下是 TypeScript 中的主要选项：

### 基本选项

```typescript
interface SortableOptions {
  // 排序时移动项目的动画速度（毫秒）
  animation?: number;

  // 选中项目的类名
  chosenClass?: string;

  // 数据ID属性
  dataIdAttr?: string;

  // 定义排序应该开始的时间（毫秒）
  delay?: number;

  // 仅在使用触摸时延迟
  delayOnTouchOnly?: boolean;

  // 排序方向
  direction?:
    | ((
        evt: SortableEvent,
        target: HTMLElement,
        dragEl: HTMLElement,
      ) => Direction)
    | Direction;

  // 禁用排序
  disabled?: boolean;

  // 拖动项目的类名
  dragClass?: string;

  // 指定哪些项目可拖动
  draggable?: string;

  // 拖动占位符的类名
  ghostClass?: string;

  // 组配置
  group?: string | GroupOptions;

  // 拖动手柄选择器
  handle?: string;

  // 过滤器
  filter?:
    | string
    | ((
        this: Sortable,
        event: Event | TouchEvent,
        target: HTMLElement,
        sortable: Sortable,
      ) => boolean);

  // 列表内排序
  sort?: boolean;

  // 交换区域阈值
  swapThreshold?: number;

  // 反转交换
  invertSwap?: boolean;

  // 反转交换阈值
  invertedSwapThreshold?: number;

  // 更多选项...
}
```

### 事件回调选项

```typescript
interface SortableOptions {
  // 元素被选中
  onChoose?: (event: SortableEvent) => void;

  // 元素取消选中
  onUnchoose?: (event: SortableEvent) => void;

  // 开始拖动
  onStart?: (event: SortableEvent) => void;

  // 拖动结束
  onEnd?: (event: SortableEvent) => void;

  // 添加元素到列表
  onAdd?: (event: SortableEvent) => void;

  // 更新列表内的排序
  onUpdate?: (event: SortableEvent) => void;

  // 从列表中移除元素
  onRemove?: (event: SortableEvent) => void;

  // 列表发生任何变化
  onSort?: (event: SortableEvent) => void;

  // 过滤元素
  onFilter?: (event: SortableEvent) => void;

  // 移动元素
  onMove?: (evt: MoveEvent, originalEvent: Event) => boolean | -1 | 1 | void;

  // 元素位置变化
  onChange?: (evt: SortableEvent) => void;

  // 克隆元素
  onClone?: (event: SortableEvent) => void;

  // 设置数据传输
  setData?: (dataTransfer: DataTransfer, draggedElement: HTMLElement) => void;
}
```

## 事件回调

在 TypeScript 中使用事件回调时，可以利用类型定义获得更好的代码提示和类型检查：

```typescript
import Sortable from "sortablejs";

const sortable = Sortable.create(
  document.getElementById("list") as HTMLElement,
  {
    // 元素被选中
    onChoose(evt: Sortable.SortableEvent): void {
      console.log("元素被选中", evt.oldIndex);
      // 可以安全地访问 evt 的属性，有类型检查
      const item: HTMLElement = evt.item;
      const from: HTMLElement = evt.from;
    },

    // 开始拖动
    onStart(evt: Sortable.SortableEvent): void {
      console.log("开始拖动", evt.oldIndex);
      // 类型安全的访问
      if (evt.oldIndex !== undefined) {
        const index: number = evt.oldIndex;
        console.log(`从索引 ${index} 开始拖动`);
      }
    },

    // 拖动结束
    onEnd(evt: Sortable.SortableEvent): void {
      // 类型安全的条件检查
      if (evt.oldIndex !== undefined && evt.newIndex !== undefined) {
        console.log(`从索引 ${evt.oldIndex} 移动到索引 ${evt.newIndex}`);
      }
    },

    // 移动元素 - 返回值控制行为
    onMove(
      evt: Sortable.MoveEvent,
      originalEvent: Event,
    ): boolean | number | void {
      // 访问移动事件特有的属性
      const draggedEl: HTMLElement = evt.dragged;
      const relatedEl: HTMLElement = evt.related;

      // 根据条件返回不同的值
      if (relatedEl.classList.contains("disabled")) {
        return false; // 阻止移动
      }

      if (draggedEl.classList.contains("important")) {
        return 1; // 插入到目标之后
      }

      return true; // 允许移动
    },
  },
);
```

## 事件对象属性

在 TypeScript 中，事件对象的属性都有明确的类型定义：

### SortableEvent 接口

```typescript
interface SortableEvent extends Event {
  // 克隆的元素
  clone: HTMLElement;

  // 源列表
  from: HTMLElement;

  // 被拖动的元素
  item: HTMLElement;

  // 被拖动的元素集合（多拖拽时）
  items: HTMLElement[];

  // 新索引
  newIndex: number | undefined;

  // 旧索引
  oldIndex: number | undefined;

  // 目标元素
  target: HTMLElement;

  // 目标列表
  to: HTMLElement;

  // 旧的可拖动索引（仅计算可拖动元素）
  oldDraggableIndex: number | undefined;

  // 新的可拖动索引（仅计算可拖动元素）
  newDraggableIndex: number | undefined;

  // 拉取模式
  pullMode: "clone" | boolean | undefined;

  // 多拖拽时的旧索引数组
  oldIndicies: Array<{ multiDragElement: HTMLElement; index: number }>;

  // 多拖拽时的新索引数组
  newIndicies: Array<{ multiDragElement: HTMLElement; index: number }>;

  // 交换时被放置的项目
  swapItem: HTMLElement | null;
}
```

### MoveEvent 接口

```typescript
interface MoveEvent extends Event {
  // 被拖动的元素
  dragged: HTMLElement;

  // 被拖动元素的矩形
  draggedRect: DOMRect;

  // 源列表
  from: HTMLElement;

  // 相关元素（目标）
  related: HTMLElement;

  // 相关元素的矩形
  relatedRect: DOMRect;

  // 目标列表
  to: HTMLElement;

  // 是否将在目标之后插入
  willInsertAfter?: boolean;
}
```

## 组选项

组选项允许在不同列表之间拖放项目，在 TypeScript 中使用时可以获得完整的类型支持：

```typescript
import Sortable from "sortablejs";

// 定义组选项
const groupOptions: Sortable.GroupOptions = {
  name: "shared",

  // 从列表中移动的能力
  pull(
    to: Sortable,
    from: Sortable,
    dragEl: HTMLElement,
    event: Sortable.SortableEvent,
  ): Sortable.PullResult {
    // 根据条件返回不同的值
    if (dragEl.classList.contains("clone-item")) {
      return "clone"; // 复制项目而不是移动
    }

    if (dragEl.classList.contains("locked-item")) {
      return false; // 不允许拖出
    }

    return true; // 允许拖出
  },

  // 是否可以从其他列表添加元素
  put(
    to: Sortable,
    from: Sortable,
    dragEl: HTMLElement,
    event: Sortable.SortableEvent,
  ): Sortable.PutResult {
    // 根据条件返回不同的值
    if (to.el.children.length >= 5) {
      return false; // 列表已满，不允许添加
    }

    // 只允许从特定组添加
    if (from.options.group && typeof from.options.group === "object") {
      const fromGroupName = from.options.group.name;
      if (fromGroupName === "allowed-source") {
        return true;
      }
    }

    return ["shared", "allowed-source"]; // 允许从这些组添加
  },

  // 移动到另一个列表后，将克隆的元素恢复到初始位置
  revertClone: true,
};

// 创建可排序实例
const list1 = Sortable.create(document.getElementById("list1") as HTMLElement, {
  group: groupOptions,
  animation: 150,
});

const list2 = Sortable.create(document.getElementById("list2") as HTMLElement, {
  // 简单形式
  group: "shared",
  animation: 150,
});
```

## 实例方法

创建 Sortable 实例后，可以使用以下类型安全的方法：

```typescript
import Sortable from "sortablejs";

// 创建实例
const el = document.getElementById("items") as HTMLElement;
const sortable: Sortable = Sortable.create(el);

// 获取选项
const animation: number | undefined = sortable.option("animation");

// 设置选项
sortable.option("animation", 300);

// 根据数组排序元素
const order: string[] = ["item-3", "item-1", "item-2"];
sortable.sort(order);

// 保存当前排序
sortable.save();

// 获取排序的项目数据ID数组
const currentOrder: string[] = sortable.toArray();
console.log("当前顺序:", currentOrder);

// 查找最近的匹配元素
const dragHandle = document.querySelector(".drag-handle") as HTMLElement;
const listItem: HTMLElement | null = sortable.closest(dragHandle, ".list-item");

// 销毁实例
sortable.destroy();
```

## 静态方法和属性

Sortable 类提供了一些静态方法和属性，在 TypeScript 中可以这样使用：

```typescript
import Sortable from "sortablejs";

// 获取当前活动的 Sortable 实例
const activeSortable: Sortable | null = Sortable.active;

// 获取当前被拖动的元素
const draggedElement: HTMLElement | null = Sortable.dragged;

// 获取幽灵元素
const ghostElement: HTMLElement | null = Sortable.ghost;

// 获取克隆元素
const cloneElement: HTMLElement | null = Sortable.clone;

// 获取 Sortable 版本
const version: string = Sortable.version;

// 通过元素获取 Sortable 实例
const element = document.getElementById("my-list") as HTMLElement;
const sortableInstance: Sortable | undefined = Sortable.get(element);

// 挂载插件
import { MultiDrag, Swap, AutoScroll } from "sortablejs";
Sortable.mount(new MultiDrag(), new Swap(), new AutoScroll());
```

## 实用工具方法

Sortable.utils 提供了一些实用方法，在 TypeScript 中使用时有完整的类型支持：

```typescript
import Sortable from "sortablejs";

// 获取工具对象
const utils: Sortable.Utils = Sortable.utils;

// 添加事件监听器
const element = document.getElementById("item") as HTMLElement;
utils.on(element, "click", function (e: Event) {
  console.log("元素被点击");
});

// 移除事件监听器
const clickHandler = function (e: Event) {
  /* 处理点击 */
};
utils.off(element, "click", clickHandler);

// 获取所有 CSS 属性
const allStyles: CSSStyleDeclaration = utils.css(element);

// 获取特定 CSS 属性
const backgroundColor: string = utils.css(element, "backgroundColor");

// 设置 CSS 属性
utils.css(element, "color", "red");

// 查找元素
const container = document.getElementById("container") as HTMLElement;
const items: NodeListOf<HTMLElement> = utils.find(container, "li");

// 检查元素是否匹配选择器
const isItem: boolean = utils.is(element, ".item");

// 查找最近的匹配元素
const listItem: HTMLElement | null = utils.closest(element, ".list-item");

// 切换类
utils.toggleClass(element, "active", true); // 添加类
utils.toggleClass(element, "active", false); // 移除类

// 多拖拽选择/取消选择
utils.select(element); // 选择元素
utils.deselect(element); // 取消选择元素
```

## 插件系统

Sortable.js 提供了插件系统，在 TypeScript 中可以这样使用：

```typescript
import Sortable, { MultiDrag, AutoScroll, Swap, OnSpill } from "sortablejs";

// 挂载所有插件
Sortable.mount(new MultiDrag(), new AutoScroll(), new Swap(), new OnSpill());

// 或者只挂载需要的插件
Sortable.mount(new MultiDrag(), new AutoScroll());

// 使用带有插件的 Sortable
const sortable = Sortable.create(
  document.getElementById("list") as HTMLElement,
  {
    // 多拖拽插件选项
    multiDrag: true,
    selectedClass: "selected",
    multiDragKey: "CTRL",

    // 自动滚动插件选项
    scroll: true,
    scrollSensitivity: 30,
    scrollSpeed: 10,

    // 交换插件选项
    swap: true,
    swapClass: "highlight",

    // 溢出插件选项
    revertOnSpill: true,
    removeOnSpill: false,

    // 常规选项
    animation: 150,
    ghostClass: "ghost",
  },
);
```

## 高级示例

### 1. 多列表拖放（看板）

```typescript
import Sortable from "sortablejs";

interface Task {
  id: string;
  text: string;
  status: "todo" | "doing" | "done";
}

class KanbanBoard {
  private lists: Map<string, Sortable> = new Map();
  private tasks: Task[] = [];

  constructor(tasks: Task[]) {
    this.tasks = tasks;
    this.initBoard();
  }

  private initBoard(): void {
    // 初始化列表
    const listIds: string[] = ["todo", "doing", "done"];

    // 创建共享组选项
    const groupOptions: Sortable.GroupOptions = {
      name: "kanban",
      pull: true,
      put: true,
    };

    // 初始化所有列表
    listIds.forEach((id) => {
      const el = document.getElementById(id) as HTMLElement;
      if (!el) return;

      // 渲染初始任务
      this.renderTasks(id);

      // 创建 Sortable 实例
      const sortable = Sortable.create(el, {
        group: groupOptions,
        animation: 150,
        ghostClass: "task-ghost",
        chosenClass: "task-chosen",
        dragClass: "task-drag",

        onEnd: (evt: Sortable.SortableEvent) => {
          if (evt.from !== evt.to && evt.item && evt.item.dataset.id) {
            const taskId = evt.item.dataset.id;
            const newStatus = evt.to.id as "todo" | "doing" | "done";

            // 更新任务状态
            this.updateTaskStatus(taskId, newStatus);
          }
        },
      });

      this.lists.set(id, sortable);
    });
  }

  private renderTasks(listId: string): void {
    const el = document.getElementById(listId);
    if (!el) return;

    // 清空列表
    el.innerHTML = "";

    // 过滤并添加任务
    const filteredTasks = this.tasks.filter((task) => task.status === listId);

    filteredTasks.forEach((task) => {
      const li = document.createElement("li");
      li.className = "task-item";
      li.dataset.id = task.id;
      li.textContent = task.text;
      el.appendChild(li);
    });
  }

  private updateTaskStatus(
    taskId: string,
    newStatus: "todo" | "doing" | "done",
  ): void {
    // 更新任务状态
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      task.status = newStatus;
      console.log(`任务 "${task.text}" 状态已更改为: ${newStatus}`);
    }
  }

  // 添加新任务
  public addTask(task: Task): void {
    this.tasks.push(task);
    this.renderTasks(task.status);
  }

  // 获取所有任务
  public getTasks(): Task[] {
    return [...this.tasks];
  }
}

// 使用看板
document.addEventListener("DOMContentLoaded", () => {
  // 初始任务
  const initialTasks: Task[] = [
    { id: "1", text: "分析需求", status: "todo" },
    { id: "2", text: "设计界面", status: "todo" },
    { id: "3", text: "实现核心功能", status: "doing" },
    { id: "4", text: "编写测试", status: "todo" },
    { id: "5", text: "修复 Bug", status: "done" },
    { id: "6", text: "部署应用", status: "done" },
  ];

  const kanban = new KanbanBoard(initialTasks);

  // 添加新任务按钮
  const addButton = document.getElementById("add-task");
  if (addButton) {
    addButton.addEventListener("click", () => {
      const text = prompt("请输入任务名称:");
      if (text) {
        kanban.addTask({
          id: Date.now().toString(),
          text,
          status: "todo",
        });
      }
    });
  }
});
```

### 2. 嵌套列表（树形结构）

```typescript
import Sortable from "sortablejs";

interface TreeNode {
  id: string;
  text: string;
  children?: TreeNode[];
}

class TreeView {
  private rootElement: HTMLElement;
  private data: TreeNode[];
  private sortableInstances: Sortable[] = [];

  constructor(rootElementId: string, data: TreeNode[]) {
    const rootEl = document.getElementById(rootElementId);
    if (!rootEl) {
      throw new Error(`Element with id "${rootElementId}" not found`);
    }

    this.rootElement = rootEl;
    this.data = data;
    this.render();
    this.initSortable();
  }

  private render(): void {
    // 清空根元素
    this.rootElement.innerHTML = "";

    // 创建树形结构
    const ul = this.createTreeList(this.data);
    ul.className = "tree-list";
    this.rootElement.appendChild(ul);
  }

  private createTreeList(nodes: TreeNode[]): HTMLUListElement {
    const ul = document.createElement("ul");
    ul.className = "nested-sortable";

    nodes.forEach((node) => {
      const li = document.createElement("li");
      li.dataset.id = node.id;

      // 创建项目内容
      const div = document.createElement("div");
      div.className = "tree-item";
      div.textContent = node.text;
      li.appendChild(div);

      // 递归创建子节点
      if (node.children && node.children.length > 0) {
        const childUl = this.createTreeList(node.children);
        li.appendChild(childUl);
      }

      ul.appendChild(li);
    });

    return ul;
  }

  private initSortable(): void {
    // 初始化 Sortable 实例
    const nestedSortables = document.querySelectorAll(".nested-sortable");
    nestedSortables.forEach((el) => {
      const sortable = Sortable.create(el as HTMLElement, {
        group: "nested",
        animation: 150,
        ghostClass: "sortable-ghost",
        chosenClass: "sortable-chosen",
        dragClass: "sortable-drag",
        handle: ".tree-item",
        onEnd: (evt: Sortable.SortableEvent) => {
          console.log(`从索引 ${evt.oldIndex} 移动到索引 ${evt.newIndex}`);
        },
      });

      this.sortableInstances.push(sortable);
    });
  }
}

// 使用 TreeView
document.addEventListener("DOMContentLoaded", () => {
  const treeData: TreeNode[] = [
    {
      id: "1",
      text: "根节点",
      children: [
        { id: "2", text: "子节点 1" },
        { id: "3", text: "子节点 2" },
        {
          id: "4",
          text: "子节点 3",
          children: [
            { id: "5", text: "子节点 3.1" },
            { id: "6", text: "子节点 3.2" },
          ],
        },
      ],
    },
  ];

  const treeView = new TreeView("tree-root", treeData);
});
```

## 常见问题解决

### 1. 拖动不工作

- 确保你的元素是可拖动的（`draggable="true"`）
- 检查是否有其他元素阻止了拖动事件的传播
- 确保你的拖动手柄选择器正确

### 2. 移动设备问题

- 确保你的触摸事件处理正确
- 使用 `touch-action: none;` 样式来禁用默认的触摸行为

### 3. 性能优化

- 使用 `requestAnimationFrame` 来优化动画性能
- 避免在拖动过程中频繁更新 DOM
- 使用 `transform` 属性来实现平滑的动画

## 资源链接

- [Sortable.js 官方文档](https://sortablejs.github.io/Sortable/)
- [Sortable.js 演示](https://sortablejs.github.io/Sortable/sortable.html)
- [Sortable.js GitHub 仓库](https://github.com/SortableJS/Sortable)
