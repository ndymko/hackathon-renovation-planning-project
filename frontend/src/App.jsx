import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Scene from "./components/Scene.jsx";
import styles from "./App.module.css";
import planTemplate from "./planer.json";
import ChatPage from "./pages/Chat.jsx";
import { sendPlanJson } from "./App_services";
import { useLocation } from "react-router-dom";

const SCALE = 10;

const catalog = [
  { id: "chair", name: "Стул", size: [0.6, 0.9, 0.6], color: "#f7a600" },
  { id: "table", name: "Стол", size: [1.4, 0.75, 0.8], color: "#8b6c4c" },
  { id: "sofa", name: "Диван", size: [2.2, 0.9, 0.9], color: "#4b6cb7" },
  { id: "bed", name: "Кровать", size: [2.0, 0.7, 1.6], color: "#c35c5c" },
  { id: "wardrobe", name: "Шкаф", size: [1.2, 2.3, 0.7], color: "#7d5a4f" },
];

const convertItemsFromPlan = (items = []) =>
  items.map((item, idx) => ({
    id: item.id || `json-item-${idx}`,
    name: item.name || item.type || "Предмет",
    color: item.color || "#b6bdc6",
    size: item.size || [1, 1, 1],
    rotation: item.rotation || 0,
    texture: item.texture || null,
    position: Array.isArray(item.position)
      ? [item.position[0] / SCALE, item.position[1] / SCALE]
      : [0, 0],
  }));

