import { forwardRef, useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, TextureLoader } from "three";

export const Wall = ({ position, is2D, scale = 10 }) => {
  if (!position || position.length < 2) {
    return null;
  }

  const [start, end] = position;
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const distance = Math.sqrt(
    Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2)
  );
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);

  const scaledX = midX / scale;
  const scaledY = midY / scale;
  const scaledWidth = distance / scale;
  const wallHeight = is2D ? 0.05 : 2.5;
  const wallThickness = is2D ? 0.05 : 0.2;
  const yPosition = is2D ? 0 : wallHeight / 2;

  return (
    <mesh position={[scaledX, yPosition, scaledY]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[scaledWidth, wallHeight, wallThickness]} />
      <meshStandardMaterial color={is2D ? "#222222" : "#f1f1f1"} />
    </mesh>
  );
};

export const Grid = ({ size }) => {
  const divisions = Math.max(32, Math.floor(size * 1.25));
  const ref = useRef();

  useEffect(() => {
    if (!ref.current) return;
    const mat = Array.isArray(ref.current.material)
      ? ref.current.material[0]
      : ref.current.material;
    mat.opacity = 0.45;
    mat.transparent = true;
    mat.depthWrite = false;
    mat.color = new Color("#9aa6c0");
  }, []);

  return (
    <gridHelper
      ref={ref}
      args={[size * 1.5, divisions]}
      position={[25, 0.02, 25]}
      renderOrder={1}
    />
  );
};

export const Door = ({ bbox, is2D, scale = 10 }) => {
  if (!bbox || bbox.length < 4) {
    return null;
  }

  const centerX = (bbox[0][0] + bbox[1][0] + bbox[2][0] + bbox[3][0]) / 4;
  const centerY = (bbox[0][1] + bbox[1][1] + bbox[2][1] + bbox[3][1]) / 4;

  const width = Math.sqrt(
    Math.pow(bbox[1][0] - bbox[0][0], 2) + Math.pow(bbox[1][1] - bbox[0][1], 2)
  );
  const height = Math.sqrt(
    Math.pow(bbox[3][0] - bbox[0][0], 2) + Math.pow(bbox[3][1] - bbox[0][1], 2)
  );

  const isHorizontal = width > height;
  const doorWidth = isHorizontal ? width : height;
  const angle = isHorizontal
    ? Math.atan2(bbox[1][1] - bbox[0][1], bbox[1][0] - bbox[0][0])
    : Math.atan2(bbox[3][1] - bbox[0][1], bbox[3][0] - bbox[0][0]);

  const scaledX = centerX / scale;
  const scaledY = centerY / scale;
  const scaledWidth = doorWidth / scale;
  const yPosition = is2D ? 0 : 1;
  const depth = is2D ? 0.12 : 0.28; // чуть глубже стен

  return (
    <mesh position={[scaledX, yPosition, scaledY]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[scaledWidth, is2D ? 0.05 : 2, depth]} />
      <meshStandardMaterial color={is2D ? "#c57915" : "#8b5a2b"} />
    </mesh>
  );
};

export const Room = ({ points, scale = 10 }) => {
  if (!points || points.length < 3) {
    return null;
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) / scale;
  const maxX = Math.max(...xs) / scale;
  const minY = Math.min(...ys) / scale;
  const maxY = Math.max(...ys) / scale;

  const width = Math.max(0.25, maxX - minX);
  const height = Math.max(0.25, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return (
    <mesh position={[centerX, 0.001, centerY]}>
      <boxGeometry args={[width, 0.01, height]} />
      <meshStandardMaterial color="#d3c2a3" />
    </mesh>
  );
};

export const FurnitureItem = ({
  item,
  is2D,
  ghost = false,
  isHovered = false,
  isSelected = false,
  onHover,
  onOut,
  onPick,
}) => {
  const [width = 1, height = 1, depth = 1] = item.size || [];
  const yPosition = is2D ? 0.02 : height / 2;
  const baseColor = item.color || "#999999";
  const texture = useMemo(() => {
    if (!item.texture) return null;
    const loader = new TextureLoader();
    return loader.load(item.texture);
  }, [item.texture]);

  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texture]);
  const displayColor = ghost
    ? baseColor
    : isSelected
    ? "#7ad6ff"
    : isHovered
    ? "#ffd35c"
    : baseColor;

  return (
    <mesh
      position={[item.position[0], yPosition, item.position[1]]}
      rotation={[0, item.rotation || 0, 0]}
      castShadow={!ghost}
      receiveShadow={!ghost}
      onPointerEnter={(e) => {
        if (ghost) return;
        e.stopPropagation();
        onHover?.();
      }}
      onPointerLeave={(e) => {
        if (ghost) return;
        e.stopPropagation();
        onOut?.();
      }}
      onClick={(e) => {
        if (ghost) return;
        e.stopPropagation();
      onPick?.();
    }}
  >
    <boxGeometry args={[width, is2D ? 0.05 : height, depth]} />
    <meshStandardMaterial
      color={texture ? "#ffffff" : displayColor}
      map={texture || null}
      transparent={ghost}
      opacity={ghost ? 0.5 : 1}
    />
  </mesh>
);
};

export const Ground = forwardRef(({ size, onClick, is2D }, ref) => (
  <mesh
    rotation={[-Math.PI / 2, 0, 0]}
    position={[25, 0, 25]}
    onClick={onClick}
    receiveShadow
    ref={ref}
  >
    <planeGeometry args={[size * 1.5, size * 1.5]} />
    <meshStandardMaterial
      color={is2D ? "#fafafa" : "#f1f3f8"}
      side={DoubleSide}
    />
  </mesh>
));
