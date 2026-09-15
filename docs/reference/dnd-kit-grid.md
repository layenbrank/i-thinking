# React + @dnd-kit 网格拖拽参考

> **本仓库用法**：`@dnd-kit` 用于 `apps/client`（如 magnetic-tiles）与 `apps/studio` 的可排序网格。下文为通用实现笔记，安装请优先用仓库已有依赖与 `pnpm`，不必再单独 `npm install`。

# React 19 + @dnd-kit + TS 实现可拖拽排序的网格布局

下面是一个完整的实现方案，使用@dnd-kit在React 19中创建可拖拽排序的网格布局。

## 1. 安装依赖

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/modifiers
```

## 2. 完整实现代码

```tsx
// src/components/DraggableGrid.tsx
import React, { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// 定义网格项的类型
interface GridItem {
  id: string
  content: string
}

// 可拖拽的网格项组件
const SortableGridItem = ({ id, content }: GridItem) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'move'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`grid-item ${isDragging ? 'dragging' : ''}`}>
      {content}
    </div>
  )
}

// 主要网格组件
const DraggableGrid = () => {
  // 初始数据
  const [items, setItems] = useState<GridItem[]>([
    { id: '1', content: 'Item 1' },
    { id: '2', content: 'Item 2' },
    { id: '3', content: 'Item 3' },
    { id: '4', content: 'Item 4' },
    { id: '5', content: 'Item 5' },
    { id: '6', content: 'Item 6' }
  ])

  // 设置传感器，用于检测不同类型的拖拽事件
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // 处理拖拽结束事件
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  return (
    <div className="grid-container">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}>
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}>
          <div className="grid">
            {items.map((item) => (
              <SortableGridItem
                key={item.id}
                id={item.id}
                content={item.content}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

export default DraggableGrid
```

## 3. 添加样式

```css
/* src/components/DraggableGrid.css */
.grid-container {
  padding: 20px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  padding: 10px;
}

.grid-item {
  background-color: #3498db;
  color: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.grid-item.dragging {
  cursor: grabbing;
  z-index: 1000;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* 可选：添加一个拖拽手柄 */
.drag-handle {
  cursor: grab;
  padding: 4px 8px;
  margin-right: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}
```

## 4. 在应用中使用组件

```tsx
// src/App.tsx
import React from 'react'
import DraggableGrid from './components/DraggableGrid'
import './components/DraggableGrid.css'

function App() {
  return (
    <div className="App">
      <h1>可拖拽排序的网格布局</h1>
      <DraggableGrid />
    </div>
  )
}

export default App
```

## 5. 高级用法：添加拖拽手柄

如果你想只允许通过特定的元素来触发拖拽，可以修改`SortableGridItem`组件：

```tsx
const SortableGridItem = ({ id, content }: GridItem) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid-item ${isDragging ? 'dragging' : ''}`}>
      <div
        className="drag-handle"
        {...listeners}
        {...attributes}>
        ☰
      </div>
      {content}
    </div>
  )
}
```

## 关键点说明

1. **DndContext**：提供拖拽功能的上下文，需要包裹所有可拖拽组件
2. **SortableContext**：定义可排序的区域
3. **useSortable hook**：使单个元素可拖拽
4. **传感器(Sensors)**：检测不同类型的输入（指针、键盘等）
5. **arrayMove**：@dnd-kit提供的工具函数，用于在数组中移动元素
6. **CSS.Transform.toString**：将拖拽变换转换为CSS transform属性

这个实现完全兼容React 19，并且使用了TypeScript进行类型定义，可以轻松集成到现有的项目中。通过调整CSS，你可以自定义网格的布局和外观。