function PlannerPage() {
  const location = useLocation();
  const initialPlanData = location.state?.planData || planTemplate;
  const [planJson, setPlanJson] = useState(() =>
    JSON.stringify(initialPlanData, null, 2)
  );
  const [planData, setPlanData] = useState(initialPlanData);
  const [items, setItems] = useState(
    convertItemsFromPlan(initialPlanData.items)
  );
  const [viewMode, setViewMode] = useState("3d");
  const [firstPerson, setFirstPerson] = useState(false);
  const [catalogSelection, setCatalogSelection] = useState(null);
  const [placementRotation, setPlacementRotation] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [textureUrl, setTextureUrl] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const textureInputRef = useRef(null);
  const [draggingItem, setDraggingItem] = useState(null);
  const [pendingDrop, setPendingDrop] = useState(null);
  const [previewDrop, setPreviewDrop] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    setItems(convertItemsFromPlan(planData.items));
  }, [planData]);

  useEffect(() => {
    const incomingPlan = location.state?.planData;
    if (!incomingPlan) return;
    setPlanData(incomingPlan);
    setPlanJson(JSON.stringify(incomingPlan, null, 2));
  }, [location.state]);

  useEffect(() => {
    if (viewMode === "2d" && firstPerson) {
      setFirstPerson(false);
    }
  }, [firstPerson, viewMode]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (["INPUT", "TEXTAREA"].includes(event.target.tagName)) return;
      if (event.key === "q" || event.key === "Q") {
        setPlacementRotation((prev) => prev - Math.PI / 12);
      }
      if (event.key === "e" || event.key === "E") {
        setPlacementRotation((prev) => prev + Math.PI / 12);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const planStats = useMemo(() => {
    const roomsCount = Array.isArray(planData?.rooms)
      ? planData.rooms.length
      : 0;
    const wallsCount = Array.isArray(planData?.walls)
      ? planData.walls.length
      : 0;
    return `${roomsCount} помещений · ${wallsCount} стен`;
  }, [planData]);

  const loadFromJson = () => {
    try {
      sendPlanJson(planJson);
      const parsed = JSON.parse(planJson);
      setPlanData(parsed);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const onPlaceItem = (item) => {
    setItems((prev) => [...prev, item]);
  };

  const handleTextureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setTextureUrl(url);
    setCatalogSelection((prev) => (prev ? { ...prev, texture: url } : prev));
    setDraggingItem((prev) => (prev ? { ...prev, texture: url } : prev));
    if (selectedItemId) {
      setItems((prev) =>
        prev.map((i) => (i.id === selectedItemId ? { ...i, texture: url } : i))
      );
    }
    event.target.value = "";
  };

  const resetPlacement = () => {
    setCatalogSelection(null);
    setDraggingItem(null);
    setPreviewDrop(null);
    setPlacementRotation(0);
    setSelectedItemId(null);
  };

  const finalizePlacement = () => {
    setCatalogSelection(null);
    setDraggingItem(null);
    setPreviewDrop(null);
    setSelectedItemId(null);
  };

  const onDragStart = (item) => {
    setCatalogSelection(item);
    setDraggingItem(item);
  };

  const onDragEnd = () => {
    setDraggingItem(null);
    setPreviewDrop(null);
  };

  const onDropOnCanvas = (event) => {
    event.preventDefault();
    const activeItem = draggingItem || catalogSelection;
    if (!activeItem) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    setPendingDrop({
      item: {
        ...activeItem,
        rotation: placementRotation,
        texture: textureUrl || activeItem.texture || null,
      },
      ndc: [ndcX, ndcY],
    });
    setPreviewDrop(null);
  };

  const rotateLeft = () => setPlacementRotation((prev) => prev - Math.PI / 12);
  const rotateRight = () => setPlacementRotation((prev) => prev + Math.PI / 12);
  const resetRotation = () => setPlacementRotation(0);
  const rotationDegrees = Math.round((placementRotation * 180) / Math.PI);

  const onDropConsumed = () => {
    setPendingDrop(null);
    finalizePlacement();
  };

  const onStartMoveItem = (item) => {
    setSelectedItemId(item.id);
    setPlacementRotation(item.rotation || 0);
    setCatalogSelection(item);
    setDraggingItem(item);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  return (
    <div className={styles.app}>
      <aside className={styles.sidebar}>
        <button
          className={styles.alertButton}
          type="button"
          onClick={() => setShowAlert((prev) => !prev)}
        >
          !
        </button>
        {showAlert && (
          <div className={styles.alertPanel}>Нарушение-1: 321321321</div>
        )}
        <header className={styles.header}>
          <p className={styles.kicker}>Автогенерация из JSON</p>
          <h1>2D / 3D редактор помещения</h1>
          <p className={styles.meta}>
            {planStats} · вид сверху / от пола · добавление мебели из каталога.
          </p>
        </header>

        <div className={styles.controls}>
          <div className={styles.controlRow}>
            <span className={styles.label}>Текстура для мебели</span>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => textureInputRef.current?.click()}
              >
                Выбрать PNG/JPG
              </button>
              <input
                ref={textureInputRef}
                type="file"
                accept="image/png,image/jpeg"
                className={styles.fileInput}
                onChange={handleTextureChange}
              />
              {textureUrl && (
                <span className={styles.helper}>Текстура выбрана</span>
              )}
            </div>
          </div>
          <div className={styles.controlRow}>
            <span className={styles.label}>Режим обзора</span>
            <div className={styles.segmented}>
              <button
                className={`${styles.segment} ${
                  viewMode === "2d" ? styles.active : ""
                }`}
                onClick={() => setViewMode("2d")}
              >
                2D план
              </button>
              <button
                className={`${styles.segment} ${
                  viewMode === "3d" ? styles.active : ""
                }`}
                onClick={() => setViewMode("3d")}
              >
                3D вид
              </button>
            </div>
          </div>

          <div className={styles.controlRow}>
            <span className={styles.label}>Вид от 1-го лица</span>
            <button
              className={`${styles.primaryButton} ${
                firstPerson ? styles.active : ""
              }`}
              onClick={() => setFirstPerson((prev) => !prev)}
              disabled={viewMode === "2d"}
            >
              {firstPerson ? "Выключить" : "Зайти внутрь"}
            </button>
            <p className={styles.helper}>
              Кликните по сцене для захвата курсора, передвижение WASD/стрелки.
            </p>
          </div>

          <div className={styles.controlRow}>
            <span className={styles.label}>Поворот предмета</span>
            <div className={styles.rotateControls}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={rotateLeft}
              >
                -15°
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={rotateRight}
              >
                +15°
              </button>
              <span className={styles.rotationValue}>{rotationDegrees}°</span>
              <button
                type="button"
                className={styles.linkButton}
                onClick={resetRotation}
              >
                Сброс
              </button>
            </div>
          </div>

          <div className={styles.controlRow}>
            <span className={styles.label}>Каталог</span>
            <div className={styles.catalogList}>
              {catalog.map((item) => (
                <button
                  key={item.id}
                  className={`${styles.catalogCard} ${
                    catalogSelection?.id === item.id ? styles.active : ""
                  }`}
                  onClick={() => setCatalogSelection(item)}
                  draggable
                  onDragStart={() => onDragStart(item)}
                  onDragEnd={onDragEnd}
                >
                  <span className={styles.catalogName}>{item.name}</span>
                  <span className={styles.catalogMeta}>
                    {item.size.join("m · ")}m
                  </span>
                  <span className={styles.catalogHint}>
                    Перетащите на сцену
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.helper}>
              {catalogSelection
                ? `Выбрано: ${catalogSelection.name}. Наведите курсор на сцену — увидите превью, клик или дроп поставит предмет.`
                : "Выберите предмет, наведите на сцену и поставьте кликом/дропом."}
              {catalogSelection && (
                <button
                  className={styles.linkButton}
                  type="button"
                  onClick={resetPlacement}
                >
                  Сбросить выбор
                </button>
              )}
            </div>
          </div>

          <div className={styles.controlRow}>
            <span className={styles.label}>JSON плана</span>
            <textarea
              className={styles.textarea}
              value={planJson}
              onChange={(e) => setPlanJson(e.target.value)}
              spellCheck={false}
            />
            <div className={styles.actions}>
              <button className={styles.primaryButton} onClick={loadFromJson}>
                Обновить сцену из JSON
              </button>
              {loadError && (
                <span className={styles.error}>Ошибка: {loadError}</span>
              )}
            </div>
          </div>
        </div>
      </aside>

      <main
        className={styles.canvasWrap}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
        onDragLeave={() => setPreviewDrop(null)}
        onMouseMove={(event) => {
          const activeItem = draggingItem || catalogSelection;
          if (!activeItem) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
          setPreviewDrop({
            item: {
              ...activeItem,
              rotation: placementRotation,
              texture: textureUrl || activeItem.texture || null,
            },
            ndc: [ndcX, ndcY],
          });
        }}
        onMouseLeave={() => setPreviewDrop(null)}
        onDrop={onDropOnCanvas}
      >
        <Scene
          planData={planData}
          viewMode={viewMode}
          firstPerson={firstPerson}
          catalogSelection={
            catalogSelection
              ? {
                  ...catalogSelection,
                  rotation: placementRotation,
                  texture: textureUrl || catalogSelection.texture || null,
                }
              : null
          }
          onPlaceItem={onPlaceItem}
          onPlaced={finalizePlacement}
          items={items}
          pendingDrop={pendingDrop}
          onDropConsumed={onDropConsumed}
          previewDrop={previewDrop}
          selectedItemId={selectedItemId}
          onStartMoveItem={onStartMoveItem}
        />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlannerPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  );
}
