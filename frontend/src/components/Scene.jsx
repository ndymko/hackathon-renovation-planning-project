import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PointerLockControls } from "@react-three/drei";
import { Raycaster, Vector3 } from "three";
import { Door, FurnitureItem, Grid, Ground, Room, Wall } from "./props/elements.jsx";
import styles from "./Scene.module.css";

const SCALE = 10;
const WALL_THICKNESS = 0.2;
const SNAP_RANGE = 0.6;
const SCENE_OFFSET = { x: 0, z: 0 };

const normalizePlan = (plan) => {
  const walls = Array.isArray(plan?.walls) ? plan.walls : [];
  const doors = Array.isArray(plan?.doors) ? plan.doors : [];
  const rooms = Array.isArray(plan?.rooms) ? plan.rooms : [];

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const track = (pt) => {
    if (!pt || pt.length < 2) return;
    minX = Math.min(minX, pt[0]);
    maxX = Math.max(maxX, pt[0]);
    minY = Math.min(minY, pt[1]);
    maxY = Math.max(maxY, pt[1]);
  };

  walls.forEach((wall) => wall.position?.forEach(track));
  doors.forEach((door) => door.bbox?.forEach(track));
  rooms.forEach(
    (room) => Array.isArray(room) && room.forEach((p) => track([p.x, p.y]))
  );

  if (minX === Infinity) {
    minX = maxX = minY = maxY = 0;
  }

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const spanX = (maxX - minX) / SCALE;
  const spanZ = (maxY - minY) / SCALE;

  return {
    walls,
    doors,
    rooms,
    shift: { x: -centerX / SCALE, z: -centerY / SCALE },
    span: {
      x: Math.max(spanX, 20),
      z: Math.max(spanZ, 20),
    },
  };
};

const CameraRig = ({ viewMode, firstPerson }) => {
  const { camera } = useThree();

  useEffect(() => {
    if (firstPerson) {
      camera.position.set(0, 1.6, 6);
      return;
    }

    if (viewMode === "2d") {
      camera.position.set(0, 40, 0.001);
      camera.up.set(0, 0, -1);
      camera.lookAt(0, 0, 0);
      return;
    }

    camera.position.set(12, 12, 14);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
  }, [camera, firstPerson, viewMode]);

  return null;
};

const FirstPersonController = ({ enabled, speed = 8 }) => {
  const { camera } = useThree();
  const movement = useRef({
    forward: false,
    back: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === "KeyW" || event.code === "ArrowUp")
        movement.current.forward = true;
      if (event.code === "KeyS" || event.code === "ArrowDown")
        movement.current.back = true;
      if (event.code === "KeyA" || event.code === "ArrowLeft")
        movement.current.left = true;
      if (event.code === "KeyD" || event.code === "ArrowRight")
        movement.current.right = true;
    };

    const onKeyUp = (event) => {
      if (event.code === "KeyW" || event.code === "ArrowUp")
        movement.current.forward = false;
      if (event.code === "KeyS" || event.code === "ArrowDown")
        movement.current.back = false;
      if (event.code === "KeyA" || event.code === "ArrowLeft")
        movement.current.left = false;
      if (event.code === "KeyD" || event.code === "ArrowRight")
        movement.current.right = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!enabled) return;
    const direction = new Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    direction.normalize();

    const right = new Vector3().crossVectors(direction, new Vector3(0, 1, 0));
    const velocity = new Vector3();

    if (movement.current.forward) velocity.add(direction);
    if (movement.current.back) velocity.sub(direction);
    if (movement.current.right) velocity.add(right);
    if (movement.current.left) velocity.sub(right);

    if (velocity.lengthSq() > 0) {
      velocity.normalize().multiplyScalar(speed * delta);
      camera.position.add(velocity);
    }
  });

  return enabled ? <PointerLockControls selector="#plan-viewer" /> : null;
};

