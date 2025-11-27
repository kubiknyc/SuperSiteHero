// Types for drawing markup and annotations

export type AnnotationType =
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'text'
  | 'cloud'
  | 'freehand'

export type AnnotationColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'black'
  | 'white'

export interface BaseAnnotation {
  id: string
  type: AnnotationType
  color: string
  lineWidth: number
  userId: string
  userName: string
  createdAt: string
  updatedAt: string
  documentId: string
  layerId?: string
  visible: boolean
}

export interface RectangleAnnotation extends BaseAnnotation {
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  fill?: string
  opacity?: number
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle'
  x: number
  y: number
  radius: number
  fill?: string
  opacity?: number
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow'
  points: number[] // [x1, y1, x2, y2]
  pointerLength?: number
  pointerWidth?: number
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily?: string
  fill?: string
}

export interface CloudAnnotation extends BaseAnnotation {
  type: 'cloud'
  x: number
  y: number
  width: number
  height: number
  numBumps?: number
}

export interface FreehandAnnotation extends BaseAnnotation {
  type: 'freehand'
  points: number[] // [x1, y1, x2, y2, x3, y3, ...]
  tension?: number
}

export type Annotation =
  | RectangleAnnotation
  | CircleAnnotation
  | ArrowAnnotation
  | TextAnnotation
  | CloudAnnotation
  | FreehandAnnotation

export interface MarkupLayer {
  id: string
  name: string
  visible: boolean
  userId?: string
  createdAt: string
}

export interface MarkupToolbarState {
  selectedTool: AnnotationType | 'select' | 'pan'
  selectedColor: string
  lineWidth: number
  fontSize: number
  opacity: number
}
