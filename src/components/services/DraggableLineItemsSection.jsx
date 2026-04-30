import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";

/**
 * Wraps two droppable sections (labor/services and materials) with drag-and-drop.
 * When an item is dropped into the other section, its category is updated accordingly.
 *
 * Props:
 *   items: array of line item objects (each should have a .category field)
 *   laborCategory: string — category value that means "labor/service" (e.g. "labor" or "service")
 *   materialCategory: string — category value that means "material" (e.g. "materials" or "material")
 *   onReorder: (newItems) => void — called with the full reordered+recategorized array
 *   renderLaborHeader: () => JSX
 *   renderMaterialHeader: () => JSX
 *   renderItem: (item, originalIndex) => JSX  — renders the row content (no drag handle needed)
 */
export default function DraggableLineItemsSection({
  items,
  laborCategory,
  materialCategory,
  onReorder,
  renderLaborHeader,
  renderMaterialHeader,
  renderItem,
}) {
  const laborItems = items.map((item, idx) => ({ item, idx })).filter(
    ({ item }) => item.category !== materialCategory
  );
  const materialItems = items.map((item, idx) => ({ item, idx })).filter(
    ({ item }) => item.category === materialCategory
  );

  function onDragEnd(result) {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Build full reordered items array
    const newItems = [...items];

    // Determine original index in full array
    const srcList = source.droppableId === "labor" ? laborItems : materialItems;
    const srcOrigIdx = srcList[source.index].idx;

    // Remove from current position
    const [moved] = newItems.splice(srcOrigIdx, 1);

    // Update category if dropped into different section
    if (source.droppableId !== destination.droppableId) {
      moved.category = destination.droppableId === "material" ? materialCategory : laborCategory;
    }

    // Rebuild dest list after removal to find insertion point
    const destCategory = destination.droppableId === "material" ? materialCategory : null;
    const destItems = newItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) =>
        destination.droppableId === "material"
          ? item.category === materialCategory
          : item.category !== materialCategory
      );

    // Find insertion index in full array
    let insertAt;
    if (destination.index >= destItems.length) {
      // Insert after last item in dest section
      insertAt = destItems.length > 0 ? destItems[destItems.length - 1].idx + 1 : newItems.length;
    } else {
      insertAt = destItems[destination.index].idx;
    }

    newItems.splice(insertAt, 0, moved);
    onReorder(newItems);
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {/* Labor / Services */}
      <div>
        {renderLaborHeader()}
        <Droppable droppableId="labor">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 min-h-[40px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-blue-50" : ""}`}
            >
              {laborItems.map(({ item, idx }, position) => (
                <Draggable key={`labor-${idx}`} draggableId={`item-${idx}`} index={position}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`flex items-center gap-1 ${dragSnapshot.isDragging ? "opacity-75 shadow-lg" : ""}`}
                    >
                      <div
                        {...dragProvided.dragHandleProps}
                        className="flex-shrink-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {renderItem(item, idx)}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      {/* Materials */}
      <div>
        {renderMaterialHeader()}
        <Droppable droppableId="material">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-2 min-h-[40px] rounded-lg transition-colors ${snapshot.isDraggingOver ? "bg-amber-50" : ""}`}
            >
              {materialItems.map(({ item, idx }, position) => (
                <Draggable key={`material-${idx}`} draggableId={`item-${idx}`} index={position}>
                  {(dragProvided, dragSnapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={`flex items-center gap-1 ${dragSnapshot.isDragging ? "opacity-75 shadow-lg" : ""}`}
                    >
                      <div
                        {...dragProvided.dragHandleProps}
                        className="flex-shrink-0 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing p-1"
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {renderItem(item, idx)}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
}