const SceneContent = ({
  normalized,
  viewMode,
  firstPerson,
  catalogSelection,
  onPlaceItem,
  onPlaced,
  items,
  pendingDrop,
  onDropConsumed,
  previewDrop,
  selectedItemId,
  onStartMoveItem,
}) => {
  const { walls, doors, rooms, shift, span } = normalized;
  const padding = 6;
  const groundHalf = Math.max(span.x, span.z) / 2 + padding;
  const groundSize = groundHalf * 2;
  const is2D = viewMode === "2d";
  const groundRef = useRef();
  const [ghostPoint, setGhostPoint] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const { camera } = useThree();

  const wallSegments = useMemo(
    () =>
      walls
        .filter((w) => Array.isArray(w.position) && w.position.length >= 2)
        .map((w) => ({
          a: {
            x: w.position[0][0] / SCALE,
            z: w.position[0][1] / SCALE,
          },
          b: {
            x: w.position[1][0] / SCALE,
            z: w.position[1][1] / SCALE,
          },
        })),
    [walls]
  );

  const projectToSegment = (px, pz, a, b) => {
    const abx = b.x - a.x;
    const abz = b.z - a.z;
    const apx = px - a.x;
    const apz = pz - a.z;
    const ab2 = abx * abx + abz * abz || 1;
    const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / ab2));
    const projX = a.x + abx * t;
    const projZ = a.z + abz * t;
    const dx = px - projX;
    const dz = pz - projZ;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return { projX, projZ, dist, t, dirX: dx, dirZ: dz, abx, abz };
  };

  const clampToWalls = (px, pz, item) => {
    const depth = item.size?.[2] || 1;
    const margin = depth / 2 + WALL_THICKNESS / 2 + 0.05;
    let best = { x: px, z: pz, snapped: false, dist: Infinity };

    wallSegments.forEach(({ a, b }) => {
      const res = projectToSegment(px, pz, a, b);
      if (res.dist > margin && res.dist > SNAP_RANGE) return;

      const normalCandidate = {
        x: -res.abz,
        z: res.abx,
      };

      let nx = normalCandidate.x;
      let nz = normalCandidate.z;
      const len = Math.sqrt(nx * nx + nz * nz) || 1;
      nx /= len;
      nz /= len;

      const dot = res.dirX * nx + res.dirZ * nz;
      if (dot < 0) {
        nx = -nx;
        nz = -nz;
      }

      const snapDistance =
        res.dist < SNAP_RANGE
          ? margin - res.dist + 0.02
          : Math.max(margin - res.dist, 0);

      if (snapDistance > 0) {
        const candidateX = px + nx * snapDistance;
        const candidateZ = pz + nz * snapDistance;
        const isCloser = res.dist < best.dist;
        if (isCloser) {
          best = {
            x: candidateX,
            z: candidateZ,
            snapped: res.dist < SNAP_RANGE,
            dist: res.dist,
          };
        }
      }
    });

    return { x: best.x, z: best.z, snapped: best.snapped };
  };

  const placeWithConstraints = (point, item) => {
    const clamped = clampToWalls(point.x, point.z, item);
    return {
      x: clamped.x,
      z: clamped.z,
      snapped: clamped.snapped,
    };
  };

  const handleGroundClick = (event) => {
    if (!catalogSelection || !onPlaceItem) return;
    event.stopPropagation();
    const x = event.point.x - shift.x - SCENE_OFFSET.x;
    const z = event.point.z - shift.z - SCENE_OFFSET.z;
    const adjusted = placeWithConstraints({ x, z }, catalogSelection);

    onPlaceItem({
      id: `${catalogSelection.id}-${Date.now()}`,
      name: catalogSelection.name,
      color: catalogSelection.color,
      size: catalogSelection.size,
      rotation: catalogSelection.rotation ?? 0,
      texture: catalogSelection.texture || null,
      position: [adjusted.x, adjusted.z],
    });
    if (onPlaced) onPlaced();
  };

  useEffect(() => {
    if (!pendingDrop || !pendingDrop.item || !groundRef.current) return;
    const [x, y] = pendingDrop.ndc;
    const raycaster = new Raycaster();
    raycaster.setFromCamera({ x, y }, camera);
    const hit = raycaster.intersectObject(groundRef.current);

    if (hit.length && onPlaceItem) {
      const point = hit[0].point;
      const adjusted = placeWithConstraints(
        {
          x: point.x - shift.x - SCENE_OFFSET.x,
          z: point.z - shift.z - SCENE_OFFSET.z,
        },
        pendingDrop.item
      );
      onPlaceItem({
        id: `${pendingDrop.item.id}-${Date.now()}`,
        name: pendingDrop.item.name,
        color: pendingDrop.item.color,
        size: pendingDrop.item.size,
        rotation: pendingDrop.item.rotation ?? 0,
        texture: pendingDrop.item.texture || null,
        position: [adjusted.x, adjusted.z],
      });
      if (onPlaced) onPlaced();
    }

    if (onDropConsumed) {
      onDropConsumed();
    }
  }, [pendingDrop, camera, onPlaceItem, onDropConsumed, shift.x, shift.z]);

  useEffect(() => {
    if (!previewDrop || !previewDrop.item || !groundRef.current) {
      setGhostPoint(null);
      return;
    }
    const [x, y] = previewDrop.ndc;
    const raycaster = new Raycaster();
    raycaster.setFromCamera({ x, y }, camera);
    const hit = raycaster.intersectObject(groundRef.current);
    if (hit.length) {
      const point = hit[0].point;
      const adjusted = placeWithConstraints(
        {
          x: point.x - shift.x - SCENE_OFFSET.x,
          z: point.z - shift.z - SCENE_OFFSET.z,
        },
        previewDrop.item
      );
      setGhostPoint({
        item: previewDrop.item,
        position: [adjusted.x, adjusted.z],
      });
    } else {
      setGhostPoint(null);
    }
  }, [previewDrop, camera, shift.x, shift.z]);

  return (
    <>
      <color attach="background" args={["#eef0f7"]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[8, 15, 5]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <CameraRig viewMode={viewMode} firstPerson={firstPerson} />
      {!firstPerson && (
        <OrbitControls
          enableRotate={!is2D}
          maxPolarAngle={is2D ? Math.PI / 2 : Math.PI}
          minPolarAngle={is2D ? Math.PI / 2 : 0}
          enablePan
          enableZoom
        />
      )}
      <FirstPersonController enabled={firstPerson} />

      <group position={[shift.x + SCENE_OFFSET.x, 0, shift.z + SCENE_OFFSET.z]}>
        <Ground
          size={groundSize}
          onClick={handleGroundClick}
          is2D={is2D}
          ref={groundRef}
        />
        <Grid size={groundSize} />

        {walls.map((wall, index) => (
          <Wall
            key={`wall-${index}`}
            position={wall.position}
            is2D={is2D}
            scale={SCALE}
          />
        ))}

        {doors.map((door, index) => (
          <Door
            key={`door-${index}`}
            bbox={door.bbox}
            is2D={is2D}
            scale={SCALE}
          />
        ))}

        {rooms.map((room, index) => (
          <Room key={`room-${index}`} points={room} scale={SCALE} />
        ))}

        {items?.map((item) => (
          <FurnitureItem
            key={item.id}
            item={item}
            is2D={is2D}
            isHovered={hoverId === item.id}
            isSelected={selectedItemId === item.id}
            onHover={() => setHoverId(item.id)}
            onOut={() =>
              setHoverId((prev) => (prev === item.id ? null : prev))
            }
            onPick={() => onStartMoveItem?.(item)}
          />
        ))}

        {ghostPoint && (
          <FurnitureItem
            key="ghost"
            item={{ ...ghostPoint.item, position: ghostPoint.position }}
            is2D={is2D}
            ghost
          />
        )}
      </group>
    </>
  );
};

export default function Scene(props) {
  const normalized = useMemo(
    () => normalizePlan(props.planData),
    [props.planData]
  );

  return (
    <div className={styles.sceneContainer}>
      <Canvas
        id="plan-viewer"
        shadows
        camera={{ position: [0, 12, 16], fov: 60, near: 0.1, far: 500 }}
      >
        <SceneContent {...props} normalized={normalized} />
      </Canvas>
    </div>
  );
}
