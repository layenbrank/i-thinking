### 转换器

[文档](https://konva.zhcndoc.com/docs/react/Transformer.html)

```react
import React from 'react';
import { Stage, Layer, Rect, Transformer } from 'react-konva';

const Rectangle = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const shapeRef = React.useRef();
  const trRef = React.useRef();

  React.useEffect(() => {
    if (isSelected) {
      // 需要手动附加转换器
      trRef.current.nodes([shapeRef.current]);
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Rect
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          // 转换器改变节点的缩放比例
          // 而非直接改变宽度或高度
          // 但存储的数据里只有宽度和高度
          // 为了数据一致性，转换结束时重置缩放比例
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // 重置缩放比例
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            // 设定最小值
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            // 限制调整大小的最小边界
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

const initialRectangles = [
  {
    x: 10,
    y: 10,
    width: 100,
    height: 100,
    fill: 'red',
    id: 'rect1',
  },
  {
    x: 150,
    y: 150,
    width: 100,
    height: 100,
    fill: 'green',
    id: 'rect2',
  },
];

const App = () => {
  const [rectangles, setRectangles] = React.useState(initialRectangles);
  const [selectedId, selectShape] = React.useState(null);

  const checkDeselect = (e) => {
    // 点击空白区域时取消选择
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={checkDeselect}
      onTouchStart={checkDeselect}
    >
      <Layer>
        {rectangles.map((rect, i) => {
          return (
            <Rectangle
              key={i}
              shapeProps={rect}
              isSelected={rect.id === selectedId}
              onSelect={() => {
                selectShape(rect.id);
              }}
              onChange={(newAttrs) => {
                const rects = rectangles.slice();
                rects[i] = newAttrs;
                setRectangles(rects);
              }}
            />
          );
        })}
      </Layer>
    </Stage>
  );
};

export default App;
```

### 撤销/重做

[文档](https://konva.zhcndoc.com/docs/react/Undo-Redo.html)

```react
import React, { Component } from 'react';
import { Stage, Layer, Rect, Text } from 'react-konva';


const App = () => {
  const [position, setPosition] = React.useState({ x: 20, y: 20 });
  // 我们使用 refs 来保持历史记录，以避免不必要的重新渲染
  const history = React.useRef([{ x: 20, y: 20 }]);
  const historyStep = React.useRef(0);

  const handleUndo = () => {
    if (historyStep.current === 0) {
      return;
    }
    historyStep.current -= 1;
    const previous = history.current[historyStep.current];
    setPosition(previous);
  };

  const handleRedo = () => {
    if (historyStep.current === history.current.length - 1) {
      return;
    }
    historyStep.current += 1;
    const next = history.current[historyStep.current];
    setPosition(next);
  };

  const handleDragEnd = (e) => {
    // 在当前步骤之后移除所有状态
    history.current = history.current.slice(0, historyStep.current + 1);
    const pos = {
      x: e.target.x(),
      y: e.target.y(),
    };
    // 添加新状态
    history.current = history.current.concat([pos]);
    historyStep.current += 1;
    setPosition(pos);
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text text="撤销" onClick={handleUndo} />
        <Text text="重做" x={40} onClick={handleRedo} />
        <Rect
          x={position.x}
          y={position.y}
          width={50}
          height={50}
          fill="black"
          draggable
          onDragEnd={handleDragEnd}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 自由绘图

[文档](https://konva.zhcndoc.com/docs/react/Free_Drawing.html)

```react
import React from 'react';
import { Stage, Layer, Line, Text } from 'react-konva';

const App = () => {
  const [tool, setTool] = React.useState('pen');
  const [lines, setLines] = React.useState([]);
  const isDrawing = React.useRef(false);

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e) => {
    // 没有绘图 - 跳过
    if (!isDrawing.current) {
      return;
    }
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    // 添加点
    lastLine.points = lastLine.points.concat([point.x, point.y]);

    // 替换最后一条线
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  return (
    <div>
      <select
        value={tool}
        onChange={(e) => {
          setTool(e.target.value);
        }}
      >
        <option value="pen">笔</option>
        <option value="eraser">橡皮擦</option>
      </select>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMousemove={handleMouseMove}
        onMouseup={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
      >
        <Layer>
          <Text text="开始绘图吧" x={5} y={30} />
          {lines.map((line, i) => (
            <Line
              key={i}
              points={line.points}
              stroke="#df4b26"
              strokeWidth={5}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={
                line.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### 滤镜

[文档](https://konva.zhcndoc.com/docs/react/Filters.html)

```react
import React from 'react';
import Konva from 'konva';
import { Stage, Layer, Rect, Image } from 'react-konva';
import useImage from 'use-image';

// 图像滤镜的函数组件示例
const FilterImage = () => {
  const [image] = useImage('https://konvajs.org/assets/lion.png', 'anonymous');
  const imageRef = React.useRef();

  // 当图像加载时，我们需要缓存形状
  React.useEffect(() => {
    if (image) {
      // 需要在某些属性更改时（如阴影、描边等）重新应用缓存
      imageRef.current.cache();
    }
  }, [image]);

  return (
    <Image
      ref={imageRef}
      x={10}
      y={10}
      image={image}
      filters={[Konva.Filters.Blur]}
      blurRadius={10}
    />
  );
};

// 带有噪声滤镜的类组件示例
// 尝试单击矩形以查看颜色更新
const FilterRect = () => {
  const [color, setColor] = React.useState('green');
  const rectRef = React.useRef();

  React.useEffect(() => {
    if (rectRef.current) {
      rectRef.current.cache();
    }
  }, []);

  const handleClick = () => {
    setColor(Konva.Util.getRandomColor());
    // 更新形状时重新缓存
    rectRef.current.cache();
  };

  return (
    <Rect
      filters={[Konva.Filters.Noise]}
      noise={1}
      x={200}
      y={10}
      width={50}
      height={50}
      fill={color}
      shadowBlur={10}
      ref={rectRef}
      onClick={handleClick}
    />
  );
};

const App = () => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <FilterImage />
        <FilterRect />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 事件

[文档](https://konva.zhcndoc.com/docs/react/Events.html)

```react
import React from 'react';
import { Stage, Layer, Star, Text } from 'react-konva';

function generateShapes() {
  return [...Array(10)].map((_, i) => ({
    id: i.toString(),
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    rotation: Math.random() * 180,
    isDragging: false,
  }));
}

const App = () => {
  const [stars, setStars] = React.useState(generateShapes());

  const handleDragStart = (e) => {
    const id = e.target.id();
    setStars(
      stars.map((star) => {
        return {
          ...star,
          isDragging: star.id === id,
        };
      })
    );
  };

  const handleDragEnd = (e) => {
    setStars(
      stars.map((star) => {
        return {
          ...star,
          isDragging: false,
        };
      })
    );
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text text="试着拖动一个星星" />
        {stars.map((star) => (
          <Star
            key={star.id}
            id={star.id}
            x={star.x}
            y={star.y}
            numPoints={5}
            innerRadius={20}
            outerRadius={40}
            fill="#89b717"
            opacity={0.8}
            draggable
            rotation={star.rotation}
            shadowColor="black"
            shadowBlur={10}
            shadowOpacity={0.6}
            shadowOffsetX={star.isDragging ? 10 : 5}
            shadowOffsetY={star.isDragging ? 10 : 5}
            scaleX={star.isDragging ? 1.2 : 1}
            scaleY={star.isDragging ? 1.2 : 1}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default App;
```

### 拖放

[文档](https://konva.zhcndoc.com/docs/react/Drag_And_Drop.html)

```react
import React from 'react';
import { Stage, Layer, Text } from 'react-konva';

const App = () => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState({
    x: 50,
    y: 50,
  });

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          text="可拖动文本"
          x={position.x}
          y={position.y}
          draggable
          fill={isDragging ? 'green' : 'black'}
          onDragStart={() => {
            setIsDragging(true);
          }}
          onDragEnd={(e) => {
            setIsDragging(false);
            setPosition({
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### DOM 门户

[文档](https://konva.zhcndoc.com/docs/react/DOM_Portal.html)

```react
import React from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { Html } from 'react-konva-utils';

const App = () => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Html>
          <input placeholder="来自 Konva 节点的 DOM 输入" />
        </Html>
        <Rect
          x={20}
          y={20}
          width={50}
          height={50}
          fill="red"
          shadowBlur={5}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 画布导出

[文档](https://konva.zhcndoc.com/docs/react/Canvas_Export.html)

```react
import React, { Fragment } from 'react';
import { Stage, Layer, Rect } from 'react-konva';

// 来自 https://stackoverflow.com/a/15832662/512042 的函数
function downloadURI(uri, name) {
  var link = document.createElement('a');
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const App = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const stageRef = React.useRef(null);

  const handleExport = () => {
    const uri = stageRef.current.toDataURL();
    console.log(uri);
    // 我们还可以将 uri 保存为文件
    downloadURI(uri, 'stage.png');
  };

  return (
    <Fragment>
      <button onClick={handleExport}>点击此处将舞台导出为图像</button>
      <Stage width={width} height={height} ref={stageRef}>
        <Layer>
          <Rect x={0} y={0} width={80} height={80} fill="red" />
          <Rect x={width - 80} y={0} width={80} height={80} fill="red" />
          <Rect
            x={width - 80}
            y={height - 80}
            width={80}
            height={80}
            fill="red"
          />
          <Rect x={0} y={height - 80} width={80} height={80} fill="red" />
        </Layer>
      </Stage>
    </Fragment>
  );
};

export default App;
```

### zIndex

[文档](https://konva.zhcndoc.com/docs/react/zIndex.html)

```react
import React, { Component } from 'react';
import Konva from 'konva';
import { Stage, Layer, Circle } from 'react-konva';

function generateItems() {
  const items = [];
  for (let i = 0; i < 10; i++) {
    items.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      id: 'node-' + i,
      color: Konva.Util.getRandomColor(),
    });
  }
  return items;
}

const App = () => {
  const [items, setItems] = React.useState(generateItems());

  const handleDragStart = (e) => {
    const id = e.target.name();
    const itemsCopy = items.slice();
    const item = itemsCopy.find((i) => i.id === id);
    const index = itemsCopy.indexOf(item);
    // 从列表中移除:
    itemsCopy.splice(index, 1);
    // 添加到顶部
    itemsCopy.push(item);
    setItems(itemsCopy);
  };

  const onDragEnd = (e) => {
    const id = e.target.name();
    const itemsCopy = items.slice();
    const item = items.find((i) => i.id === id);
    const index = items.indexOf(item);
    // 更新项的位置
    itemsCopy[index] = {
      ...item,
      x: e.target.x(),
      y: e.target.y(),
    };
    setItems(itemsCopy);
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        {items.map((item) => (
          <Circle
            key={item.id}
            name={item.id}
            draggable
            x={item.x}
            y={item.y}
            fill={item.color}
            radius={50}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </Layer>
    </Stage>
  );
};

export default App;
```

### 高质量导出

[文档](https://konva.zhcndoc.com/docs/data_and_serialization/High-Quality-Export.html)

```react
import { Stage, Layer, Circle, Text } from 'react-konva';
import { useRef } from 'react';

const App = () => {
  const stageRef = useRef(null);

  const handleExport = () => {
    const dataURL = stageRef.current.toDataURL({
      pixelRatio: 2 // 双倍分辨率
    });

    const link = document.createElement('a');
    link.download = 'stage.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <button onClick={handleExport} style={{ marginBottom: '10px' }}>
        保存为高质量图像
      </button>
      <Stage width={400} height={400} ref={stageRef}>
        <Layer>
          <Circle
            x={200}
            y={200}
            radius={70}
            fill="red"
            stroke="black"
            strokeWidth={4}
          />
          <Text
            x={150}
            y={190}
            text="高质量导出"
            fontSize={20}
            fill="white"
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### 序列化阶段

[文档](https://konva.zhcndoc.com/docs/data_and_serialization/Serialize_a_Stage.html)

```react
import { Stage, Layer, Circle } from 'react-konva';
import { useRef, useState } from 'react';

const App = () => {
  const stageRef = useRef(null);
  const [circle, setCircle] = useState({
    x: 100,
    y: 100,
    radius: 50,
    fill: 'red',
    stroke: 'black',
    strokeWidth: 3
  });

  const handleSerialize = () => {
    // 在实际应用程序中，优先保存应用状态，而不是阶段 JSON
    const json = JSON.stringify({ shapes: [circle] });
    console.log('序列化状态：', json);
    alert('状态已序列化！请检查控制台以获取 JSON 字符串。');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={handleSerialize}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1
        }}
      >
        序列化
      </button>

      <Stage width={400} height={400} ref={stageRef}>
        <Layer>
          <Circle
            {...circle}
            draggable
            onDragEnd={(e) => {
              setCircle({
                ...circle,
                x: e.target.x(),
                y: e.target.y()
              });
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### Canvas 截图

[文档](https://konva.zhcndoc.com/docs/data_and_serialization/Stage_Data_URL.html)

```react
import { Stage, Layer, Rect } from 'react-konva';
import { useRef, useState } from 'react';

const App = () => {
  const stageRef = useRef(null);
  const [position, setPosition] = useState({ x: 100, y: 100 });

  const handleExport = () => {
    // 获取默认设置的数据 URL
    const dataURL = stageRef.current.toDataURL();

    // 在新窗口中打开
    const win = window.open();
    win.document.write(`<img src="${dataURL}" alt="舞台"/>`);

    // 你还可以使用不同的设置进行保存
    const jpegURL = stageRef.current.toDataURL({
      mimeType: 'image/jpeg',
      quality: 0.8
    });
    console.log('JPEG URL:', jpegURL);
  };

  const handleDragEnd = (e) => {
    setPosition({
      x: e.target.x(),
      y: e.target.y()
    });
  };

  return (
    <div>
      <button onClick={handleExport} style={{ marginBottom: '10px' }}>
        保存为图像
      </button>
      <Stage width={400} height={400} ref={stageRef}>
        <Layer>
          <Rect
            x={position.x}
            y={position.y}
            width={100}
            height={100}
            fill="red"
            stroke="black"
            strokeWidth={4}
            draggable
            onDragEnd={handleDragEnd}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### 简单加载

[文档](https://konva.zhcndoc.com/docs/data_and_serialization/Simple_Load.html)

```react
import { Stage, Layer, Circle } from 'react-konva';
import { useState, useEffect } from 'react';
import Konva from 'konva';

const App = () => {
  // 在 React 中，我们将形状数据存储为状态，而不是使用 Konva.Node.create()
  const [shapeData, setShapeData] = useState(null);

  useEffect(() => {
    // 模拟从存储或 API 加载 JSON 数据
    const savedShapeData = {
      circle: {
        x: 100,
        y: 100,
        radius: 50,
        fill: 'red',
        stroke: 'black',
        strokeWidth: 3
      },
      // 此处可以有更多形状
    };

    // 在真实应用中，这可能是：
    // fetch('/api/shapes').then(response => response.json()).then(setShapeData)
    setShapeData(savedShapeData);
  }, []);

  const handleCircleClick = () => {
    setShapeData({
      ...shapeData,
      circle: {
        ...shapeData.circle,
        fill: Konva.Util.getRandomColor()
      }
    });
  };

  // 在我们有数据之前不进行渲染
  if (!shapeData) return <div>加载中...</div>;

  return (
    <Stage width={400} height={400}>
      <Layer>
        <Circle
          {...shapeData.circle}
          onClick={handleCircleClick}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 复杂加载

[文档](https://konva.zhcndoc.com/docs/data_and_serialization/Complex_Load.html)

```react
import { Stage, Layer, RegularPolygon } from 'react-konva';
import { useState, useEffect } from 'react';
import Konva from 'konva';

const App = () => {
  const [shapeData, setShapeData] = useState(null);

  useEffect(() => {
    // 模拟从存储或 API 加载 JSON 数据
    const loadData = () => {
      // 这通常来自 localStorage、API 等
      const jsonString = '{"hexagon":{"x":100,"y":100,"sides":6,"radius":70,"fill":"red","stroke":"black","strokeWidth":4}}';

      try {
        // 将 JSON 解析为 JavaScript 对象
        const data = JSON.parse(jsonString);
        setShapeData(data);
      } catch (error) {
        console.error('解析 JSON 时出错：', error);
      }
    };

    loadData();
  }, []);

  const handleClick = () => {
    if (shapeData) {
      setShapeData({
        ...shapeData,
        hexagon: {
          ...shapeData.hexagon,
          fill: Konva.Util.getRandomColor()
        }
      });
    }
  };

  // 在我们拥有数据之前不渲染
  if (!shapeData) return <div>加载中...</div>;

  return (
    <Stage width={578} height={200}>
      <Layer>
        <RegularPolygon
          {...shapeData.hexagon}
          onClick={handleClick}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 组

[文档](https://konva.zhcndoc.com/docs/groups_and_layers/Groups.html)

```react
import { Stage, Layer, Group, Circle, Rect } from 'react-konva';

const App = () => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Group x={50} y={50} draggable>
          <Circle
            x={40}
            y={40}
            radius={30}
            fill="red"
            stroke="black"
            strokeWidth={4}
          />
          <Rect
            x={80}
            y={20}
            width={100}
            height={50}
            fill="green"
            stroke="black"
            strokeWidth={4}
          />
        </Group>
      </Layer>
    </Stage>
  );
};

export default App;
```

### 层级

[文档](https://konva.zhcndoc.com/docs/groups_and_layers/Layering.html)

```react
import { Stage, Layer, Rect } from 'react-konva';
import { useState } from 'react';

const App = () => {
  const [yellowOnTop, setYellowOnTop] = useState(false);

  return (
    <>
      <button onClick={() => setYellowOnTop(true)}>
        将黄色方块移至顶层
      </button>
      <button onClick={() => setYellowOnTop(false)}>
        将黄色方块移至底层
      </button>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          {!yellowOnTop && (
            <Rect
              x={100}
              y={100}
              width={100}
              height={100}
              fill="red"
              stroke="black"
              strokeWidth={4}
              draggable
            />
          )}
          <Rect
            x={50}
            y={50}
            width={100}
            height={100}
            fill="yellow"
            stroke="black"
            strokeWidth={4}
            draggable
          />
          {yellowOnTop && (
            <Rect
              x={100}
              y={100}
              width={100}
              height={100}
              fill="red"
              stroke="black"
              strokeWidth={4}
              draggable
            />
          )}
        </Layer>
      </Stage>
    </>
  );
};

export default App;
```

### 裁剪函数

[文档](https://konva.zhcndoc.com/docs/clipping/Clipping_Function.html)

```react
import { Stage, Layer, Group, Circle } from 'react-konva';

const App = () => {
  const blobs = Array.from({ length: 20 }, (_, i) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 50,
  }));

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Group
          clipFunc={(ctx) => {
            ctx.beginPath();
            ctx.arc(200, 120, 50, 0, Math.PI * 2, false);
            ctx.arc(280, 120, 50, 0, Math.PI * 2, false);
          }}
        >
          {blobs.map((blob, i) => (
            <Circle
              key={i}
              x={blob.x}
              y={blob.y}
              radius={blob.radius}
              fill="green"
              opacity={0.8}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
};

export default App;
```

### 简单裁剪

[文档](https://konva.zhcndoc.com/docs/clipping/Clipping_Regions.html)

```react
import { Stage, Layer, Group, Circle } from 'react-konva';

const App = () => {
  const blobs = Array.from({ length: 20 }, (_, i) => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    radius: Math.random() * 50,
  }));

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Group
          clip={{
            x: 100,
            y: 20,
            width: 200,
            height: 200,
          }}
        >
          {blobs.map((blob, i) => (
            <Circle
              key={i}
              x={blob.x}
              y={blob.y}
              radius={blob.radius}
              fill="green"
              opacity={0.8}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
};

export default App;
```

### 调整文本

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Resize_Text.html)

```react
import { Stage, Layer, Text, Transformer } from 'react-konva';
import { useRef, useEffect, useState } from 'react';

const App = () => {
  const [textWidth, setTextWidth] = useState(200);
  const textRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    trRef.current.nodes([textRef.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          x={50}
          y={50}
          text="Hello from Konva! Try to resize me."
          fontSize={24}
          draggable
          width={textWidth}
          ref={textRef}
          onTransform={() => {
            const node = textRef.current;
            setTextWidth(node.width() * node.scaleX());
            node.scaleX(1);
          }}
        />
        <Transformer
          ref={trRef}
          enabledAnchors={['middle-left', 'middle-right']}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 旋转捕捉

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Rotation_Snaps.html)

```react
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

const App = () => {
  const rectRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    trRef.current.nodes([rectRef.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Rect
          x={50}
          y={50}
          width={100}
          height={50}
          fill="yellow"
          stroke="black"
          draggable
          ref={rectRef}
        />
        <Transformer
          ref={trRef}
          rotationSnaps={[0, 90, 180, 270]}
          rotationSnapTolerance={30}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 调整大小吸附

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Resize_Snaps.html)

```react
import { Stage, Layer, Line, Rect, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

const App = () => {
  const rectRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    trRef.current.nodes([rectRef.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Line
          points={[0, window.innerHeight / 2, window.innerWidth, window.innerHeight / 2]}
          stroke="#000"
          strokeWidth={1}
          dash={[4, 4]}
        />
        <Line
          points={[window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight]}
          stroke="#000"
          strokeWidth={1}
          dash={[4, 4]}
        />
        <Rect
          x={60}
          y={60}
          width={100}
          height={100}
          fill="red"
          draggable
          ref={rectRef}
        />
        <Transformer
          ref={trRef}
          anchorDragBoundFunc={(oldPos, newPos) => {
            const dist = Math.sqrt(Math.pow(newPos.x - window.innerWidth / 2, 2));
            if (dist < 10) {
              return {
                ...newPos,
                x: window.innerWidth / 2,
              };
            }
            return newPos;
          }}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 缩放限制

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Resize_Limits.html)

```react
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

const App = () => {
  const rectRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    trRef.current.nodes([rectRef.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Rect
          x={50}
          y={50}
          width={100}
          height={100}
          fill="yellow"
          stroke="black"
          draggable
          ref={rectRef}
        />
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            // 限制缩放
            if (newBox.width > 200) {
              return oldBox;
            }
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 变换事件

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Transform_Events.html)

```react
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

const App = () => {
  const rectRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    trRef.current.nodes([rectRef.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Rect
          x={50}
          y={50}
          width={100}
          height={100}
          fill="yellow"
          stroke="black"
          draggable
          ref={rectRef}
          onTransformStart={() => console.log('rect transform start')}
          onTransform={() => console.log('rect transforming')}
          onTransformEnd={() => console.log('rect transform end')}
        />
        <Transformer
          ref={trRef}
          onTransformStart={() => console.log('transform start')}
          onTransform={() => console.log('transforming')}
          onTransformEnd={() => console.log('transform end')}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 复杂 Transformer 样式

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Transformer_Complex_Styling.html)

```react
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

const App = () => {
  const rectRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    trRef.current.nodes([rectRef.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Rect
          x={50}
          y={50}
          width={100}
          height={100}
          fill="yellow"
          stroke="black"
          draggable
          ref={rectRef}
        />
        <Transformer
          ref={trRef}
          anchorStyleFunc={(anchor) => {
            // 使所有锚点变为圆形
            anchor.cornerRadius(50);
            // 使所有锚点变为红色
            anchor.fill('red');

            // 使右侧中间锚点变大
            if (anchor.hasName('middle-right')) {
              anchor.scale({ x: 2, y: 2 });
            }
            // 使左上角锚点不可见
            if (anchor.hasName('top-left')) {
              anchor.scale({ x: 0, y: 0 });
            }
          }}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### transformer 样式

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Transformer_Styling.html)

```react
import { Stage, Layer, Rect, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

const App = () => {
  const rectRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    trRef.current.nodes([rectRef.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Rect
          x={50}
          y={50}
          width={100}
          height={100}
          fill="yellow"
          stroke="black"
          draggable
          ref={rectRef}
        />
        <Transformer
          ref={trRef}
          borderStroke="#000"
          borderStrokeWidth={3}
          anchorFill="#fff"
          anchorStroke="#000"
          anchorStrokeWidth={2}
          anchorSize={20}
          anchorCornerRadius={50}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 保持比例

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Keep_Ratio.html)

```react
import { Stage, Layer, Text, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';

const App = () => {
  const text1Ref = useRef();
  const text2Ref = useRef();
  const tr1Ref = useRef();
  const tr2Ref = useRef();

  useEffect(() => {
    tr1Ref.current.nodes([text1Ref.current]);
    tr2Ref.current.nodes([text2Ref.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          x={50}
          y={50}
          text="默认保持比例"
          fontSize={20}
          draggable
          width={200}
          ref={text1Ref}
        />
        <Transformer ref={tr1Ref} />

        <Text
          x={50}
          y={150}
          text="不保持比例，但按住 Shift 键可保持比例"
          fontSize={20}
          draggable
          width={200}
          ref={text2Ref}
        />
        <Transformer ref={tr2Ref} keepRatio={false} />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 中心缩放

[文档](https://konva.zhcndoc.com/docs/select_and_transform/Centered_Scaling.html)

```react
import { useRef, useEffect } from 'react'
import { Stage, Layer, Text, Transformer } from 'react-konva';

const App = () => {
  const text1Ref = useRef()
  const text2Ref = useRef()
  const tr1Ref = useRef()
  const tr2Ref = useRef()

  useEffect(() => {
    tr1Ref.current.nodes([text1Ref.current]);
    tr2Ref.current.nodes([text2Ref.current]);
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          x={50}
          y={80}
          text="Simple text"
          fontSize={30}
          draggable
          width={200}
          ref={text1Ref}
        />
        <Transformer centeredScaling ref={tr1Ref} />
        <Text
          x={50}
          y={180}
          text="Simple text"
          fontSize={30}
          draggable
          width={200}
          ref={text2Ref}
        />
        <Transformer ref={tr2Ref} />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 拖放事件

[文档](https://konva.zhcndoc.com/docs/drag_and_drop/Drop_Events.html)

```react
import { Stage, Layer, Text, Star } from 'react-konva';
import { useState, useRef } from 'react';

const App = () => {
  const [stars] = useState(() =>
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: window.innerWidth * Math.random(),
      y: window.innerHeight * Math.random(),
      fill: 'blue',
      name: `star ${i}`,
    }))
  );
  const [message, setMessage] = useState('');
  const previousShapeRef = useRef(null);
  const mainLayerRef = useRef(null);
  const tempLayerRef = useRef(null);

  const handleDragStart = (e) => {
    const shape = e.target;
    shape.moveTo(tempLayerRef.current);
    setMessage('Moving ' + shape.name());
  };

  const handleDragMove = (e) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const shape = mainLayerRef.current.getIntersection(pos);

    if (previousShapeRef.current && shape) {
      if (previousShapeRef.current !== shape) {
        // 离开旧目标
        previousShapeRef.current.fire('dragleave', { evt: e.evt }, true);
        // 进入新目标
        shape.fire('dragenter', { evt: e.evt }, true);
        previousShapeRef.current = shape;
      } else {
        previousShapeRef.current.fire('dragover', { evt: e.evt }, true);
      }
    } else if (!previousShapeRef.current && shape) {
      previousShapeRef.current = shape;
      shape.fire('dragenter', { evt: e.evt }, true);
    } else if (previousShapeRef.current && !shape) {
      previousShapeRef.current.fire('dragleave', { evt: e.evt }, true);
      previousShapeRef.current = undefined;
    }
  };

  const handleDragEnd = (e) => {
    const shape = e.target;
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const dropShape = mainLayerRef.current.getIntersection(pos);

    if (dropShape) {
      previousShapeRef.current.fire('drop', { evt: e.evt }, true);
    }

    shape.moveTo(mainLayerRef.current);
    previousShapeRef.current = undefined;
  };

  const handleDragEnter = (e) => {
    e.target.fill('green');
    setMessage('dragenter ' + e.target.name());
  };

  const handleDragLeave = (e) => {
    e.target.fill('blue');
    setMessage('dragleave ' + e.target.name());
  };

  const handleDragOver = (e) => {
    setMessage('dragover ' + e.target.name());
  };

  const handleDrop = (e) => {
    e.target.fill('red');
    setMessage('drop ' + e.target.name());
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer ref={mainLayerRef}>
        <Text text={message} fill="black" />
        {stars.map((star) => (
          <Star
            key={star.id}
            id={star.id}
            name={star.name}
            x={star.x}
            y={star.y}
            numPoints={10}
            innerRadius={20}
            outerRadius={25}
            fill={star.fill}
            shadowOffsetX={5}
            shadowOffsetY={5}
            draggable
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        ))}
      </Layer>
      <Layer ref={tempLayerRef} />
    </Stage>
  );
};

export default App;
```

### 复杂拖放

[文档](https://konva.zhcndoc.com/docs/drag_and_drop/Complex_Drag_and_Drop.html)

```react
import { Stage, Layer, Group, Rect, Text } from 'react-konva';

const App = () => {
  const handleBlueDragMove = (e) => {
    e.target.y(Math.max(e.target.y(), 50));
  };

  const handleYellowDragMove = (e) => {
    const x = window.innerWidth / 2;
    const y = 70;
    const radius = 50;
    const pos = e.target.absolutePosition();
    const scale = radius / Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));

    if (scale < 1) {
      e.target.x(Math.round((pos.x - x) * scale + x));
      e.target.y(Math.round((pos.y - y) * scale + y));
    }
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Group x={30} y={70} draggable onDragMove={handleBlueDragMove}>
          <Rect
            width={150}
            height={72}
            fill="#aaf"
            stroke="black"
            strokeWidth={4}
          />
          <Text
            text="bound below"
            fontSize={26}
            fontFamily="Calibri"
            fill="black"
            padding={10}
            width={150}
            align="center"
          />
        </Group>
        <Group
          x={window.innerWidth / 2}
          y={70}
          draggable
          onDragMove={handleYellowDragMove}
        >
          <Rect
            width={150}
            height={72}
            fill="yellow"
            stroke="black"
            strokeWidth={4}
          />
          <Text
            text="bound in circle"
            fontSize={26}
            fontFamily="Calibri"
            fill="black"
            padding={10}
            width={150}
            align="center"
          />
        </Group>
      </Layer>
    </Stage>
  );
};

export default App;
```

### 简单拖拽边界

[文档](https://konva.zhcndoc.com/docs/drag_and_drop/Simple_Drag_Bounds.html)

```react
import { Stage, Layer, Text } from 'react-konva';

const App = () => {
  const handleHorizontalDragMove = (e) => {
    e.target.y(50);
  };

  const handleVerticalDragMove = (e) => {
    e.target.x(200);
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          x={50}
          y={50}
          text="水平拖拽我"
          fontSize={16}
          draggable
          fill="black"
          onDragMove={handleHorizontalDragMove}
        />
        <Text
          x={200}
          y={50}
          text="垂直拖拽我"
          fontSize={16}
          draggable
          fill="black"
          onDragMove={handleVerticalDragMove}
        />
      </Layer>
    </Stage>
  );
};

export default App
```

### 拖拽舞台

[文档](https://konva.zhcndoc.com/docs/drag_and_drop/Drag_a_Stage.html)

```react
import { Stage, Layer, Circle, Text } from 'react-konva';

const App = () => {
  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      draggable
    >
      <Layer>
        <Circle
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          radius={70}
          fill="red"
          stroke="black"
          strokeWidth={4}
        />
        <Text
          x={10}
          y={10}
          text="可以随意拖拽舞台"
          fontSize={20}
          fontFamily="Calibri"
          fill="black"
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 拖拽一条线

[文档](https://konva.zhcndoc.com/docs/drag_and_drop/Drag_a_Line.html)

```react
import { Stage, Layer, Line } from 'react-konva';
import { useState } from 'react';

const App = () => {
  const [position, setPosition] = useState({ x: 50, y: 50 });

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Line
          x={position.x}
          y={position.y}
          points={[0, 0, 150, 0]}
          stroke="red"
          strokeWidth={15}
          lineCap="round"
          lineJoin="round"
          draggable
          onDragEnd={(e) => {
            setPosition({
              x: e.target.x(),
              y: e.target.y(),
            });
          }}
          onMouseEnter={(e) => {
            document.body.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            document.body.style.cursor = 'default';
          }}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 拖拽一组

[文档](https://konva.zhcndoc.com/docs/drag_and_drop/Drag_a_Group.html)

```react
import { Stage, Layer, Group, Rect, Text } from 'react-konva';

const App = () => {
  const colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

  const handleMouseOver = () => {
    document.body.style.cursor = 'move';
  };

  const handleMouseOut = () => {
    document.body.style.cursor = 'default';
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Group
          draggable
          onMouseEnter={handleMouseOver}
          onMouseLeave={handleMouseOut}
        >
          {colors.map((color, i) => (
            <Rect
              key={color}
              x={i * 30 + 10}
              y={i * 18 + 40}
              width={100}
              height={50}
              name={color}
              fill={color}
              stroke="black"
              strokeWidth={4}
            />
          ))}
        </Group>
      </Layer>
    </Stage>
  );
};

export default App;
```

### 拖放图片

[文档](https://konva.zhcndoc.com/docs/drag_and_drop/Drag_an_Image.html)

```react
import { Stage, Layer, Image } from 'react-konva';
import useImage from 'use-image';

const App = () => {
  const [yodaImage] = useImage('https://konvajs.org/assets/yoda.jpg');

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Image
          x={50}
          y={50}
          image={yodaImage}
          width={106}
          height={118}
          draggable
          onMouseEnter={(e) => {
            document.body.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            document.body.style.cursor = 'default';
          }}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 基本拖放

[文档](https://konva.zhcndoc.com/docs/drag_and_drop/Drag_and_Drop.html)

```react
import { Stage, Layer, Circle } from 'react-konva';
import { useState } from 'react';

const App = () => {
  const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Circle
          x={position.x}
          y={position.y}
          radius={70}
          fill="red"
          stroke="black"
          strokeWidth={4}
          draggable
          onMouseEnter={(e) => {
            document.body.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            document.body.style.cursor = 'default';
          }}
          onDragEnd={(e) => {
            setPosition({
              x: e.target.x(),
              y: e.target.y()
            });
          }}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 舞台事件

[文档](https://konva.zhcndoc.com/docs/events/Stage_Events.html)

```react
import { Stage, Layer, Circle, Text } from 'react-konva';
import { useState } from 'react';

const App = () => {
  const [message, setMessage] = useState('');

  const handleStageClick = (e) => {
    if (e.target === e.target.getStage()) {
      setMessage('在舞台上点击');
      return;
    }
    setMessage('在 ' + e.target.name() + ' 上点击');
  };

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      onClick={handleStageClick}
    >
      <Layer>
        <Text
          x={10}
          y={10}
          fontFamily="Calibri"
          fontSize={24}
          text={message}
          fill="black"
        />
        <Circle
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          radius={70}
          fill="red"
          stroke="black"
          strokeWidth={4}
          name="circle"
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 按名称移除

[文档](https://konva.zhcndoc.com/docs/events/Remove_by_Name.html)

```react
import Konva from 'konva';

const stage = new Konva.Stage({
  container: 'container',
  width: window.innerWidth,
  height: window.innerHeight,
});

const layer = new Konva.Layer();
stage.add(layer);

const circle = new Konva.Circle({
  x: stage.width() / 2,
  y: stage.height() / 2,
  radius: 70,
  fill: 'red',
  stroke: 'black',
  strokeWidth: 4,
});

// 添加点击监听器
circle.on('click.event1', function () {
  alert('第一个点击监听器');
});

circle.on('click.event2', function () {
  alert('第二个点击监听器');
});

layer.add(circle);

// 添加按钮以移除监听器
const button1 = document.createElement('button');
button1.innerHTML = '移除第一个监听器';
button1.style.position = 'absolute';
button1.style.top = '0';
button1.style.left = '0';
button1.onclick = function() {
  circle.off('click.event1');
};
document.getElementById('container').appendChild(button1);

const button2 = document.createElement('button');
button2.innerHTML = '移除第二个监听器';
button2.style.position = 'absolute';
button2.style.top = '30px';
button2.style.left = '0';
button2.onclick = function() {
  circle.off('click.event2');
};
document.getElementById('container').appendChild(button2);
```

### 移除事件

[文档](https://konva.zhcndoc.com/docs/events/Remove_Event.html)

```react
import { Stage, Layer, Circle } from 'react-konva';
import { useState } from 'react';

const App = () => {
  const [hasListener, setHasListener] = useState(true);

  return (
    <>
      <button onClick={() => setHasListener(false)}>
        移除点击监听器
      </button>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Circle
            x={window.innerWidth / 2}
            y={window.innerHeight / 2}
            radius={70}
            fill="red"
            stroke="black"
            strokeWidth={4}
            onClick={hasListener ? () => alert('你点击了圆圈') : null}
          />
        </Layer>
      </Stage>
    </>
  );
};

export default App;
```

### 指针事件

[文档](https://konva.zhcndoc.com/docs/events/Pointer_Events.html)

```react
import { Stage, Layer, RegularPolygon, Text } from 'react-konva';
import { useState, useRef } from 'react';

const App = () => {
  const [message, setMessage] = useState('');
  const stageRef = useRef();

  const handlePointerMove = () => {
    const pos = stageRef.current.getPointerPosition();
    setMessage(`x: ${pos.x}, y: ${pos.y}`);
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight} ref={stageRef}>
      <Layer>
        <Text
          x={10}
          y={10}
          fontFamily="Calibri"
          fontSize={24}
          text={message}
          fill="black"
        />
        <RegularPolygon
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          sides={3}
          radius={80}
          fill="#00D2FF"
          stroke="black"
          strokeWidth={4}
          onPointermove={handlePointerMove}
          onPointerout={() => setMessage('')}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 多事件

[文档](https://konva.zhcndoc.com/docs/events/Multi_Event.html)

```react
import { Stage, Layer, Circle, Text } from 'react-konva';
import { useState } from 'react';

const App = () => {
  const [message, setMessage] = useState('');

  const handleMultiEvent = (e) => {
    setMessage('event: ' + e.type);
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          x={10}
          y={10}
          fontFamily="Calibri"
          fontSize={24}
          text={message}
          fill="black"
        />
        <Circle
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          radius={70}
          fill="red"
          stroke="black"
          strokeWidth={4}
          onMouseover={handleMultiEvent}
          onMousedown={handleMultiEvent}
          onMouseup={handleMultiEvent}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 键盘事件

[文档](https://konva.zhcndoc.com/docs/events/Keyboard_Events.html)

```react
import { Stage, Layer, Circle } from 'react-konva';
import { useRef, useEffect, useState } from 'react';

const App = () => {
  const stageRef = useRef();
  const containerRef = useRef();
  const [position, setPosition] = useState({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  useEffect(() => {
    // 挂载时聚焦 div
    containerRef.current.focus();
  }, []);

  const handleKeyDown = (e) => {
    const DELTA = 4;
    switch (e.keyCode) {
      case 37: // 左
        setPosition(pos => ({ ...pos, x: pos.x - DELTA }));
        break;
      case 38: // 上
        setPosition(pos => ({ ...pos, y: pos.y - DELTA }));
        break;
      case 39: // 右
        setPosition(pos => ({ ...pos, x: pos.x + DELTA }));
        break;
      case 40: // 下
        setPosition(pos => ({ ...pos, y: pos.y + DELTA }));
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        ref={stageRef}
      >
        <Layer>
          <Circle
            x={position.x}
            y={position.y}
            radius={50}
            fill="red"
            stroke="black"
            strokeWidth={4}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### 图像事件

[文档](https://konva.zhcndoc.com/docs/events/Image_Events.html)

```react
import { Stage, Layer, Image, Text } from 'react-konva';
import { useState, useEffect, useRef } from 'react';
import useImage from 'use-image';

const App = () => {
  const [message, setMessage] = useState('');
  const lionRef = useRef();
  const [monkeyImage] = useImage('https://konvajs.org/assets/monkey.png', 'anonymous');
  const [lionImage] = useImage('https://konvajs.org/assets/lion.png', 'anonymous');

  useEffect(() => {
    if (lionImage) {
    lionRef.current.cache();
      lionRef.current.drawHitFromCache();
    }
  }, [lionImage]);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          x={10}
          y={10}
          fontFamily="Calibri"
          fontSize={24}
          text={message}
          fill="black"
        />
        {monkeyImage && (
          <Image
            x={120}
            y={50}
            image={monkeyImage}
            width={200}
            height={200}
            onMouseover={() => setMessage('mouseover monkey (regular image)')}
            onMouseout={() => setMessage('')}
          />
        )}
        {lionImage && (
          <Image
            x={320}
            y={50}
            image={lionImage}
            width={200}
            height={200}
            ref={lionRef}
            onMouseover={() =>
              setMessage('mouseover lion (with transparent pixels detection)')
            }
            onMouseout={() => setMessage('')}
          />
        )}
      </Layer>
    </Stage>
  );
};

export default App;
```

### 触发事件

[文档](https://konva.zhcndoc.com/docs/events/Fire_Events.html)

```react
import { Stage, Layer, Circle } from 'react-konva';
import { useRef } from 'react';

const App = () => {
  const circleRef = useRef();

  const handleCustomEvent = () => {
    alert('custom event fired');
  };

  const fireCustomEvent = () => {
    circleRef.current.fire('customevent', {
      bubbles: true,
    });
  };

  return (
    <>
      <button
        onClick={fireCustomEvent}
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1
        }}
      >
        触发自定义事件
      </button>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Circle
            ref={circleRef}
            x={window.innerWidth / 2}
            y={window.innerHeight / 2}
            radius={70}
            fill="red"
            stroke="black"
            strokeWidth={4}
            onCustomevent={handleCustomEvent}
          />
        </Layer>
      </Stage>
    </>
  );
};

export default App;
```

### 事件代理

[文档](https://konva.zhcndoc.com/docs/events/Event_Delegation.html)

```react
import { Stage, Layer, Star, Text } from 'react-konva';
import { useState } from 'react';

const App = () => {
  const [message, setMessage] = useState('');

  const handleLayerClick = (e) => {
    const shape = e.target;
    setMessage('点击的是 ' + shape.getClassName());
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer onClick={handleLayerClick}>
        <Text
          x={10}
          y={10}
          fontFamily="Calibri"
          fontSize={24}
          text={message}
          fill="black"
        />
        <Star
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          numPoints={5}
          innerRadius={40}
          outerRadius={70}
          fill="red"
          stroke="black"
          strokeWidth={4}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 自定义命中区域

[文档](https://konva.zhcndoc.com/docs/events/Custom_Hit_Region.html)

```react
import { Stage, Layer, Star, Line, Text } from 'react-konva';
import { useState, useEffect } from 'react';

const App = () => {
  const [message, setMessage] = useState('');
  const [showHit, setShowHit] = useState(false);

  const handleStarEvent = (evt) => {
    setMessage(evt.type + ' 星形');
  };

  const handleLineEvent = (evt) => {
    setMessage(evt.type + ' 线条');
  };

  useEffect(() => {
    const stage = document.querySelector('.konvajs-content');
    if (showHit) {
      const hitCanvas = stage.querySelector('canvas:last-child');
      stage.style.border = '2px solid black';
      hitCanvas.style.position = 'absolute';
      hitCanvas.style.top = '0';
      hitCanvas.style.left = '0';
    }
  }, [showHit]);

  return (
    <>
      <button onClick={() => setShowHit(!showHit)}>切换命中画布</button>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Text x={10} y={10} text={message} fontSize={24} />
          <Star
            x={window.innerWidth / 4}
            y={window.innerHeight / 2}
            numPoints={5}
            innerRadius={40}
            outerRadius={70}
            fill="red"
            stroke="black"
            strokeWidth={4}
            hitFunc={(context, shape) => {
              context.beginPath();
              context.arc(0, 0, 70, 0, Math.PI * 2, true);
              context.closePath();
              context.fillStrokeShape(shape);
            }}
            onMouseover={handleStarEvent}
            onMouseout={handleStarEvent}
            onMousedown={handleStarEvent}
            onMouseup={handleStarEvent}
          />
          <Line
            x={window.innerWidth * 0.6}
            y={window.innerHeight / 2}
            points={[-50, -50, 50, 50]}
            stroke="black"
            strokeWidth={2}
            hitStrokeWidth={20}
            onMouseover={handleLineEvent}
            onMouseout={handleLineEvent}
            onMousedown={handleLineEvent}
            onMouseup={handleLineEvent}
          />
        </Layer>
      </Stage>
    </>
  );
};

export default App;
```

### 取消传播

[文档](https://konva.zhcndoc.com/docs/events/Cancel_Propagation.html)

```react
import { Stage, Layer, Circle } from 'react-konva';

const App = () => {
  const handleCircleClick = (e) => {
    alert('您点击了圆形');
    // 停止事件冒泡
    e.cancelBubble = true;
  };

  const handleLayerClick = () => {
    alert('您点击了图层');
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer onClick={handleLayerClick}>
        <Circle
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          radius={70}
          fill="red"
          stroke="black"
          strokeWidth={4}
          onClick={handleCircleClick}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 绑定事件

[文档](https://konva.zhcndoc.com/docs/events/Binding_Events.html)

```react
import { Stage, Layer, RegularPolygon, Circle, Text } from 'react-konva';
import { useRef, useState } from 'react';

const App = () => {
  const [message, setMessage] = useState('');
  const stageRef = useRef();

  const writeMessage = (text) => {
    setMessage(text);
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight} ref={stageRef}>
      <Layer>
        <Text
          x={10}
          y={10}
          fontFamily="Calibri"
          fontSize={24}
          text={message}
          fill="black"
        />
        <RegularPolygon
          x={80}
          y={120}
          sides={3}
          radius={80}
          fill="#00D2FF"
          stroke="black"
          strokeWidth={4}
          onMouseout={() => writeMessage('Mouseout triangle')}
          onMousemove={() => {
            const mousePos = stageRef.current.getPointerPosition();
            writeMessage('x: ' + mousePos.x + ', y: ' + mousePos.y);
          }}
        />
        <Circle
          x={230}
          y={100}
          radius={60}
          fill="red"
          stroke="black"
          strokeWidth={4}
          onMouseover={() => writeMessage('Mouseover circle')}
          onMouseout={() => writeMessage('Mouseout circle')}
          onMousedown={() => writeMessage('Mousedown circle')}
          onMouseup={() => writeMessage('Mouseup circle')}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 光标样式

[文档](https://konva.zhcndoc.com/docs/styling/Mouse_Cursor.html)

```react
import { Stage, Layer, RegularPolygon } from 'react-konva';
import { useState } from 'react';

// 用于直接更改光标的多边形独立组件
const SpecialPolygon = ({ x, y }) => {
  // 我们在此处使用 e.target 方法，因为此组件没有
  // 从父组件访问 Stage 光标状态的权限
  const handleMouseOver = (e) => {
    e.target.getStage().container().style.cursor = 'pointer';
  };

  const handleMouseOut = (e) => {
    e.target.getStage().container().style.cursor = 'default';
  };

  return (
    <RegularPolygon
      x={x}
      y={y}
      sides={5}
      radius={30}
      fill="red"
      stroke="black"
      strokeWidth={4}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    />
  );
};

const App = () => {
  const [cursor, setCursor] = useState('default');

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      style={{ cursor }}
    >
      <Layer>
        <SpecialPolygon
          x={80}
          y={window.innerHeight / 2}
        />
        <RegularPolygon
          x={180}
          y={window.innerHeight / 2}
          sides={5}
          radius={30}
          fill="green"
          stroke="black"
          strokeWidth={4}
          onMouseOver={() => setCursor('crosshair')}
          onMouseOut={() => setCursor('default')}
        />
        <RegularPolygon
          x={280}
          y={window.innerHeight / 2}
          sides={5}
          radius={30}
          fill="blue"
          stroke="black"
          strokeWidth={4}
          onMouseOver={() => setCursor('move')}
          onMouseOut={() => setCursor('default')}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 隐藏和显示

[文档](https://konva.zhcndoc.com/docs/styling/Hide_and_Show.html)

```react
import React, { useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';

function App() {
  const [visible, setVisible] = useState(true);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', zIndex: 1, padding: '10px' }}>
        <button onClick={() => setVisible(true)}>Show</button>
        <button onClick={() => setVisible(false)}>Hide</button>
      </div>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Rect
            x={window.innerWidth / 2 - 50}
            y={window.innerHeight / 2 - 25}
            width={100}
            height={50}
            fill="green"
            stroke="black"
            strokeWidth={4}
            visible={visible}
          />
        </Layer>
      </Stage>
    </div>
  );
}

export default App;
```

### 线条连接

[文档](https://konva.zhcndoc.com/docs/styling/Line_Join.html)

```react
import { Stage, Layer, RegularPolygon } from 'react-konva';
import { useState } from 'react';

const App = () => {
  const [lineJoin, setLineJoin] = useState('miter');

  const handleMouseEnter = () => {
    const lineJoins = ['miter', 'bevel', 'round'];
    const index = lineJoins.indexOf(lineJoin);
    const nextIndex = (index + 1) % lineJoins.length;
    setLineJoin(lineJoins[nextIndex]);
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <RegularPolygon
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          sides={3}
          radius={70}
          fill="#00D2FF"
          stroke="black"
          strokeWidth={20}
          lineJoin={lineJoin}
          onMouseEnter={handleMouseEnter}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 阴影

[文档](https://konva.zhcndoc.com/docs/styling/Shadow.html)

```react
import React from 'react';
import { Stage, Layer, Text, Line, Rect } from 'react-konva';

const App = () => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          text="Text Shadow!"
          fontFamily="Calibri"
          fontSize={40}
          x={20}
          y={20}
          stroke="red"
          strokeWidth={2}
          shadowColor="black"
          shadowBlur={0}
          shadowOffset={{ x: 10, y: 10 }}
          shadowOpacity={0.5}
        />
        <Line
          stroke="green"
          strokeWidth={10}
          lineJoin="round"
          lineCap="round"
          points={[50, 140, 250, 160]}
          shadowColor="black"
          shadowBlur={10}
          shadowOffset={{ x: 10, y: 10 }}
          shadowOpacity={0.5}
        />
        <Rect
          x={100}
          y={120}
          width={100}
          height={50}
          fill="#00D2FF"
          stroke="black"
          strokeWidth={4}
          shadowColor="black"
          shadowBlur={10}
          shadowOffset={{ x: 10, y: 10 }}
          shadowOpacity={0.5}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 透明度

[文档](https://konva.zhcndoc.com/docs/styling/Opacity.html)

```react
import React, { useState } from 'react';
import { Stage, Layer, RegularPolygon } from 'react-konva';

const App = () => {
  const [opacity, setOpacity] = useState(0.5);
  const [cursor, setCursor] = useState('default');

  const handleMouseEnter = () => {
    setOpacity(1);
    setCursor('pointer');
  };

  const handleMouseLeave = () => {
    setOpacity(0.5);
    setCursor('default');
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight} style={{ cursor: cursor }}>
      <Layer>
        <RegularPolygon
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          sides={5}
          radius={70}
          fill="red"
          stroke="black"
          strokeWidth={4}
          opacity={opacity}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 描边

[文档](https://konva.zhcndoc.com/docs/styling/Stroke.html)

```react
import React, { useState } from 'react';
import { Stage, Layer, RegularPolygon } from 'react-konva';

const App = () => {
  const [stroke, setStroke] = useState('black');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [cursor, setCursor] = useState('default');

  const handleMouseEnter = () => {
    setStroke('blue');
    setStrokeWidth(20);
    setCursor('pointer');
  };

  const handleMouseLeave = () => {
    setStroke('black');
    setStrokeWidth(4);
    setCursor('default');
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight} style={{ cursor: cursor }}>
      <Layer>
        <RegularPolygon
          x={window.innerWidth / 2}
          y={window.innerHeight / 2}
          sides={5}
          radius={70}
          fill="red"
          stroke={stroke}
          strokeWidth={strokeWidth}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 填充

[文档](https://konva.zhcndoc.com/docs/styling/Fill.html)

```react
import React from 'react';
import { Stage, Layer, RegularPolygon } from 'react-konva';
import useImage from 'use-image';

const commonProps = {
  sides: 5,
  radius: 70,
  stroke: 'black',
  strokeWidth: 4,
  draggable: true,
};

const ColorPolygon = () => {
  const [fill, setFill] = React.useState('red');
  return (
    <RegularPolygon
      {...commonProps}
      x={80}
      y={window.innerHeight / 2}
      fill={fill}
      onMouseEnter={(e) => {
        setFill('blue');
        e.target.getStage().container().style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        setFill('red');
        e.target.getStage().container().style.cursor = 'default';
      }}
    />
  );
};

const PatternPolygon = () => {
  const [darthVader] = useImage('https://konvajs.org/assets/darth-vader.jpg');
  const [yoda] = useImage('https://konvajs.org/assets/yoda.jpg');
  const [image, setImage] = React.useState(null);
  const [offset, setOffset] = React.useState({ x: -220, y: 70 });

  React.useEffect(() => {
    if (darthVader) {
      setImage(darthVader);
    }
  }, [darthVader]);

  return (
    <RegularPolygon
      {...commonProps}
      x={220}
      y={window.innerHeight / 2}
      fillPatternImage={image}
      fillPatternOffset={offset}
      onMouseEnter={(e) => {
        setImage(yoda);
        setOffset({ x: -100, y: 70 });
        e.target.getStage().container().style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        setImage(darthVader);
        setOffset({ x: -220, y: 70 });
        e.target.getStage().container().style.cursor = 'default';
      }}
    />
  );
};

const LinearGradientPolygon = () => {
  const [colorStops, setColorStops] = React.useState([0, 'red', 1, 'yellow']);
  return (
    <RegularPolygon
      {...commonProps}
      x={360}
      y={window.innerHeight / 2}
      fillLinearGradientStartPoint={{ x: -50, y: -50 }}
      fillLinearGradientEndPoint={{ x: 50, y: 50 }}
      fillLinearGradientColorStops={colorStops}
      onMouseEnter={(e) => {
        setColorStops([0, 'green', 1, 'yellow']);
        e.target.getStage().container().style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        setColorStops([0, 'red', 1, 'yellow']);
        e.target.getStage().container().style.cursor = 'default';
      }}
    />
  );
};

const RadialGradientPolygon = () => {
  const [colorStops, setColorStops] = React.useState([0, 'red', 0.5, 'yellow', 1, 'blue']);
  return (
    <RegularPolygon
      {...commonProps}
      x={500}
      y={window.innerHeight / 2}
      fillRadialGradientStartPoint={{ x: 0, y: 0 }}
      fillRadialGradientStartRadius={0}
      fillRadialGradientEndPoint={{ x: 0, y: 0 }}
      fillRadialGradientEndRadius={70}
      fillRadialGradientColorStops={colorStops}
      onMouseEnter={(e) => {
        setColorStops([0, 'red', 0.5, 'yellow', 1, 'green']);
        e.target.getStage().container().style.cursor = 'pointer';
      }}
      onMouseLeave={(e) => {
        setColorStops([0, 'red', 0.5, 'yellow', 1, 'blue']);
        e.target.getStage().container().style.cursor = 'default';
      }}
    />
  );
};

const App = () => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <ColorPolygon />
        <PatternPolygon />
        <LinearGradientPolygon />
        <RadialGradientPolygon />
      </Layer>
    </Stage>
  );
};

export default App;
```

### 蒙版

[文档](https://konva.zhcndoc.com/docs/filters/Mask.html)

```react
import { Stage, Layer, Image } from 'react-konva';
import { useState, useEffect, useRef } from 'react';
import useImage from 'use-image';

const App = () => {
  const [threshold, setThreshold] = useState(10);
  const [image] = useImage('https://konvajs.org/assets/space.jpg', 'anonymous');
  const imageRef = useRef(null);

  useEffect(() => {
    if (image) {
      imageRef.current.cache();
    }
  }, [image]);

  return (
    <>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Image
            ref={imageRef}
            x={50}
            y={50}
            image={image}
            draggable
            filters={[Konva.Filters.Mask]}
            threshold={threshold}
          />
        </Layer>
      </Stage>
      <input
        type="range"
        min="0"
        max="255"
        value={threshold}
        onChange={(e) => setThreshold(parseInt(e.target.value))}
        style={{ position: 'absolute', top: '20px', left: '20px' }}
      />
    </>
  );
};

export default App;
```

### 像素化

[文档](https://konva.zhcndoc.com/docs/filters/Pixelate.html)

```react
import { Stage, Layer, Image } from 'react-konva';
import { useState, useEffect, useRef } from 'react';
import useImage from 'use-image';

const App = () => {
  const [pixelSize, setPixelSize] = useState(8);
  const [image] = useImage('https://konvajs.org/assets/darth-vader.jpg', 'anonymous');
  const imageRef = useRef(null);

  useEffect(() => {
    if (image && imageRef.current) {
      imageRef.current.cache();
    }
  }, [image]);

  return (
    <>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Image
            ref={imageRef}
            x={50}
            y={50}
            image={image}
            draggable
            filters={[Konva.Filters.Pixelate]}
            pixelSize={pixelSize}
          />
        </Layer>
      </Stage>
      <input
        type="range"
        min="2"
        max="32"
        step="1"
        value={pixelSize}
        onChange={(e) => setPixelSize(parseInt(e.target.value))}
        style={{ position: 'absolute', top: '20px', left: '20px' }}
      />
    </>
  );
};

export default App;
```

### 噪声

[文档](https://konva.zhcndoc.com/docs/filters/Noise.html)

```react
import { Stage, Layer, Image } from 'react-konva';
import { useState, useEffect, useRef } from 'react';
import useImage from 'use-image';

const App = () => {
  const [noise, setNoise] = useState(0.5);
  const [image] = useImage('https://konvajs.org/assets/darth-vader.jpg', 'anonymous');
  const imageRef = useRef(null);

  useEffect(() => {
    if (image && imageRef.current) {
      imageRef.current.cache();
    }
  }, [image]);

  return (
    <>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Image
            ref={imageRef}
            x={50}
            y={50}
            image={image}
            draggable
            filters={[Konva.Filters.Noise]}
            noise={noise}
          />
        </Layer>
      </Stage>
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={noise}
        onChange={(e) => setNoise(parseFloat(e.target.value))}
        style={{ position: 'absolute', top: '20px', left: '20px' }}
      />
    </>
  );
};

export default App;
```

### 模糊

[文档](https://konva.zhcndoc.com/docs/filters/Blur.html)

```react
import { Stage, Layer, Image } from 'react-konva';
import { useState, useEffect, useRef } from 'react';
import useImage from 'use-image';

const App = () => {
  const [blurRadius, setBlurRadius] = useState(10);
  const [image] = useImage('https://konvajs.org/assets/darth-vader.jpg', 'anonymous');
  const imageRef = useRef(null);

  useEffect(() => {
    if (image && imageRef.current) {
      imageRef.current.cache();
    }
  }, [image]);

  return (
    <>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Image
            ref={imageRef}
            x={50}
            y={50}
            image={image}
            draggable
            filters={[Konva.Filters.Blur]}
            blurRadius={blurRadius}
          />
        </Layer>
      </Stage>
      <input
        type="range"
        min="0"
        max="40"
        value={blurRadius}
        onChange={(e) => setBlurRadius(parseInt(e.target.value))}
        style={{ position: 'absolute', top: '20px', left: '20px' }}
      />
    </>
  );
};

export default App;
```

### 裁剪图像

[文档](https://konva.zhcndoc.com/docs/sandbox/Canvas_Crop_Image.html)

```react
import { Stage, Layer, Image as KonvaImage, Rect, Transformer } from 'react-konva';
import { useRef, useState, useEffect } from 'react';

var App = function() {
  var stageRef = useRef(null);
  var cropRef = useRef(null);
  var trRef = useRef(null);
  var [imageObj, setImageObj] = useState(null);
  var [croppedSrc, setCroppedSrc] = useState(null);

  var width = window.innerWidth;
  var height = window.innerHeight;

  useEffect(function() {
    var img = new window.Image();
    img.onload = function() { setImageObj(img); };
    img.src = 'https://konvajs.org/assets/landscape.jpg';
  }, []);

  useEffect(function() {
    if (cropRef.current && trRef.current) {
      trRef.current.nodes([cropRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [imageObj]);

  var handleCrop = function() {
    if (!stageRef.current || !cropRef.current) return;
    var node = cropRef.current;
    var dataUrl = stageRef.current.toDataURL({
      x: node.x(),
      y: node.y(),
      width: node.width() * node.scaleX(),
      height: node.height() * node.scaleY(),
    });
    setCroppedSrc(dataUrl);
  };

  return (
    <div>
      <div style={{ marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={handleCrop} style={{ padding: '8px 16px', fontSize: '14px', background: '#0088ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>裁剪图像</button>
      </div>
      {croppedSrc && (
        <div style={{ marginBottom: '8px' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#666' }}>裁剪结果：</p>
          <img src={croppedSrc} style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: '4px' }} />
        </div>
      )}
      <Stage ref={stageRef} width={width} height={height}>
        <Layer>
          {imageObj && (
            <>
              <KonvaImage image={imageObj} width={width} height={height} />
              <Rect
                ref={cropRef}
                x={width * 0.15}
                y={height * 0.15}
                width={width * 0.35}
                height={height * 0.4}
                fill="rgba(0, 150, 255, 0.15)"
                stroke="#0088ff"
                strokeWidth={2}
                dash={[6, 3]}
                draggable={true}
              />
              <Transformer
                ref={trRef}
                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
                boundBoxFunc={function(oldBox, newBox) {
                  if (newBox.width < 20 || newBox.height < 20) return oldBox;
                  return newBox;
                }}
              />
            </>
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### 画布上下文菜单

[文档](https://konva.zhcndoc.com/docs/sandbox/Canvas_Context_Menu.html)

```react
import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Circle } from 'react-konva';

const App = () => {
  const [circles, setCircles] = useState([
    {
      id: 'initial-circle',
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      radius: 50,
      fill: 'red',
      shadowBlur: 10
    }
  ]);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showMenu, setShowMenu] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const stageRef = useRef(null);
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 创建和清理上下文菜单
  useEffect(() => {
    // 在窗口点击时隐藏菜单
    const handleWindowClick = () => {
      setShowMenu(false);
    };
    window.addEventListener('click', handleWindowClick);

    return () => {
      window.removeEventListener('click', handleWindowClick);
    };
  }, []);

  // 处理双击以创建新圆形
  const handleDblClick = (e) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const newCircle = {
      id: Date.now().toString(),
      x: pointerPosition.x,
      y: pointerPosition.y,
      radius: 10 + Math.random() * 30,
      fill: getRandomColor(),
      shadowBlur: 10
    };
    setCircles([...circles, newCircle]);
  };

  // 处理圆形的上下文菜单
  const handleContextMenu = (e) => {
    e.evt.preventDefault();
    if (e.target === e.target.getStage()) {
      return;
    }

    const stage = e.target.getStage();
    const containerRect = stage.container().getBoundingClientRect();
    const pointerPosition = stage.getPointerPosition();

    setMenuPosition({
      x: containerRect.left + pointerPosition.x + 4,
      y: containerRect.top + pointerPosition.y + 4
    });

    setShowMenu(true);
    setSelectedId(e.target.id());
    e.cancelBubble = true;
  };

  // 菜单动作处理器
  const handlePulse = () => {
    const newCircles = circles.map(circle => {
      if (circle.id === selectedId) {
        return {
          ...circle,
          scaleX: 2,
          scaleY: 2,
          animation: 'pulse'
        };
      }
      return circle;
    });
    setCircles(newCircles);

    // 动画后重置缩放
    setTimeout(() => {
      const resetCircles = circles.map(circle => {
        if (circle.id === selectedId) {
          return {
            ...circle,
            scaleX: 1,
            scaleY: 1,
            animation: null
          };
        }
        return circle;
      });
      setCircles(resetCircles);
    }, 300);
  };

  const handleDelete = () => {
    const newCircles = circles.filter(circle => circle.id !== selectedId);
    setCircles(newCircles);
    setShowMenu(false);
  };

  // 随机颜色的实用函数
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  return (
    <div style={{ position: 'relative' }}>
      <Stage
        width={width}
        height={height}
        onDblClick={handleDblClick}
        onContextMenu={handleContextMenu}
        ref={stageRef}
      >
        <Layer>
          {circles.map((circle) => (
            <Circle
              key={circle.id}
              id={circle.id}
              x={circle.x}
              y={circle.y}
              radius={circle.radius}
              fill={circle.fill}
              shadowBlur={circle.shadowBlur}
              scaleX={circle.scaleX || 1}
              scaleY={circle.scaleY || 1}
            />
          ))}
        </Layer>
      </Stage>

      {/* 上下文菜单 */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: menuPosition.y,
            left: menuPosition.x,
            width: '60px',
            backgroundColor: 'white',
            boxShadow: '0 0 5px grey',
            borderRadius: '3px',
            zIndex: 10
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            style={{
              width: '100%',
              backgroundColor: 'white',
              border: 'none',
              margin: 0,
              padding: '10px',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'lightgray'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
            onClick={handlePulse}
          >
            脉冲
          </button>
          <button
            style={{
              width: '100%',
              backgroundColor: 'white',
              border: 'none',
              margin: 0,
              padding: '10px',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = 'lightgray'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'white'}
            onClick={handleDelete}
          >
            删除
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
```

### 画布背景

[文档](https://konva.zhcndoc.com/docs/sandbox/Canvas_Background.html)

```react
import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Circle } from 'react-konva';

const App = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  const stageRef = useRef(null);
  const backgroundRef = useRef(null);

  // 组件挂载时设置 CSS 背景
  useEffect(() => {
    if (stageRef.current) {
      // 给舞台容器设置 CSS 背景
      const container = stageRef.current.container();
      container.style.backgroundColor = 'green';
    }
  }, []);

  // 拖动舞台时重置背景位置
  const handleDragMove = () => {
    if (backgroundRef.current) {
      backgroundRef.current.absolutePosition({ x: 0, y: 0 });
    }
  };

  return (
    <Stage
      width={width}
      height={height}
      draggable
      ref={stageRef}
      onDragMove={handleDragMove}
    >
      <Layer>
        {/* 渐变背景 */}
        <Rect
          ref={backgroundRef}
          x={0}
          y={0}
          width={width}
          height={height}
          fillLinearGradientStartPoint={{ x: 0, y: 0 }}
          fillLinearGradientEndPoint={{ x: width, y: height }}
          fillLinearGradientColorStops={[
            0, 'yellow',
            0.5, 'blue',
            0.6, 'rgba(0, 0, 0, 0)'
          ]}
          listening={false}
        />

        {/* 示例图形 */}
        <Circle
          x={width / 2}
          y={height / 2}
          radius={100}
          fill="red"
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

### Canvas Watermark

[文档](https://konva.zhcndoc.com/docs/sandbox/Canvas_Watermark.html)

```react
import { Stage, Layer, Image, Text, Group } from 'react-konva';
import { useState, useRef, useEffect } from 'react';

var App = function() {
  var stageRef = useRef(null);
  var [text, setText] = useState('SAMPLE');
  var [opacity, setOpacity] = useState(0.3);
  var [fontSize, setFontSize] = useState(28);
  var [image, setImage] = useState(null);

  var width = window.innerWidth;
  var height = window.innerHeight;

  useEffect(function() {
    var img = new window.Image();
    img.onload = function() { setImage(img); };
    img.src = 'https://konvajs.org/assets/landscape.jpg';
  }, []);

  var positions = [];
  for (var x = -width; x < width * 2; x += 180) {
    for (var y = -height; y < height * 2; y += 120) {
      positions.push({ x: x, y: y });
    }
  }

  var handleExport = function() {
    var link = document.createElement('a');
    link.href = stageRef.current.toDataURL({ pixelRatio: 2 });
    link.download = 'watermarked.png';
    link.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', font: '12px Arial,sans-serif' }}>
        <span>文本：</span>
        <input type="text" value={text} onChange={function(e) { setText(e.target.value); }} style={{ padding: '3px 5px', width: '90px', fontSize: '12px' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          不透明度：
          <input type="range" min="0.05" max="1" step="0.05" value={opacity} onChange={function(e) { setOpacity(parseFloat(e.target.value)); }} style={{ width: '70px' }} />
          <span style={{ minWidth: '24px' }}>{opacity.toFixed(2)}</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          大小：
          <input type="range" min="14" max="60" step="2" value={fontSize} onChange={function(e) { setFontSize(parseInt(e.target.value)); }} style={{ width: '70px' }} />
          <span style={{ minWidth: '20px' }}>{fontSize}</span>
        </label>
        <button onClick={handleExport} style={{ padding: '4px 10px', cursor: 'pointer', fontSize: '12px', background: '#333', color: 'white', border: 'none', borderRadius: '3px' }}>导出 PNG</button>
      </div>
      <Stage ref={stageRef} width={width} height={height}>
        <Layer>
          {image && <Image image={image} width={width} height={height} />}
          <Group>
            {positions.map(function(pos, i) {
              return <Text key={i} x={pos.x} y={pos.y} text={text} fontSize={fontSize} fontFamily="Arial" fill="white" opacity={opacity} rotation={-30} />;
            })}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### Canvas to PDF

[文档](https://konva.zhcndoc.com/docs/sandbox/Canvas_to_PDF.html)

```react
import { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Arrow, Image } from 'react-konva';
import useImage from 'use-image';

const App = () => {
  const stageRef = useRef(null);
  const [darthVaderImage] = useImage('https://konvajs.org/assets/darth-vader.jpg', 'anonymous');
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 动态加载 jsPDF 库
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/1.5.3/jspdf.debug.js';
    script.integrity = 'sha384-NaWTHo/8YCBYJ59830LTz/P4aQZK1sS0SneOgAvhsIl3zBu8r9RevNg5lHCHAuQ/';
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  // 处理 PDF 导出
  const handleExport = () => {
    if (stageRef.current && typeof window.jsPDF !== 'undefined') {
      const stage = stageRef.current;
      const pdf = new window.jsPDF('l', 'px', [width, height]);
      pdf.setTextColor('#000000');

      // 首先添加文本
      stage.find('Text').forEach((text) => {
        const size = text.fontSize() / 0.75; // 将像素转换为点
        pdf.setFontSize(size);
        pdf.text(text.text(), text.x(), text.y(), {
          baseline: 'top',
          angle: -text.getAbsoluteRotation(),
        });
      });

      // 然后在文本上绘制图像（使文本不可见）
      pdf.addImage(
        stage.toDataURL({ pixelRatio: 2 }),
        0,
        0,
        width,
        height
      );

      pdf.save('canvas.pdf');
    } else {
      console.error('jsPDF 库未加载或舞台不可用');
      alert('jsPDF 库未加载。在真实项目中，你需要将其包含进来。');
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        style={{ position: 'absolute', top: '5px', left: '5px', zIndex: 10 }}
        onClick={handleExport}
      >
        保存为 PDF
      </button>

      <Stage width={width} height={height} ref={stageRef}>
        <Layer>
          <Rect
            width={width}
            height={height}
            fill="rgba(200, 200, 200)"
          />

          <Text
            text="这是达斯·维达"
            x={15}
            y={40}
            rotation={-10}
            fontSize={18}
            filters={[Konva.Filters.Blur]}
            blurRadius={4}
          />

          <Arrow
            points={[70, 50, 100, 80, 150, 100, 190, 100]}
            tension={0.5}
            stroke="black"
            fill="black"
          />

          {darthVaderImage && (
            <Image
              image={darthVaderImage}
              x={200}
              y={50}
              scaleX={0.5}
              scaleY={0.5}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### 碰撞检测

[文档](https://konva.zhcndoc.com/docs/sandbox/Collision_Detection.html)

```react
import { Stage, Layer, Group, Rect } from 'react-konva';
import { useState } from 'react';

const createInitialShapes = () => {
  const shapes = [];
  for (let i = 0; i < 10; i++) {
    const width = 30 + Math.random() * 30;
    const height = 30 + Math.random() * 30;
    const rotation = 360 * Math.random();

    // 计算旋转矩形的边界框
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    // 计算矩形的角点
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height }
    ].map(point => ({
      x: point.x * cos - point.y * sin,
      y: point.x * sin + point.y * cos
    }));

    // 寻找边界框的尺寸
    const minX = Math.min(...corners.map(p => p.x));
    const maxX = Math.max(...corners.map(p => p.x));
    const minY = Math.min(...corners.map(p => p.y));
    const maxY = Math.max(...corners.map(p => p.y));

    shapes.push({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      rotation,
      width,
      height,
      fill: 'grey',
      box: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    });
  }
  return shapes;
};

const haveIntersection = (r1, r2) => {
  return !(
    r2.x > r1.x + r1.width ||
    r2.x + r2.width < r1.x ||
    r2.y > r1.y + r1.height ||
    r2.y + r2.height < r1.y
  );
};

const App = () => {
  const [shapes, setShapes] = useState(createInitialShapes());

  const handleDragMove = (e, id) => {
    const target = e.target;
    const targetRect = target.getClientRect();

    setShapes(shapes.map(shape => {
      if (shape.id === id) {
        return shape;
      }
      const shapeGroup = target.parent.parent.findOne(`#group-${shape.id}`);
      if (!shapeGroup) return shape;

      const isIntersecting = haveIntersection(
        shapeGroup.getClientRect(),
        targetRect
      );

      return {
        ...shape,
        fill: isIntersecting ? 'red' : 'grey'
      };
    }));
  };

  const handleDragEnd = (e, id) => {
    setShapes(shapes.map(shape =>
      shape.id === id
        ? { ...shape, x: e.target.x(), y: e.target.y() }
        : shape
    ));
  };

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        {shapes.map((shape) => (
          <Group
            key={shape.id}
            id={`group-${shape.id}`}
            x={shape.x}
            y={shape.y}
            draggable
            onDragMove={(e) => handleDragMove(e, shape.id)}
            onDragEnd={(e) => handleDragEnd(e, shape.id)}
          >
            <Rect
              width={shape.width}
              height={shape.height}
              fill={shape.fill}
              rotation={shape.rotation}
              name="fillShape"
            />
            <Rect
              x={shape.box.x}
              y={shape.box.y}
              width={shape.box.width}
              height={shape.box.height}
              stroke="red"
              strokeWidth={1}
            />
          </Group>
        ))}
      </Layer>
    </Stage>
  );
};

export default App;
```

### 流程图

[文档](https://konva.zhcndoc.com/docs/sandbox/Connected_Objects.html)

```react
import React, { useState, useCallback } from 'react';
import { Stage, Layer, Group, Rect, Text, Arrow } from 'react-konva';

var INITIAL_NODES = [
  { id: 'start', label: '开始', color: '#4CAF50', x: 100, y: 120 },
  { id: 'procA', label: '处理 A', color: '#2196F3', x: 300, y: 80 },
  { id: 'decide', label: '决策', color: '#FF9800', x: 500, y: 120 },
  { id: 'procB', label: '处理 B', color: '#2196F3', x: 300, y: 260 },
  { id: 'end', label: '结束', color: '#f44336', x: 500, y: 260 },
];

var CONNECTIONS = [
  { from: 'start', to: 'procA' },
  { from: 'procA', to: 'decide' },
  { from: 'decide', to: 'procB' },
  { from: 'decide', to: 'end' },
  { from: 'procB', to: 'end' },
];

function FlowNode({ id, label, color, x, y, onDragMove }) {
  return (
    <Group
      x={x}
      y={y}
      draggable
      onDragMove={function (e) {
        onDragMove(id, e.target.x(), e.target.y());
      }}
    >
      <Rect
        width={120}
        height={50}
        fill={color}
        cornerRadius={8}
        shadowColor="rgba(0,0,0,0.15)"
        shadowBlur={6}
        shadowOffsetY={2}
        offsetX={60}
        offsetY={25}
      />
      <Text
        text={label}
        fontSize={14}
        fontFamily="Arial"
        fill="#fff"
        width={120}
        height={50}
        align="center"
        verticalAlign="middle"
        offsetX={60}
        offsetY={25}
      />
    </Group>
  );
}

var App = function () {
  var [nodes, setNodes] = useState(INITIAL_NODES);
  var [connections, setConnections] = useState(CONNECTIONS);
  var [counter, setCounter] = useState(1);

  var handleDragMove = useCallback(function (id, x, y) {
    setNodes(function (prev) {
      return prev.map(function (n) {
        return n.id === id ? Object.assign({}, n, { x: x, y: y }) : n;
      });
    });
  }, []);

  var nodeMap = {};
  nodes.forEach(function (n) {
    nodeMap[n.id] = n;
  });

  var addNode = function () {
    var newId = 'new_' + counter;
    setCounter(counter + 1);
    setNodes(function (prev) {
      return prev.concat({
        id: newId,
        label: '新节点',
        color: '#2196F3',
        x: 100 + Math.random() * 400,
        y: 80 + Math.random() * 200,
      });
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', font: '13px Arial, sans-serif' }}>
        <button
          onClick={addNode}
          style={{ padding: '6px 14px', background: '#2196F3', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          + 添加节点
        </button>
        <span style={{ color: '#888', fontSize: 12 }}>拖动节点以重新定位。箭头会自动跟随。</span>
      </div>
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          {connections.map(function (c, i) {
            var fromNode = nodeMap[c.from];
            var toNode = nodeMap[c.to];
            if (!fromNode || !toNode) return null;
            return (
              <Arrow
                key={'arrow-' + i}
                points={[fromNode.x, fromNode.y, toNode.x, toNode.y]}
                pointerLength={10}
                pointerWidth={8}
                fill="#555"
                stroke="#555"
                strokeWidth={2}
                listening={false}
              />
            );
          })}
          {nodes.map(function (n) {
            return (
              <FlowNode
                key={n.id}
                id={n.id}
                label={n.label}
                color={n.color}
                x={n.x}
                y={n.y}
                onDragMove={handleDragMove}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
};

export default App;
```

### 可编辑文本

[文档](https://konva.zhcndoc.com/docs/sandbox/Editable_Text.html)

```react
import { Stage, Layer, Text, Transformer } from "react-konva";
import { Html } from "react-konva-utils";
import { useEffect, useRef, useState, useCallback } from "react";

const TextArea = ({ textNode, onClose, onChange }) => {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const stage = textNode.getStage();
    const textPosition = textNode.position();
    const stageBox = stage.container().getBoundingClientRect();
    const areaPosition = {
      x: textPosition.x,
      y: textPosition.y,
    };

    // 匹配文本节点的样式
    textarea.value = textNode.text();
    textarea.style.position = "absolute";
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.width = `${textNode.width() - textNode.padding() * 2}px`;
    textarea.style.height = `${
      textNode.height() - textNode.padding() * 2 + 5
    }px`;
    textarea.style.fontSize = `${textNode.fontSize()}px`;
    textarea.style.border = "none";
    textarea.style.padding = "0px";
    textarea.style.margin = "0px";
    textarea.style.overflow = "hidden";
    textarea.style.background = "none";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = textNode.lineHeight();
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.transformOrigin = "left top";
    textarea.style.textAlign = textNode.align();
    textarea.style.color = textNode.fill();

    const rotation = textNode.rotation();
    let transform = "";
    if (rotation) {
      transform += `rotateZ(${rotation}deg)`;
    }
    textarea.style.transform = transform;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + 3}px`;

    textarea.focus();

    const handleOutsideClick = (e) => {
      if (e.target !== textarea) {
        onChange(textarea.value);
        onClose();
      }
    };

    // 添加事件监听器
    const handleKeyDown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onChange(textarea.value);
        onClose();
      }
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handleInput = () => {
      const scale = textNode.getAbsoluteScale().x;
      textarea.style.width = `${textNode.width() * scale}px`;
      textarea.style.height = "auto";
      textarea.style.height = `${
        textarea.scrollHeight + textNode.fontSize()
      }px`;
    };

    textarea.addEventListener("keydown", handleKeyDown);
    textarea.addEventListener("input", handleInput);
    setTimeout(() => {
      window.addEventListener("click", handleOutsideClick);
    });

    return () => {
      textarea.removeEventListener("keydown", handleKeyDown);
      textarea.removeEventListener("input", handleInput);
      window.removeEventListener("click", handleOutsideClick);
    };
  }, [textNode, onChange, onClose]);

  return (
    <textarea
      ref={textareaRef}
      style={{
        minHeight: "1em",
        position: "absolute",
      }}
    />
  );
};

const TextEditor = (props) => {
  return (
    <Html>
      <TextArea {...props} />
    </Html>
  );
};

const EditableText = () => {
  const [text, setText] = useState("Some text here");
  const [isEditing, setIsEditing] = useState(false);
  const [textWidth, setTextWidth] = useState(200);
  const textRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (trRef.current && textRef.current) {
      trRef.current.nodes([textRef.current]);
    }
  }, [isEditing]);

  const handleTextDblClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleTextChange = useCallback((newText) => {
    setText(newText);
  }, []);

  const handleTransform = useCallback((e) => {
    const node = textRef.current;
    const scaleX = node.scaleX();
    const newWidth = node.width() * scaleX;
    setTextWidth(newWidth);
    node.setAttrs({
      width: newWidth,
      scaleX: 1,
    });
  }, []);

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text
          ref={textRef}
          text={text}
          x={50}
          y={80}
          fontSize={20}
          draggable
          width={textWidth}
          onDblClick={handleTextDblClick}
          onDblTap={handleTextDblClick}
          onTransform={handleTransform}
          visible={!isEditing}
        />
        {isEditing && (
          <TextEditor
            textNode={textRef.current}
            onChange={handleTextChange}
            onClose={() => setIsEditing(false)}
          />
        )}
        {!isEditing && (
          <Transformer
            ref={trRef}
            enabledAnchors={["middle-left", "middle-right"]}
            boundBoxFunc={(oldBox, newBox) => ({
              ...newBox,
              width: Math.max(30, newBox.width),
            })}
          />
        )}
      </Layer>
    </Stage>
  );
};

export default EditableText;
```

### 无限画布

[文档](https://konva.zhcndoc.com/docs/sandbox/Infinite_Canvas.html)

```react
import { Stage, Layer, Rect, Circle, Star } from 'react-konva';
import { useRef } from 'react';

var shapes = [
  { type: 'rect', x: 80, y: 60, width: 120, height: 80, fill: '#FF6B6B', rotation: 5 },
  { type: 'circle', x: 350, y: 120, radius: 50, fill: '#4ECDC4' },
  { type: 'rect', x: 600, y: -80, width: 90, height: 90, fill: '#45B7D1', rotation: -10 },
  { type: 'star', x: -150, y: 250, numPoints: 5, innerRadius: 20, outerRadius: 45, fill: '#FFE66D' },
  { type: 'circle', x: -400, y: -200, radius: 65, fill: '#DDA0DD' },
  { type: 'rect', x: 200, y: -350, width: 140, height: 60, fill: '#98D8C8', rotation: 15 },
  { type: 'star', x: 500, y: 300, numPoints: 6, innerRadius: 25, outerRadius: 55, fill: '#F7DC6F' },
  { type: 'circle', x: -300, y: 450, radius: 40, fill: '#82E0AA' },
  { type: 'rect', x: -550, y: 100, width: 100, height: 100, fill: '#F1948A', rotation: -20 },
  { type: 'star', x: 750, y: -250, numPoints: 5, innerRadius: 30, outerRadius: 60, fill: '#AED6F1' },
  { type: 'circle', x: 100, y: 550, radius: 55, fill: '#D2B4DE' },
];

// 预生成网格点
var gridDots = [];
var spacing = 40;
var range = 2000;
for (var gx = -range; gx <= range; gx += spacing) {
  for (var gy = -range; gy <= range; gy += spacing) {
    gridDots.push({ x: gx, y: gy });
  }
}

var App = function() {
  var stageRef = useRef(null);
  var W = window.innerWidth;
  var H = window.innerHeight;
  var scaleBy = 1.05;

  var handleWheel = function(e) {
    e.evt.preventDefault();
    var stage = stageRef.current;
    var oldScale = stage.scaleX();
    var pointer = stage.getPointerPosition();
    var mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    var direction = e.evt.deltaY > 0 ? -1 : 1;
    if (e.evt.ctrlKey) { direction = -direction; }
    var newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.1, Math.min(10, newScale));
    stage.scale({ x: newScale, y: newScale });
    stage.position({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  return (
    <Stage ref={stageRef} width={W} height={H} draggable onWheel={handleWheel}>
      <Layer>
        {gridDots.map(function(d, i) {
          return <Circle key={'g'+i} x={d.x} y={d.y} radius={1} fill="#ccc" listening={false} />;
        })}
        {shapes.map(function(s, i) {
          if (s.type === 'rect') return <Rect key={i} x={s.x} y={s.y} width={s.width} height={s.height} fill={s.fill} cornerRadius={8} rotation={s.rotation||0} draggable shadowColor="rgba(0,0,0,0.15)" shadowBlur={10} shadowOffsetY={4} />;
          if (s.type === 'circle') return <Circle key={i} x={s.x} y={s.y} radius={s.radius} fill={s.fill} draggable shadowColor="rgba(0,0,0,0.15)" shadowBlur={10} shadowOffsetY={4} />;
          return <Star key={i} x={s.x} y={s.y} numPoints={s.numPoints} innerRadius={s.innerRadius} outerRadius={s.outerRadius} fill={s.fill} draggable shadowColor="rgba(0,0,0,0.15)" shadowBlur={10} shadowOffsetY={4} />;
        })}
      </Layer>
    </Stage>
  );
};

export default App;
```

### 对象对齐

[文档](https://konva.zhcndoc.com/docs/sandbox/Objects_Snapping.html)

```react
import Konva from 'konva';

var width = window.innerWidth;
var height = window.innerHeight;
var GUIDELINE_OFFSET = 5;

var stage = new Konva.Stage({
  container: 'container',
  width: width,
  height: height,
});

var layer = new Konva.Layer();
stage.add(layer);

// 首先生成随机矩形
for (var i = 0; i < 5; i++) {
  layer.add(
    new Konva.Rect({
      x: Math.random() * stage.width(),
      y: Math.random() * stage.height(),
      width: 50 + Math.random() * 50,
      height: 50 + Math.random() * 50,
      fill: Konva.Util.getRandomColor(),
      rotation: Math.random() * 360,
      draggable: true,
      name: 'object',
    })
  );
}

// 我们可以在哪里对齐我们的对象？
function getLineGuideStops(skipShape) {
  // 我们可以对齐舞台边缘和舞台中心
  var vertical = [0, stage.width() / 2, stage.width()];
  var horizontal = [0, stage.height() / 2, stage.height()];

  // 我们还可以对齐画布上每个对象的边缘和中心
  stage.find('.object').forEach((guideItem) => {
    if (guideItem === skipShape) {
      return;
    }
    var box = guideItem.getClientRect();
    // 我们可以对齐形状的所有边缘
    vertical.push([box.x, box.x + box.width, box.x + box.width / 2]);
    horizontal.push([box.y, box.y + box.height, box.y + box.height / 2]);
  });
  return {
    vertical: vertical.flat(),
    horizontal: horizontal.flat(),
  };
}

// 对象的哪些点将触发对齐？
// 它可以仅仅是对象的中心
// 但是我们将启用所有边缘和中心
function getObjectSnappingEdges(node) {
  var box = node.getClientRect();
  var absPos = node.absolutePosition();

  return {
    vertical: [
      {
        guide: Math.round(box.x),
        offset: Math.round(absPos.x - box.x),
        snap: 'start',
      },
      {
        guide: Math.round(box.x + box.width / 2),
        offset: Math.round(absPos.x - box.x - box.width / 2),
        snap: 'center',
      },
      {
        guide: Math.round(box.x + box.width),
        offset: Math.round(absPos.x - box.x - box.width),
        snap: 'end',
      },
    ],
    horizontal: [
      {
        guide: Math.round(box.y),
        offset: Math.round(absPos.y - box.y),
        snap: 'start',
      },
      {
        guide: Math.round(box.y + box.height / 2),
        offset: Math.round(absPos.y - box.y - box.height / 2),
        snap: 'center',
      },
      {
        guide: Math.round(box.y + box.height),
        offset: Math.round(absPos.y - box.y - box.height),
        snap: 'end',
      },
    ],
  };
}

// 查找所有对齐的可能性
function getGuides(lineGuideStops, itemBounds) {
  var resultV = [];
  var resultH = [];

  lineGuideStops.vertical.forEach((lineGuide) => {
    itemBounds.vertical.forEach((itemBound) => {
      var diff = Math.abs(lineGuide - itemBound.guide);
      // 如果导线和对象对齐点之间的距离很近，我们可以考虑这次对齐
      if (diff < GUIDELINE_OFFSET) {
        resultV.push({
          lineGuide: lineGuide,
          diff: diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        });
      }
    });
  });

  lineGuideStops.horizontal.forEach((lineGuide) => {
    itemBounds.horizontal.forEach((itemBound) => {
      var diff = Math.abs(lineGuide - itemBound.guide);
      if (diff < GUIDELINE_OFFSET) {
        resultH.push({
          lineGuide: lineGuide,
          diff: diff,
          snap: itemBound.snap,
          offset: itemBound.offset,
        });
      }
    });
  });

  var guides = [];

  // 找到最近的对齐
  var minV = resultV.sort((a, b) => a.diff - b.diff)[0];
  var minH = resultH.sort((a, b) => a.diff - b.diff)[0];
  if (minV) {
    guides.push({
      lineGuide: minV.lineGuide,
      offset: minV.offset,
      orientation: 'V',
      snap: minV.snap,
    });
  }
  if (minH) {
    guides.push({
      lineGuide: minH.lineGuide,
      offset: minH.offset,
      orientation: 'H',
      snap: minH.snap,
    });
  }
  return guides;
}

function drawGuides(guides) {
  guides.forEach((lg) => {
    if (lg.orientation === 'H') {
      var line = new Konva.Line({
        points: [-6000, 0, 6000, 0],
        stroke: 'rgb(0, 161, 255)',
        strokeWidth: 1,
        name: 'guid-line',
        dash: [4, 6],
      });
      layer.add(line);
      line.absolutePosition({
        x: 0,
        y: lg.lineGuide,
      });
    } else if (lg.orientation === 'V') {
      var line = new Konva.Line({
        points: [0, -6000, 0, 6000],
        stroke: 'rgb(0, 161, 255)',
        strokeWidth: 1,
        name: 'guid-line',
        dash: [4, 6],
      });
      layer.add(line);
      line.absolutePosition({
        x: lg.lineGuide,
        y: 0,
      });
    }
  });
}

layer.on('dragmove', function (e) {
  // 清除屏幕上所有之前的线
  layer.find('.guid-line').forEach((l) => l.destroy());

  // 查找可能的对齐线
  var lineGuideStops = getLineGuideStops(e.target);
  // 查找当前对象的对齐点
  var itemBounds = getObjectSnappingEdges(e.target);

  // 现在查找我们可以将当前对象对齐的位置
  var guides = getGuides(lineGuideStops, itemBounds);

  // 如果没有对齐则不做任何操作
  if (!guides.length) {
    return;
  }

  drawGuides(guides);

  var absPos = e.target.absolutePosition();
  // 现在强制设置对象位置
  guides.forEach((lg) => {
    switch (lg.orientation) {
      case 'V': {
        absPos.x = lg.lineGuide + lg.offset;
        break;
      }
      case 'H': {
        absPos.y = lg.lineGuide + lg.offset;
        break;
      }
    }
  });
  e.target.absolutePosition(absPos);
});

layer.on('dragend', function (e) {
  // 清除屏幕上所有之前的线
  layer.find('.guid-line').forEach((l) => l.destroy());
});
```

### 相对于指针位置缩放

[文档](https://konva.zhcndoc.com/docs/sandbox/Zooming_Relative_To_Pointer.html)

```react
import { Stage, Layer, Circle } from 'react-konva';
import { useRef } from 'react';

const App = () => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const stageRef = useRef(null);

  const handleWheel = (e) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // 如何缩放？放大还是缩小？
    let direction = e.evt.deltaY > 0 ? 1 : -1;

    // 当我们在触控板上缩放时，e.evt.ctrlKey 为 true
    // 在这种情况下，反转方向
    if (e.evt.ctrlKey) {
      direction = -direction;
    }

    const scaleBy = 1.01;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
  };

  return (
    <Stage
      width={width}
      height={height}
      ref={stageRef}
      onWheel={handleWheel}
    >
      <Layer>
        <Circle
          x={width / 2}
          y={height / 2}
          radius={50}
          fill="green"
        />
      </Layer>
    </Stage>
  );
};

export default App;
```

###

[文档]()

```react

```
