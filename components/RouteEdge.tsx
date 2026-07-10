"use client";

import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow, useViewport, type EdgeProps } from "@xyflow/react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { RelationWaypoint } from "@/lib/types";

export type RouteEdgeData = {
  label: string;
  color: string;
  dimmed?: boolean;
  active?: boolean;
  editable?: boolean;
  waypoints?: RelationWaypoint[];
  onWaypointChange?: (edgeId: string, index: number, point: RelationWaypoint) => void;
  onWaypointDelete?: (edgeId: string, index: number) => void;
};

export function RouteEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  selected,
  data
}: EdgeProps) {
  const routeData = data as RouteEdgeData | undefined;
  const waypoints = routeData?.waypoints ?? [];
  const color = routeData?.color ?? "#24514a";
  const path = waypoints.length
    ? makePolylinePath([{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }])
    : getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 16 })[0];
  const labelPoint = waypoints.length ? getPathMidpoint([{ x: sourceX, y: sourceY }, ...waypoints, { x: targetX, y: targetY }]) : { x: (sourceX + targetX) / 2, y: (sourceY + targetY) / 2 };
  const isDimmed = Boolean(routeData?.dimmed);
  const isActive = Boolean(routeData?.active || selected);

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: color,
          strokeWidth: isActive ? 4 : 2.4,
          opacity: isDimmed ? 0.16 : 0.95
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan rounded border border-white/80 bg-paper px-2 py-1 text-[10px] font-black text-graphite shadow-sm"
          style={{
            opacity: isDimmed ? 0.36 : 0.96,
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)`,
            pointerEvents: "none"
          }}
        >
          {routeData?.label}
        </div>
        {routeData?.editable
          ? waypoints.map((point, index) => (
              <WaypointHandle
                key={`${id}-${index}`}
                edgeId={id}
                index={index}
                point={point}
                color={color}
                onChange={routeData.onWaypointChange}
                onDelete={routeData.onWaypointDelete}
              />
            ))
          : null}
      </EdgeLabelRenderer>
    </>
  );
}

function WaypointHandle({
  edgeId,
  index,
  point,
  color,
  onChange,
  onDelete
}: {
  edgeId: string;
  index: number;
  point: RelationWaypoint;
  color: string;
  onChange?: (edgeId: string, index: number, point: RelationWaypoint) => void;
  onDelete?: (edgeId: string, index: number) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  const { zoom } = useViewport();
  const handleSize = Math.min(160, Math.max(26, 30 / Math.max(zoom, 0.16)));

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const next = screenToFlowPosition({ x: moveEvent.clientX, y: moveEvent.clientY });
      onChange?.(edgeId, index, {
        x: Math.round(next.x / 10) * 10,
        y: Math.round(next.y / 10) * 10
      });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <button
      type="button"
      aria-label={`中継点${index + 1}をドラッグ`}
      title="ドラッグで線の通り道を調整 / ダブルクリックで削除"
      className="route-waypoint nodrag nopan rounded-full border-2 border-white shadow-soft outline-none ring-2 ring-ink/12"
      onPointerDown={startDrag}
      onDoubleClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete?.(edgeId, index);
      }}
      style={{
        backgroundColor: color,
        cursor: "grab",
        height: handleSize,
        position: "absolute",
        touchAction: "none",
        transform: `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`,
        pointerEvents: "all",
        width: handleSize
      }}
    />
  );
}

function makePolylinePath(points: RelationWaypoint[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function getPathMidpoint(points: RelationWaypoint[]) {
  const middleIndex = Math.floor(points.length / 2);
  if (points.length % 2 === 1) return points[middleIndex];
  return {
    x: (points[middleIndex - 1].x + points[middleIndex].x) / 2,
    y: (points[middleIndex - 1].y + points[middleIndex].y) / 2
  };
}
