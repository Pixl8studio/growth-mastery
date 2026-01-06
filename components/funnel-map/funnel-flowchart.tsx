"use client";

/**
 * Funnel Flowchart Component
 * Visual flowchart for the Step 2 Funnel Co-Creation Experience
 * Uses React Flow for interactive node-based visualization
 *
 * Enhanced with Issue #407 features:
 * - Conditional node visibility
 * - Approval workflow integration
 * - Industry benchmarks
 * - New node types support
 */

import { useCallback, useEffect, useMemo } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    MarkerType,
    Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { FunnelNode } from "./funnel-node";
import type {
    FunnelNodeType,
    FunnelNodeData,
    PathwayType,
    RegistrationConfig,
} from "@/types/funnel-map";
import { getNodesForPathway, FUNNEL_NODE_DEFINITIONS } from "@/types/funnel-map";

interface FunnelFlowchartProps {
    pathwayType: PathwayType;
    nodeData: Map<FunnelNodeType, FunnelNodeData>;
    selectedNode: FunnelNodeType | null;
    onNodeSelect: (nodeType: FunnelNodeType) => void;
    onNodeApprove?: (nodeType: FunnelNodeType) => void;
    onNodeRegenerate?: (nodeType: FunnelNodeType) => void;
    isGeneratingDrafts?: boolean;
    registrationConfig?: RegistrationConfig | null;
    showBenchmarks?: boolean;
}

// Custom node types for React Flow
import type { NodeTypes } from "@xyflow/react";

const nodeTypes = {
    funnelNode: FunnelNode,
} as NodeTypes;

// Node spacing
const NODE_SPACING_Y = 160; // Increased for action buttons

// Color mappings - extended for new node types
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    blue: {
        bg: "bg-blue-50",
        border: "border-blue-200",
        text: "text-blue-700",
    },
    green: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
    },
    purple: {
        bg: "bg-purple-50",
        border: "border-purple-200",
        text: "text-purple-700",
    },
    orange: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
    },
    emerald: {
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        text: "text-emerald-700",
    },
    amber: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-700",
    },
    indigo: {
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        text: "text-indigo-700",
    },
    rose: {
        bg: "bg-rose-50",
        border: "border-rose-200",
        text: "text-rose-700",
    },
    pink: {
        bg: "bg-pink-50",
        border: "border-pink-200",
        text: "text-pink-700",
    },
    teal: {
        bg: "bg-teal-50",
        border: "border-teal-200",
        text: "text-teal-700",
    },
    violet: {
        bg: "bg-violet-50",
        border: "border-violet-200",
        text: "text-violet-700",
    },
    lime: {
        bg: "bg-lime-50",
        border: "border-lime-200",
        text: "text-lime-700",
    },
    yellow: {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
    },
};

export function FunnelFlowchart({
    pathwayType,
    nodeData,
    selectedNode,
    onNodeSelect,
    onNodeApprove,
    onNodeRegenerate,
    isGeneratingDrafts = false,
    registrationConfig,
    showBenchmarks = true,
}: FunnelFlowchartProps) {
    // Get nodes for the selected pathway, filtering conditional nodes
    const pathwayNodes = useMemo(
        () => getNodesForPathway(pathwayType, registrationConfig),
        [pathwayType, registrationConfig]
    );

    // Create React Flow nodes
    const initialNodes: Node[] = useMemo(() => {
        return pathwayNodes.map((nodeDef, index) => {
            const data = nodeData.get(nodeDef.id);
            const colors = NODE_COLORS[nodeDef.color] || NODE_COLORS.blue;

            return {
                id: nodeDef.id,
                type: "funnelNode",
                position: {
                    x: 0,
                    y: index * NODE_SPACING_Y,
                },
                data: {
                    definition: nodeDef,
                    nodeData: data,
                    isSelected: selectedNode === nodeDef.id,
                    colors,
                    status: data?.status || "draft",
                    isGenerating: isGeneratingDrafts && !data,
                    onSelect: () => onNodeSelect(nodeDef.id),
                    onApprove: onNodeApprove
                        ? () => onNodeApprove(nodeDef.id)
                        : undefined,
                    onRegenerate: onNodeRegenerate
                        ? () => onNodeRegenerate(nodeDef.id)
                        : undefined,
                    pathwayType,
                    showBenchmarks,
                },
                sourcePosition: Position.Bottom,
                targetPosition: Position.Top,
            };
        });
    }, [
        pathwayNodes,
        nodeData,
        selectedNode,
        isGeneratingDrafts,
        onNodeSelect,
        onNodeApprove,
        onNodeRegenerate,
        pathwayType,
        showBenchmarks,
    ]);

    // Create edges connecting nodes in sequence
    const initialEdges: Edge[] = useMemo(() => {
        return pathwayNodes.slice(0, -1).map((nodeDef, index) => {
            const sourceData = nodeData.get(nodeDef.id);
            const targetData = nodeData.get(pathwayNodes[index + 1].id);
            const isApproved = sourceData?.is_approved && targetData?.is_approved;

            return {
                id: `edge-${nodeDef.id}-${pathwayNodes[index + 1].id}`,
                source: nodeDef.id,
                target: pathwayNodes[index + 1].id,
                type: "smoothstep",
                animated: isGeneratingDrafts,
                style: {
                    strokeWidth: 2,
                    stroke: isApproved ? "#22c55e" : "#94a3b8",
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isApproved ? "#22c55e" : "#94a3b8",
                },
            };
        });
    }, [pathwayNodes, isGeneratingDrafts, nodeData]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when data changes
    useEffect(() => {
        setNodes(initialNodes);
    }, [initialNodes, setNodes]);

    useEffect(() => {
        setEdges(initialEdges);
    }, [initialEdges, setEdges]);

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            onNodeSelect(node.id as FunnelNodeType);
        },
        [onNodeSelect]
    );

    return (
        <div className="h-full w-full rounded-lg border border-border bg-gradient-to-b from-slate-50 to-white">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{
                    padding: 0.3,
                    minZoom: 0.5,
                    maxZoom: 1.5,
                }}
                minZoom={0.3}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                panOnDrag={true}
                zoomOnScroll={true}
                proOptions={{ hideAttribution: true }}
            >
                <Background color="#e2e8f0" gap={20} size={1} />
                <Controls
                    showZoom={true}
                    showFitView={true}
                    showInteractive={false}
                    position="bottom-right"
                />
                <MiniMap
                    nodeColor={(node) => {
                        const def = FUNNEL_NODE_DEFINITIONS.find(
                            (n) => n.id === node.id
                        );
                        if (!def) return "#94a3b8";
                        const colorMap: Record<string, string> = {
                            blue: "#3b82f6",
                            green: "#22c55e",
                            purple: "#a855f7",
                            orange: "#f97316",
                            emerald: "#10b981",
                            amber: "#f59e0b",
                            indigo: "#6366f1",
                            rose: "#f43f5e",
                            pink: "#ec4899",
                            teal: "#14b8a6",
                            violet: "#8b5cf6",
                            lime: "#84cc16",
                            yellow: "#eab308",
                        };
                        return colorMap[def.color] || "#94a3b8";
                    }}
                    nodeStrokeWidth={3}
                    zoomable
                    pannable
                    position="bottom-left"
                    style={{
                        backgroundColor: "rgba(255,255,255,0.9)",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                    }}
                />
            </ReactFlow>
        </div>
    );
}
